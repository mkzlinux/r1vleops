-- R1VLE Ops on Cloudflare D1 (SQLite). JSON columns are TEXT holding JSON.
-- The service catalogue (names, includes, regional tiers) lives in code; this table only stores price edits.
CREATE TABLE IF NOT EXISTS price_overrides (
  service_id TEXT PRIMARY KEY,
  price_usd REAL NOT NULL CHECK (price_usd >= 0),
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workers (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('ai', 'human')),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department_id TEXT NOT NULL CHECK (department_id IN ('security', 'intelligence', 'creative', 'hq')),
  email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('online', 'busy', 'idle', 'invited')),
  joined_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  tracking_code TEXT NOT NULL UNIQUE,
  invoice_no TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  department_id TEXT NOT NULL,
  client TEXT NOT NULL,
  brief TEXT NOT NULL DEFAULT '',
  lines TEXT NOT NULL,
  deposit_pct INTEGER NOT NULL DEFAULT 50,
  stage TEXT NOT NULL DEFAULT 'awaiting_deposit',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  assigned_worker_id TEXT REFERENCES workers (id) ON DELETE SET NULL,
  region TEXT NOT NULL DEFAULT 'intl' CHECK (region IN ('zw', 'intl')),
  attachments TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS order_updates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  at TEXT NOT NULL,
  stage TEXT NOT NULL,
  progress INTEGER NOT NULL,
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS order_updates_order_idx ON order_updates (order_id, at);

-- Fixed-window rate limiting for public endpoints (key = action + hashed IP).
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (key, window_start)
);
