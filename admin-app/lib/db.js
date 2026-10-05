// Base de datos SQLite (módulo nativo de Node). Vive fuera de la carpeta pública.
import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = process.env.ADMIN_DB || "/var/lib/majosoft-admin/admin.db";
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true, mode: 0o700 });

export const db = new DatabaseSync(DB_PATH);
fs.chmodSync(DB_PATH, 0o600);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL,
    totp_secret TEXT,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    totp_last_counter INTEGER NOT NULL DEFAULT -1,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY,
    token_hash TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    ip TEXT, user_agent TEXT
  );

  CREATE TABLE IF NOT EXISTS audit (
    id INTEGER PRIMARY KEY,
    at INTEGER NOT NULL,
    user_id INTEGER, email TEXT,
    event TEXT NOT NULL,
    ip TEXT, detail TEXT
  );

  CREATE TABLE IF NOT EXISTS docs (
    kind TEXT NOT NULL,
    id TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by INTEGER,
    PRIMARY KEY (kind, id)
  );
`);

export function audit(event, { user, email, ip, detail } = {}) {
  db.prepare("INSERT INTO audit (at, user_id, email, event, ip, detail) VALUES (?, ?, ?, ?, ?, ?)")
    .run(Date.now(), user?.id ?? null, user?.email ?? email ?? null, event, ip ?? null, detail ?? null);
}
