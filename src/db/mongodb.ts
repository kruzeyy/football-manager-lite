import { MongoClient, Db } from 'mongodb';

const MONGODB_URI = import.meta.env.VITE_MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = 'football_manager';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectToMongoDB(): Promise<Db> {
  if (db) {
    return db;
  }

  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('[MongoDB] ✅ Connected to database:', DB_NAME);
    return db;
  } catch (error) {
    console.error('[MongoDB] ❌ Connection error:', error);
    throw error;
  }
}

export async function disconnectFromMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('[MongoDB] 🔌 Disconnected');
  }
}

export function getDb(): Db | null {
  return db;
}

