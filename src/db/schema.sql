-- FlowCore Marketing Sensor — schema v2 (signals model)
-- Each "signal" is one specific tracked endpoint: a TikTok handle, a domain,
-- a SERP keyword, a Meta advertiser. Signals are the unit of work; "competitor"
-- is just an optional grouping label.

CREATE TABLE IF NOT EXISTS signals (
  id              INTEGER PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN (
                    'website',
                    'meta_ads',
                    'google_ads',
                    'instagram_account',
                    'tiktok_account',
                    'youtube_channel'
                  )),
  target          TEXT NOT NULL,
  vertical        TEXT CHECK (vertical IN ('well', 'plumbing')),
  tier            TEXT CHECK (tier IN ('local', 'mondo', 'national', 'inspiration')),
  is_active       INTEGER NOT NULL DEFAULT 1,
  notes           TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (type, target)
);

CREATE INDEX IF NOT EXISTS idx_signals_type   ON signals(type);
CREATE INDEX IF NOT EXISTS idx_signals_active ON signals(is_active);

CREATE TABLE IF NOT EXISTS tags (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  color       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

CREATE TABLE IF NOT EXISTS signal_tags (
  signal_id  INTEGER NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  tag_id     INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (signal_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_signal_tags_signal ON signal_tags(signal_id);
CREATE INDEX IF NOT EXISTS idx_signal_tags_tag    ON signal_tags(tag_id);

CREATE TABLE IF NOT EXISTS activities (
  id                    INTEGER PRIMARY KEY,
  signal_id             INTEGER NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  activity_type         TEXT NOT NULL,
  title                 TEXT NOT NULL,
  preview               TEXT,
  source_url            TEXT,
  thumbnail_url         TEXT,
  detected_at           TEXT NOT NULL,
  raw_payload_json      TEXT NOT NULL,
  summary_text          TEXT,
  summary_model         TEXT,
  summary_generated_at  TEXT,
  status                TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'useful')),
  status_changed_at     TEXT,
  dedup_key             TEXT NOT NULL,
  created_at            TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (signal_id, dedup_key)
);

CREATE INDEX IF NOT EXISTS idx_activities_detected_at ON activities(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_signal      ON activities(signal_id);
CREATE INDEX IF NOT EXISTS idx_activities_status      ON activities(status);

CREATE TABLE IF NOT EXISTS settings (
  key             TEXT PRIMARY KEY,
  value_json      TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS keywords (
  id          INTEGER PRIMARY KEY,
  phrase      TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_keywords_phrase ON keywords(phrase);
