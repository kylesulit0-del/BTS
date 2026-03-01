import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema.js';
import { mkdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// DB lives at repo-root/data/bts.db
const DB_PATH = resolve(__dirname, '../../../../data/bts.db');

// Migrations live at packages/server/drizzle/
const MIGRATIONS_DIR = resolve(__dirname, '../../drizzle');

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Initialize the SQLite database with WAL mode and run migrations.
 * Creates the data/ directory if it doesn't exist.
 */
export function initDb() {
  // Ensure data directory exists
  mkdirSync(dirname(DB_PATH), { recursive: true });

  const sqlite = new Database(DB_PATH);

  // Enable WAL mode for concurrent read/write (pitfall 5 from RESEARCH.md)
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });

  // Run migrations on startup
  migrate(db, { migrationsFolder: MIGRATIONS_DIR });

  dbInstance = db;
  return db;
}

/** Lazy singleton getter -- initializes on first call. */
export function getDb() {
  if (!dbInstance) {
    return initDb();
  }
  return dbInstance;
}

export type Db = ReturnType<typeof initDb>;
