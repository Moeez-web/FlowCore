import { db } from './client.ts'

// Statements are prepared lazily because settings.ts is imported during module
// resolution — before migrate() runs — and prepare() requires the table to
// exist. On a fresh DB (e.g. Railway volume on first boot) eager prepares
// crash the process with "no such table: settings".

let _upsert: ReturnType<typeof db.prepare> | undefined
let _select: ReturnType<typeof db.prepare> | undefined
let _remove: ReturnType<typeof db.prepare> | undefined

function upsertStmt() {
  return (_upsert ??= db.prepare(
    `INSERT INTO settings (key, value_json, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at`,
  ))
}

function selectStmt() {
  return (_select ??= db.prepare(`SELECT value_json FROM settings WHERE key = ?`))
}

function removeStmt() {
  return (_remove ??= db.prepare(`DELETE FROM settings WHERE key = ?`))
}

export function getSetting<T>(key: string): T | null {
  const row = selectStmt().get(key) as { value_json: string } | undefined
  if (!row) return null
  try {
    return JSON.parse(row.value_json) as T
  } catch {
    return null
  }
}

export function setSetting<T>(key: string, value: T): void {
  upsertStmt().run(key, JSON.stringify(value))
}

export function clearSetting(key: string): void {
  removeStmt().run(key)
}
