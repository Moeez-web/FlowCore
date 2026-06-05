import { readFileSync } from 'node:fs'
import { config } from '../config.ts'
import { db } from './client.ts'

function tableExists(name: string): boolean {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`)
    .get(name) as { name: string } | undefined
  return !!row
}

function columnExists(table: string, col: string): boolean {
  if (!tableExists(table)) return false
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
  return rows.some((r) => r.name === col)
}

export function migrate(): void {
  // Schema versions:
  //   v1: competitors + competitor_channels + keywords + activities(competitor_id, channel)
  //   v2: signals(label) + activities(signal_id)
  //   v3: signals (no label) + tags + signal_tags + activities(signal_id, ON DELETE CASCADE)
  //   v4 (current): activities(signal_id nullable, no CASCADE) + removed_at column
  //
  // Detect any older shape and wipe (prototype data is synthetic; live migration
  // would be a real script).
  const isV1 =
    tableExists('competitors') ||
    tableExists('competitor_channels') ||
    (tableExists('activities') && columnExists('activities', 'competitor_id'))

  const isV2 =
    tableExists('signals') &&
    columnExists('signals', 'label') &&
    !tableExists('signal_tags')

  const isV3 =
    tableExists('activities') &&
    !columnExists('activities', 'removed_at')

  if (isV1 || isV2 || isV3) {
    db.exec(`
      DROP TABLE IF EXISTS signal_tags;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS activities;
      DROP TABLE IF EXISTS signals;
      DROP TABLE IF EXISTS competitor_channels;
      DROP TABLE IF EXISTS competitors;
      DROP TABLE IF EXISTS keywords;
    `)
  }

  // v4→v5: add 'skipped' to activities status CHECK constraint
  const needsSkippedStatus =
    tableExists('activities') &&
    !db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='activities'`)
      .get()?.sql?.includes("'skipped'")

  if (needsSkippedStatus) {
    db.exec(`
      CREATE TABLE activities_new (
        id                    INTEGER PRIMARY KEY,
        signal_id             INTEGER,
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
                              CHECK (status IN ('new', 'useful', 'skipped')),
        status_changed_at     TEXT,
        dedup_key             TEXT NOT NULL,
        removed_at            TEXT,
        created_at            TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (signal_id, dedup_key)
      );
      INSERT INTO activities_new SELECT * FROM activities;
      DROP TABLE activities;
      ALTER TABLE activities_new RENAME TO activities;
    `)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_activities_detected_at ON activities(detected_at DESC)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_activities_signal      ON activities(signal_id)`)
    db.exec(`CREATE INDEX IF NOT EXISTS idx_activities_status      ON activities(status)`)
    console.log('[migration] added skipped status to activities')
  }

  const ddl = readFileSync(config.schemaPath, 'utf8')
  db.exec(ddl)
}
