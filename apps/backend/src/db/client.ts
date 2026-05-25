import { MongoClient, Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDb(uri: string): Promise<Db> {
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("Database not connected");
  return db;
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
