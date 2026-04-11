import "server-only";
import { createDb, type Database } from "@wimm/db";

let _db: Database | null = null;

export function getDb(): Database {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    _db = createDb(databaseUrl);
  }
  return _db;
}

// Lazy proxy so existing `db.select()` calls work without eager initialization
export const db: Database = new Proxy({} as Database, {
  get(_, prop) {
    const instance = getDb();
    const value = (instance as any)[prop];
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});
