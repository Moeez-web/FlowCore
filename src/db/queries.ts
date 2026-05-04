import { db } from './client.ts'
import { type Filter, buildWhere } from '../lib/filters.ts'

// ────────────────────────────────────────────────────────────────────
// Signal types
// ────────────────────────────────────────────────────────────────────
export const SIGNAL_TYPES = [
  'website',
  'meta_ads',
  'google_ads',
  'instagram_account',
  'tiktok_account',
  'youtube_channel',
  'seo_keyword',
  'backlink_profile',
] as const
export type SignalType = typeof SIGNAL_TYPES[number]

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  website:           'Website',
  meta_ads:          'Meta Ads',
  google_ads:        'Google Ads',
  instagram_account: 'Instagram',
  tiktok_account:    'TikTok',
  youtube_channel:   'YouTube',
  seo_keyword:       'SEO keyword',
  backlink_profile:  'Backlink profile',
}

export interface SignalRow {
  id: number
  type: SignalType
  target: string
  tags: string[]
  vertical: 'well' | 'plumbing' | null
  tier: 'local' | 'mondo' | 'national' | 'inspiration' | null
  is_active: number
  notes: string | null
  created_at: string
}

export interface NewSignal {
  type: SignalType
  target: string
  tags?: string[]
  vertical?: 'well' | 'plumbing' | null
  tier?: 'local' | 'mondo' | 'national' | 'inspiration' | null
  notes?: string | null
}

const SIGNAL_BASE_SELECT = `
  SELECT
    s.id, s.type, s.target, s.vertical, s.tier, s.is_active, s.notes, s.created_at,
    COALESCE(
      (SELECT GROUP_CONCAT(t.name, '|') FROM signal_tags st JOIN tags t ON t.id = st.tag_id WHERE st.signal_id = s.id ORDER BY t.name),
      ''
    ) AS tags_concat
  FROM signals s
`

interface RawSignalRow {
  id: number
  type: SignalType
  target: string
  tags_concat: string
  vertical: SignalRow['vertical']
  tier: SignalRow['tier']
  is_active: number
  notes: string | null
  created_at: string
}

function hydrateSignal(r: RawSignalRow): SignalRow {
  const tags = r.tags_concat ? r.tags_concat.split('|').filter(Boolean) : []
  return {
    id: r.id,
    type: r.type,
    target: r.target,
    tags,
    vertical: r.vertical,
    tier: r.tier,
    is_active: r.is_active,
    notes: r.notes,
    created_at: r.created_at,
  }
}

export interface SignalListOpts {
  activeOnly?: boolean
  page?: number
  limit?: number
  typeFilter?: SignalType | null
  tagFilter?: string | null
  search?: string | null
}

function buildSignalWhere(opts: SignalListOpts): { clauses: string[]; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []
  if (opts.activeOnly) clauses.push('s.is_active = 1')
  if (opts.typeFilter) {
    clauses.push('s.type = ?')
    params.push(opts.typeFilter)
  }
  if (opts.tagFilter) {
    clauses.push(`s.id IN (SELECT st.signal_id FROM signal_tags st JOIN tags t ON t.id = st.tag_id WHERE t.name = ?)`)
    params.push(opts.tagFilter)
  }
  if (opts.search && opts.search.trim().length > 0) {
    const like = `%${opts.search.trim()}%`
    clauses.push(`(s.target LIKE ? OR s.id IN (
      SELECT st.signal_id FROM signal_tags st JOIN tags t ON t.id = st.tag_id WHERE t.name LIKE ?
    ))`)
    params.push(like, like)
  }
  return { clauses, params }
}

export function listSignals(opts: SignalListOpts = {}): SignalRow[] {
  const { clauses, params } = buildSignalWhere(opts)
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const limit = opts.limit ?? -1
  let sql: string
  if (limit > 0) {
    const offset = Math.max(0, ((opts.page ?? 1) - 1) * limit)
    sql = `${SIGNAL_BASE_SELECT} ${where} ORDER BY s.id ASC LIMIT ? OFFSET ?`
    params.push(limit, offset)
  } else {
    sql = `${SIGNAL_BASE_SELECT} ${where} ORDER BY s.type, s.target`
  }
  return (db.prepare(sql).all(...params) as RawSignalRow[]).map(hydrateSignal)
}

/** Free-text search across signal target + tag names. Returns up to `limit` matches. */
export function searchSignals(query: string, limit = 10): SignalRow[] {
  const q = query.trim()
  if (!q) return []
  const like = `%${q}%`
  const sql = `${SIGNAL_BASE_SELECT}
    WHERE s.target LIKE ?
       OR s.id IN (
         SELECT st.signal_id FROM signal_tags st
         JOIN tags t ON t.id = st.tag_id
         WHERE t.name LIKE ?
       )
    ORDER BY s.target
    LIMIT ?`
  return (db.prepare(sql).all(like, like, limit) as RawSignalRow[]).map(hydrateSignal)
}

export function countSignals(opts: SignalListOpts = {}): number {
  const { clauses, params } = buildSignalWhere(opts)
  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  const row = db.prepare(`SELECT COUNT(*) AS n FROM signals s ${where}`).get(...params) as { n: number }
  return row.n
}

export function getSignal(id: number): SignalRow | null {
  const row = db.prepare(`${SIGNAL_BASE_SELECT} WHERE s.id = ?`).get(id) as RawSignalRow | undefined
  return row ? hydrateSignal(row) : null
}

export function getSignalByTypeAndTarget(type: SignalType, target: string): SignalRow | null {
  const row = db
    .prepare(`${SIGNAL_BASE_SELECT} WHERE s.type = ? AND s.target = ?`)
    .get(type, target) as RawSignalRow | undefined
  return row ? hydrateSignal(row) : null
}

export function createSignal(s: NewSignal): SignalRow {
  const tx = db.transaction((d: NewSignal) => {
    const info = db.prepare(
      `INSERT INTO signals (type, target, vertical, tier, notes)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(d.type, d.target.trim(), d.vertical ?? null, d.tier ?? null, d.notes ?? null)
    const id = Number(info.lastInsertRowid)
    if (d.tags && d.tags.length > 0) {
      for (const tag of d.tags) addTagToSignalInTx(id, tag.trim())
    }
    return id
  })
  const id = tx(s)
  const row = getSignal(id)
  if (!row) throw new Error('Failed to retrieve created signal')
  return row
}

export function deleteSignal(id: number): boolean {
  const result = db.prepare(`DELETE FROM signals WHERE id = ?`).run(id)
  return result.changes > 0
}

export function setSignalActive(id: number, active: boolean): SignalRow | null {
  db.prepare(`UPDATE signals SET is_active = ? WHERE id = ?`).run(active ? 1 : 0, id)
  return getSignal(id)
}

// ────────────────────────────────────────────────────────────────────
// Tags
// ────────────────────────────────────────────────────────────────────
export interface TagRow {
  id: number
  name: string
  color: string | null
  created_at: string
}

/** Get an existing tag by name, or create it. Returns the tag id. */
function getOrCreateTagId(name: string): number {
  const trimmed = name.trim()
  if (!trimmed) throw new Error('Tag name cannot be empty')
  const existing = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(trimmed) as { id: number } | undefined
  if (existing) return existing.id
  const info = db.prepare(`INSERT INTO tags (name) VALUES (?)`).run(trimmed)
  return Number(info.lastInsertRowid)
}

function addTagToSignalInTx(signalId: number, tagName: string): void {
  const trimmed = tagName.trim()
  if (!trimmed) return
  const tagId = getOrCreateTagId(trimmed)
  db.prepare(`INSERT OR IGNORE INTO signal_tags (signal_id, tag_id) VALUES (?, ?)`).run(signalId, tagId)
}

export function addTagToSignal(signalId: number, tagName: string): SignalRow | null {
  if (!getSignal(signalId)) return null
  addTagToSignalInTx(signalId, tagName)
  return getSignal(signalId)
}

export function removeTagFromSignal(signalId: number, tagName: string): SignalRow | null {
  const tag = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(tagName.trim()) as { id: number } | undefined
  if (!tag) return getSignal(signalId)
  db.prepare(`DELETE FROM signal_tags WHERE signal_id = ? AND tag_id = ?`).run(signalId, tag.id)
  return getSignal(signalId)
}

/** Apply a tag to many signals at once. Returns count of signals updated. */
export function applyTagToSignals(signalIds: number[], tagName: string): number {
  if (signalIds.length === 0) return 0
  const trimmed = tagName.trim()
  if (!trimmed) return 0
  const tx = db.transaction((ids: number[], name: string) => {
    const tagId = getOrCreateTagId(name)
    const stmt = db.prepare(`INSERT OR IGNORE INTO signal_tags (signal_id, tag_id) VALUES (?, ?)`)
    let n = 0
    for (const id of ids) {
      const r = stmt.run(id, tagId)
      if (r.changes > 0) n++
    }
    return n
  })
  return tx(signalIds, trimmed)
}

export function removeTagFromSignals(signalIds: number[], tagName: string): number {
  if (signalIds.length === 0) return 0
  const tag = db.prepare(`SELECT id FROM tags WHERE name = ?`).get(tagName.trim()) as { id: number } | undefined
  if (!tag) return 0
  const placeholders = signalIds.map(() => '?').join(',')
  const r = db.prepare(`DELETE FROM signal_tags WHERE tag_id = ? AND signal_id IN (${placeholders})`)
    .run(tag.id, ...signalIds)
  return r.changes
}

export interface TagWithCount {
  name: string
  count: number
}
export function listTagsWithCounts(opts: { activeOnly?: boolean } = {}): TagWithCount[] {
  const where = opts.activeOnly ? 'WHERE s.is_active = 1' : ''
  return db.prepare(`
    SELECT t.name AS name, COUNT(st.signal_id) AS count
    FROM tags t
    JOIN signal_tags st ON st.tag_id = t.id
    JOIN signals s ON s.id = st.signal_id
    ${where}
    GROUP BY t.id
    HAVING count > 0
    ORDER BY t.name
  `).all() as TagWithCount[]
}

export interface SignalCount {
  type: SignalType
  n: number
}
export function countSignalsByType(opts: { activeOnly?: boolean } = {}): SignalCount[] {
  const where = opts.activeOnly ? 'WHERE is_active = 1' : ''
  return db
    .prepare(`SELECT type, COUNT(*) AS n FROM signals ${where} GROUP BY type`)
    .all() as SignalCount[]
}

// ────────────────────────────────────────────────────────────────────
// Activities
// ────────────────────────────────────────────────────────────────────
export interface ActivityRow {
  id: number
  signal_id: number
  activity_type: string
  title: string
  preview: string | null
  source_url: string | null
  thumbnail_url: string | null
  detected_at: string
  raw_payload_json: string
  summary_text: string | null
  summary_model: string | null
  summary_generated_at: string | null
  status: 'new' | 'useful'
  status_changed_at: string | null
  dedup_key: string
  // joined from signals
  signal_type: SignalType
  signal_target: string
  signal_tags: string[]   // joined from signal_tags + tags
  signal_vertical: string | null
  signal_tier: string | null
}

interface RawActivityRow extends Omit<ActivityRow, 'signal_tags'> {
  signal_tags_concat: string
}

const ACTIVITY_BASE_SELECT_RAW = `
  SELECT
    a.id, a.signal_id, a.activity_type, a.title, a.preview,
    a.source_url, a.thumbnail_url, a.detected_at, a.raw_payload_json,
    a.summary_text, a.summary_model, a.summary_generated_at,
    a.status, a.status_changed_at, a.dedup_key,
    s.type      AS signal_type,
    s.target    AS signal_target,
    s.vertical  AS signal_vertical,
    s.tier      AS signal_tier,
    COALESCE(
      (SELECT GROUP_CONCAT(t.name, '|') FROM signal_tags st JOIN tags t ON t.id = st.tag_id WHERE st.signal_id = s.id ORDER BY t.name),
      ''
    ) AS signal_tags_concat
  FROM activities a
  JOIN signals s ON s.id = a.signal_id
`

function hydrateActivity(r: RawActivityRow): ActivityRow {
  return {
    ...r,
    signal_tags: r.signal_tags_concat ? r.signal_tags_concat.split('|').filter(Boolean) : [],
  } as unknown as ActivityRow
}

// Backwards-compat alias used elsewhere in the file (kept so the rest of the
// file's queries don't need to change shape — they call hydrateActivity).
const ACTIVITY_BASE_SELECT = ACTIVITY_BASE_SELECT_RAW

export const PAGE_SIZE = 12

export function getActivities(filter: Filter, limit = PAGE_SIZE): ActivityRow[] {
  const { sql: where, params } = buildWhere(filter)
  const offset = Math.max(0, (filter.page - 1) * limit)
  const stmt = db.prepare(`
    ${ACTIVITY_BASE_SELECT}
    ${where}
    ORDER BY a.detected_at DESC, a.id DESC
    LIMIT ? OFFSET ?
  `)
  return (stmt.all(...params, limit, offset) as RawActivityRow[]).map(hydrateActivity)
}

export function countActivities(filter: Filter): number {
  const { sql: where, params } = buildWhere(filter)
  const row = db.prepare(`
    SELECT COUNT(*) AS n
    FROM activities a
    JOIN signals s ON s.id = a.signal_id
    ${where}
  `).get(...params) as { n: number }
  return row.n
}

export function getActivityById(id: number): ActivityRow | null {
  const row = db.prepare(`${ACTIVITY_BASE_SELECT} WHERE a.id = ?`).get(id) as RawActivityRow | undefined
  return row ? hydrateActivity(row) : null
}

export function getSavedActivities(
  opts: { typeFilter?: SignalType | null; page?: number; limit?: number } = {},
): ActivityRow[] {
  let where = `WHERE a.status = 'useful'`
  const params: unknown[] = []
  if (opts.typeFilter) {
    where += ` AND s.type = ?`
    params.push(opts.typeFilter)
  }
  const limit = opts.limit ?? PAGE_SIZE
  const offset = Math.max(0, ((opts.page ?? 1) - 1) * limit)
  const stmt = db.prepare(`
    ${ACTIVITY_BASE_SELECT}
    ${where}
    ORDER BY a.status_changed_at DESC, a.detected_at DESC, a.id DESC
    LIMIT ? OFFSET ?
  `)
  return (stmt.all(...params, limit, offset) as RawActivityRow[]).map(hydrateActivity)
}

export function countSavedActivities(opts: { typeFilter?: SignalType | null } = {}): number {
  let where = `WHERE status = 'useful'`
  const params: unknown[] = []
  if (opts.typeFilter) {
    where += ` AND signal_id IN (SELECT id FROM signals WHERE type = ?)`
    params.push(opts.typeFilter)
  }
  const row = db.prepare(`SELECT COUNT(*) AS n FROM activities ${where}`).get(...params) as { n: number }
  return row.n
}

export type ActivityTriageAction = 'useful' | 'skip' | 'unsave'

export interface TriageResult {
  action: ActivityTriageAction
  activity?: ActivityRow
  deleted?: boolean
}

// useful  → status='useful', remains in DB (visible on /saved)
// unsave  → status='new'    (only meaningful from /saved view)
// skip    → HARD DELETE row from activities
export function triageActivity(id: number, action: ActivityTriageAction): TriageResult | null {
  if (action === 'skip') {
    const r = db.prepare(`DELETE FROM activities WHERE id = ?`).run(id)
    if (r.changes === 0) return null
    return { action, deleted: true }
  }

  const newStatus = action === 'useful' ? 'useful' : 'new'
  const now = new Date().toISOString()
  const r = db
    .prepare(`UPDATE activities SET status = ?, status_changed_at = ? WHERE id = ?`)
    .run(newStatus, now, id)
  if (r.changes === 0) return null
  const activity = getActivityById(id)
  return activity ? { action, activity } : null
}

// Update OpenRouter summary on an activity (called from services/summary.ts)
export function setActivitySummary(id: number, text: string, model: string): ActivityRow | null {
  db.prepare(
    `UPDATE activities SET summary_text = ?, summary_model = ?, summary_generated_at = ? WHERE id = ?`,
  ).run(text, model, new Date().toISOString(), id)
  return getActivityById(id)
}

// ────────────────────────────────────────────────────────────────────
// Retention — auto-delete activities older than N days, keep 'useful'
// ────────────────────────────────────────────────────────────────────
export function pruneOldActivities(retentionDays: number): number {
  const days = Math.max(1, Math.min(60, Math.round(retentionDays)))
  const r = db
    .prepare(
      `DELETE FROM activities
        WHERE status != 'useful'
          AND detected_at < datetime('now', ?)`,
    )
    .run(`-${days} days`)
  return r.changes
}
