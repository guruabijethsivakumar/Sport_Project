import { describe, it, expect } from 'vitest';
import { validateConfig, config } from '../src/config/index.js';
import { parseAndClassifyMongoUri } from '../src/utils/db-utils.js';

describe('Atlas Readiness & Test Isolation Guardrails', () => {
  const baseValidEnv = {
    NODE_ENV: 'test',
    PORT: '5000',
    LOG_LEVEL: 'info',
    MONGODB_URI: 'mongodb://localhost:27017/playmatch-test',
    API_BASE_PATH: '/api/v1',
    CLIENT_WEB_URL: 'http://localhost:3000',
    JWT_ACCESS_SECRET: 'super_secret_access_token_key_at_least_32_characters_long',
    JWT_REFRESH_SECRET: 'super_secret_refresh_token_key_at_least_32_characters_long',
    ACCESS_TOKEN_TTL: '15m',
    REFRESH_TOKEN_TTL: '7d',
    PASSWORD_HASH_COST: '10',
    PASSWORD_MIN_LENGTH: '8',
    PASSWORD_REQUIRE_COMPLEXITY: 'true',
    MAX_FAILED_LOGINS: '5',
    LOCKOUT_MINUTES: '15',
    EMAIL_VERIFICATION_REQUIRED: 'true',
    EMAIL_TOKEN_TTL: '24h',
    PASSWORD_RESET_TOKEN_TTL: '1h',
    CORS_ORIGINS: 'http://localhost:3000',
    COOKIE_DOMAIN: 'localhost',
    COOKIE_SECURE: 'false',
    COOKIE_SAMESITE: 'lax',
    REFRESH_COOKIE_NAME: 'playmatch_refresh',
    RATE_LIMIT_WINDOW_MS: '900000',
    RATE_LIMIT_MAX: '100',
    AUTH_RATE_LIMIT_MAX: '10',
    EMAIL_TRANSPORT: 'console',
    EMAIL_FROM: 'noreply@playmatch.app',
    CLIENT_HEADER_NAME: 'x-client-type',
  };

  it('1. Test Isolation: imported config uses in-memory URI and ignores fake remote MONGODB_URI in process.env', () => {
    // Top-level setup file overrides process.env.MONGODB_URI to memory replica set
    expect(config.MONGODB_URI).toBeDefined();
    expect(config.MONGODB_URI).toMatch(/^mongodb:\/\/127\.0\.0\.1:\d+\/playmatch-test/);
    expect(config.MONGODB_URI).not.toContain('mongodb+srv');
  });

  it('2. Dev Guard: non-production remote URI fails fast unless ALLOW_REMOTE_DB=yes', () => {
    const fakeRemoteUri = 'mongodb+srv://user:secretpass@cluster0.abcde.mongodb.net/playmatch';
    const envWithoutAllow = {
      ...baseValidEnv,
      NODE_ENV: 'development',
      MONGODB_URI: fakeRemoteUri,
      ALLOW_REMOTE_DB: '',
    };

    expect(() => validateConfig(envWithoutAllow)).toThrowError(
      /Remote database connection is blocked in non-production mode unless ALLOW_REMOTE_DB=yes is set/,
    );

    // With ALLOW_REMOTE_DB=yes it succeeds
    const envWithAllow = {
      ...envWithoutAllow,
      ALLOW_REMOTE_DB: 'yes',
    };
    expect(() => validateConfig(envWithAllow)).not.toThrow();
  });

  it('3. Error text sanity: config errors name ALLOW_REMOTE_DB and NEVER leak raw URI or credentials', () => {
    const sensitiveUri = 'mongodb+srv://adminuser:SuperSecretPassword123@cluster0.abcde.mongodb.net/playmatch';
    const env = {
      ...baseValidEnv,
      NODE_ENV: 'development',
      MONGODB_URI: sensitiveUri,
      ALLOW_REMOTE_DB: 'no',
    };

    let caughtError: Error | null = null;
    try {
      validateConfig(env);
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    const message = caughtError!.message;
    expect(message).toContain('ALLOW_REMOTE_DB=yes');
    // Ensure no sensitive credentials or URI strings leak in the error message
    expect(message).not.toContain('SuperSecretPassword123');
    expect(message).not.toContain('adminuser');
    expect(message).not.toContain('cluster0.abcde.mongodb.net');
    expect(message).not.toContain('mongodb+srv://');
  });

  it('4. Config Validation: fails fast if MONGODB_URI does not include a database name', () => {
    const uriWithoutDb = 'mongodb://localhost:27017';
    const env = {
      ...baseValidEnv,
      MONGODB_URI: uriWithoutDb,
    };

    let caughtError: Error | null = null;
    try {
      validateConfig(env);
    } catch (err: any) {
      caughtError = err;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toContain('MONGODB_URI must include a database name');
    expect(caughtError!.message).not.toContain(uriWithoutDb);
  });

  it('5. Host masking: parseAndClassifyMongoUri masks remote hosts and preserves local hosts', () => {
    const localInfo = parseAndClassifyMongoUri('mongodb://127.0.0.1:27017/playmatch');
    expect(localInfo.mode).toBe('memory'); // In test environment
    expect(localInfo.maskedHosts).toBe('127.0.0.1:27017');

    const remoteInfo = parseAndClassifyMongoUri('mongodb+srv://user:pass@cluster0.abcde.mongodb.net/playmatch');
    expect(remoteInfo.isRemote).toBe(true);
    expect(remoteInfo.maskedHosts).toBe('cl***.mongodb.net');
    expect(remoteInfo.maskedHosts).not.toContain('abcde');
    expect(remoteInfo.maskedHosts).not.toContain('user');
    expect(remoteInfo.maskedHosts).not.toContain('pass');
  });
});
