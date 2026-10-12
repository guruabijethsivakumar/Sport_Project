import { MongoMemoryReplSet } from 'mongodb-memory-server';
import fs from 'node:fs';
import path from 'node:path';

let mongoReplSet: MongoMemoryReplSet | undefined;
const URI_FILE = path.resolve(process.cwd(), '.test-mongo-uri.txt');

export async function setup(): Promise<void> {
  mongoReplSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  const uri = mongoReplSet.getUri('playmatch-test');
  fs.writeFileSync(URI_FILE, uri, 'utf-8');
  process.env.MONGODB_URI = uri;
  process.env.PLAYMATCH_IN_MEMORY_DB = 'true';
}

export async function teardown(): Promise<void> {
  try {
    if (fs.existsSync(URI_FILE)) {
      fs.unlinkSync(URI_FILE);
    }
  } catch (err: unknown) {
    void err;
  }

  if (mongoReplSet) {
    await mongoReplSet.stop();
  }
}
