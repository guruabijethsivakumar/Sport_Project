import mongoose from 'mongoose';
import { logger } from './logger.js';

export interface MongoUriInfo {
  protocol: 'mongodb' | 'mongodb+srv';
  hosts: string[];
  dbName: string;
  isRemote: boolean;
  mode: 'memory' | 'local' | 'remote';
  maskedHosts: string;
}

const ALLOWED_LOCAL_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  'mongo',
  'playmatch-mongo',
  'host.docker.internal',
]);

export function parseAndClassifyMongoUri(uri: string): MongoUriInfo {
  if (typeof uri !== 'string' || !uri.trim()) {
    throw new Error('MONGODB_URI must be a non-empty string');
  }

  const trimmed = uri.trim();
  const match = trimmed.match(/^(mongodb(?:\+srv)?):\/\/([^/]+)(?:\/([^?]+))?/i);
  if (!match) {
    throw new Error('MONGODB_URI must be a valid mongodb:// or mongodb+srv:// connection URI');
  }

  const protocol = match[1]!.toLowerCase() as 'mongodb' | 'mongodb+srv';
  const hostPart = match[2]!;
  const rawDbName = match[3] ? match[3].trim() : '';

  if (!rawDbName) {
    throw new Error('MONGODB_URI must include a database name (e.g. /playmatch)');
  }

  const withoutAuth = hostPart.includes('@') ? hostPart.split('@')[1]! : hostPart;
  const rawHosts = withoutAuth.split(',').map((h) => h.trim().toLowerCase());

  let hasRemoteHost = protocol === 'mongodb+srv';
  for (const h of rawHosts) {
    let hostname = h;
    if (hostname.startsWith('[') && hostname.includes(']')) {
      hostname = hostname.slice(1, hostname.indexOf(']'));
    } else if (hostname.includes(':')) {
      hostname = hostname.split(':')[0]!;
    }
    if (!ALLOWED_LOCAL_HOSTS.has(hostname)) {
      hasRemoteHost = true;
    }
  }

  const isMemory = process.env.NODE_ENV === 'test' || Boolean(process.env.PLAYMATCH_IN_MEMORY_DB);
  const mode: 'memory' | 'local' | 'remote' = isMemory
    ? 'memory'
    : hasRemoteHost
      ? 'remote'
      : 'local';

  const maskedHosts = rawHosts
    .map((hostWithPort) => maskSingleHost(hostWithPort))
    .join(',');

  return {
    protocol,
    hosts: rawHosts,
    dbName: rawDbName,
    isRemote: hasRemoteHost,
    mode,
    maskedHosts,
  };
}

function maskSingleHost(hostWithPort: string): string {
  let host = hostWithPort;
  let port = '';
  if (host.startsWith('[') && host.includes(']')) {
    const end = host.indexOf(']');
    if (host[end + 1] === ':') {
      port = host.slice(end + 1);
    }
    host = host.slice(0, end + 1);
  } else if (host.includes(':')) {
    const idx = host.lastIndexOf(':');
    port = host.slice(idx);
    host = host.slice(0, idx);
  }

  const unbracketed = host.replace(/[[\]]/g, '');
  if (ALLOWED_LOCAL_HOSTS.has(host) || ALLOWED_LOCAL_HOSTS.has(unbracketed)) {
    return host + port;
  }

  const parts = host.split('.');
  if (parts.length > 2) {
    const domain = parts.slice(-2).join('.');
    const prefix = parts[0]!;
    const maskedPrefix = prefix.length > 2 ? prefix.slice(0, 2) + '***' : '***';
    return `${maskedPrefix}.${domain}${port}`;
  }
  return `***${port}`;
}

export async function ensureAllIndexes(): Promise<void> {
  const models = mongoose.models;
  const modelNames = Object.keys(models);

  logger.info({ totalModels: modelNames.length }, 'Ensuring database indexes for all models...');

  for (const name of modelNames) {
    const model = models[name];
    if (!model) continue;
    try {
      // Use ensureIndexes / createIndexes only. NEVER syncIndexes().
      await model.ensureIndexes();
      logger.info({ model: name }, `Indexes ensured successfully for model: ${name}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      // Non-fatal: log warning and proceed
      logger.warn(
        { model: name, error: errorMessage },
        `Failed to ensure indexes for model: ${name}`,
      );
    }
  }
}
