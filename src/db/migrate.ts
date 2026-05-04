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
  //   v3 (current): signals (no label) + tags + signal_tags + activities(signal_id)
  //
  // Detect any older shape and wipe (prototype data is synthetic; live migration
  // would be a real script).
  const isV1 =
    tableExists('competitors') ||
    tableExists('competitor_channels') ||
    tableExists('keywords') ||
    (tableExists('activities') && columnExists('activities', 'competitor_id'))

  const isV2 =
    tableExists('signals') &&
    columnExists('signals', 'label') &&
    !tableExists('signal_tags')

  if (isV1 || isV2) {
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

  const ddl = readFileSync(config.schemaPath, 'utf8')
  db.exec(ddl)
}
