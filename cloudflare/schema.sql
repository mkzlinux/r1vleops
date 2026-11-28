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
  attachments TEXT NOT NULL DEFAULT '[]',
  client_email TEXT,
  country TEXT
);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);

CREATE INDEX IF NOT EXISTS orders_client_email ON orders(client_email);

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

-- Online payments: Paynow (EcoCash, OneMoney, InnBucks, cards) and on-chain USDC.
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  kind TEXT NOT NULL CHECK (kind IN ('deposit', 'balance')),
  method TEXT NOT NULL CHECK (method IN ('paynow', 'usdc')),
  channel TEXT NOT NULL,
  amount_usd REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'expired')),
  created_at TEXT NOT NULL,
  paid_at TEXT,
  pay_amount TEXT,
  pay_units TEXT,
  pay_to TEXT,
  destination_tag INTEGER,
  poll_url TEXT,
  scan_from INTEGER,
  proof TEXT
);
CREATE INDEX IF NOT EXISTS payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS payments_open ON payments(method, channel, status);

-- Clients are keyed by lowercased email (no accounts; guest-checkout style).
CREATE TABLE IF NOT EXISTS clients (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  first_order_at TEXT NOT NULL,
  last_order_at TEXT NOT NULL,
  order_count INTEGER NOT NULL DEFAULT 0
);

-- Negotiation tickets (quotes): proposed budget -> accept / counter / decline -> checkout.
CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  client TEXT NOT NULL,
  client_email TEXT NOT NULL,
  region TEXT NOT NULL CHECK (region IN ('zw', 'intl')),
  items TEXT NOT NULL,
  lines TEXT NOT NULL,
  list_total REAL NOT NULL,
  proposed_total REAL NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'countered', 'accepted', 'declined', 'converted')),
  offer_total REAL,
  reply TEXT NOT NULL DEFAULT '',
  responded_at TEXT,
  valid_until TEXT,
  order_code TEXT,
  kind TEXT NOT NULL DEFAULT 'bucket',
  title TEXT,
  department_id TEXT,
  timeline TEXT
);
CREATE INDEX IF NOT EXISTS quotes_status ON quotes(status, created_at);

-- Operator two-step sign-in (TOTP). Secrets are AES-GCM encrypted; recovery codes stored as SHA-256 hashes.
CREATE TABLE IF NOT EXISTS ops_security (
  id TEXT PRIMARY KEY CHECK (id = 'owner'),
  totp_secret TEXT,
  pending_secret TEXT,
  last_step INTEGER NOT NULL DEFAULT 0,
  recovery TEXT NOT NULL DEFAULT '[]',
  enabled_at TEXT
);
