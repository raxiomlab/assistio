-- AssistIO Store API — Cloudflare D1 (SQLite) schema.
-- Apply with:
--   wrangler d1 execute assistio-store --file=schema.sql --remote

PRAGMA foreign_keys = ON;

-- Aggregated install counters. One row per item; the catalog remains the
-- source of truth for what the item is, this table only answers "how many".
CREATE TABLE IF NOT EXISTS item_stats (
  item_id     TEXT PRIMARY KEY,
  installs    INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL
);

-- Daily bucket, useful for trends and for pruning. `ref` is a coarse source
-- tag ("store", "app", "docs"), never a user id.
CREATE TABLE IF NOT EXISTS install_daily (
  day         TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  version     TEXT NOT NULL,
  kind        TEXT NOT NULL,
  platform    TEXT NOT NULL,
  ref         TEXT NOT NULL DEFAULT 'store',
  count       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, item_id, version, platform, ref)
);

-- De-duplication: one counted install per item, per IP hash, per day.
-- The IP is never stored raw; see worker.js. Rows older than 45 days are
-- pruned by the scheduled job.
CREATE TABLE IF NOT EXISTS install_seen (
  day         TEXT NOT NULL,
  item_id     TEXT NOT NULL,
  ip_hash     TEXT NOT NULL,
  PRIMARY KEY (day, item_id, ip_hash)
);

-- Community submissions. A submission is a pointer to a public manifest,
-- not an upload. Nothing is published automatically.
CREATE TABLE IF NOT EXISTS submissions (
  id            TEXT PRIMARY KEY,
  manifest_url  TEXT NOT NULL,
  kind          TEXT,
  contact       TEXT NOT NULL,
  notes         TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note   TEXT,
  created_at    TEXT NOT NULL,
  reviewed_at   TEXT
);

CREATE INDEX IF NOT EXISTS submissions_status_idx
  ON submissions (status, created_at DESC);

-- Coarse abuse control. Keys are sha256(ip + day + route), never raw IPs.
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket  TEXT PRIMARY KEY,
  day     TEXT NOT NULL,
  count   INTEGER NOT NULL DEFAULT 0
);
