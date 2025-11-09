PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  external_id TEXT UNIQUE,           -- Paddle customer or subscription id
  email TEXT,
  name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL CHECK(plan IN ('trial','monthly','annual','lifetime')),
  status TEXT NOT NULL CHECK(status IN ('active','inactive','revoked','expired')),
  expires_at TEXT,
  customer_id INTEGER,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(customer_id) REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_licenses_key ON licenses(key);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  subject TEXT,
  meta TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
