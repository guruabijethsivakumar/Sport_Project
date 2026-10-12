import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { beforeAll, afterAll, afterEach } from 'vitest';
import '../src/models/index.js';

// Top-level execution before ANY test file or config module is imported
// Force in-memory MONGODB_URI and set flags so config/index.ts can never read remote MONGODB_URI
const URI_FILE = path.resolve(process.cwd(), '.test-mongo-uri.txt');
if (fs.existsSync(URI_FILE)) {
  const inMemoryUri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  if (inMemoryUri) {
    process.env.MONGODB_URI = inMemoryUri;
  }
}
process.env.PLAYMATCH_IN_MEMORY_DB = 'true';

beforeAll(async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('In-memory MongoDB URI was not initialized before test setup');
  }

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  // Pre-create all model collections to support multi-document transactions seamlessly
  for (const model of Object.values(mongoose.models)) {
    await model.createCollection();
  }
}, 120000);

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
