export const ALL_SIGNAL_TYPES = [
  'website',
  'meta_ads',
  'google_ads',
  'instagram_account',
  'tiktok_account',
  'youtube_channel',
] as const
export type SignalTypeFilter = typeof ALL_SIGNAL_TYPES[number]

// Backwards-compat alias for views still using `ALL_CHANNELS` naming.
export const ALL_CHANNELS = ALL_SIGNAL_TYPES
export type Channel = SignalTypeFilter

export const ALL_STATUSES = ['all', 'new', 'useful'] as const
export type StatusFilter = typeof ALL_STATUSES[number]

export const DATE_PRESETS = [1, 3, 7, 30] as const
export type DayPreset = typeof DATE_PRESETS[number]

export interface Filter {
  signal_types: string[]
  tags: string[]     // filter by tag names (signal_tags JOIN tags)
  days: number
  status: StatusFilter
  search: string
  page: number       // 1-based pagination
  cursor?: string    // base64 "detected_at|id" for infinite scroll
  seo_filter: 'all' | 'gained' | 'lost'
}

const TYPE_SET = new Set<string>(ALL_SIGNAL_TYPES)
const STATUS_SET = new Set<string>(ALL_STATUSES)

export const DEFAULT_FILTER: Filter = {
  signal_types: [...ALL_SIGNAL_TYPES],
  tags: [],
  days: 30,
  status: 'new',
  search: '',
  page: 1,
  seo_filter: 'all',
}

function asArray(v: string | string[] | undefined): string[] {
  if (v == null) return []
  return Array.isArray(v) ? v : [v]
}

export function parseFilter(query: Record<string, string | string[]>): Filter {
  const rawTypes = [...asArray(query['type']), ...asArray(query['channel'])]
    .filter((t) => TYPE_SET.has(t))
  const signal_types: string[] =
    rawTypes.length > 0 ? rawTypes : [...ALL_SIGNAL_TYPES]

  const tags = asArray(query['tag'])
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length <= 80)

  const daysRaw = Number.parseInt(String(query['days'] ?? '30'), 10)
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : 30

  const statusRaw = String(query['status'] ?? 'new')
  const status: StatusFilter = STATUS_SET.has(statusRaw) ? (statusRaw as StatusFilter) : 'new'

  const search = String(query['q'] ?? '').trim().slice(0, 80)

  const pageRaw = Number.parseInt(String(query['page'] ?? '1'), 10)
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.min(pageRaw, 9999) : 1

  const cursor = String(query['cursor'] ?? '').trim() || undefined

  const seoFilterRaw = String(query['seo_filter'] ?? 'all')
  const seoFilterValid = new Set(['all', 'gained', 'lost'])
  const seo_filter: 'all' | 'gained' | 'lost' = seoFilterValid.has(seoFilterRaw) ? (seoFilterRaw as 'all' | 'gained' | 'lost') : 'all'

  return { signal_types, tags, days, status, search, page, cursor, seo_filter }
}

/** Serialize filter (everything except `page`) into URLSearchParams for link building. */
export function filterToQuery(f: Filter): URLSearchParams {
  const p = new URLSearchParams()
  if (f.signal_types.length > 0 && f.signal_types.length < ALL_SIGNAL_TYPES.length) {
    for (const t of f.signal_types) p.append('type', t)
  }
  for (const tg of f.tags) p.append('tag', tg)
  if (f.days !== 30) p.set('days', String(f.days))
  if (f.status !== 'new') p.set('status', f.status)
  if (f.search) p.set('q', f.search)
  if (f.cursor) p.set('cursor', f.cursor)
  if (f.seo_filter !== 'all') p.set('seo_filter', f.seo_filter)
  return p
}

export function buildWhere(f: Filter): { sql: string; params: unknown[] } {
  const clauses: string[] = []
  const params: unknown[] = []

  // Defensive defaults — saved state from older versions may be missing fields
  const signal_types = Array.isArray(f.signal_types) ? f.signal_types : [...ALL_SIGNAL_TYPES]
  const tags = Array.isArray(f.tags) ? f.tags : []

  // Exclude SEO/backlink activities from regular feed — they live on the Keywords page
  clauses.push(`a.activity_type NOT IN ('keyword_rank_gain', 'keyword_rank_loss', 'backlink_acquired', 'backlink_lost', 'anchor_text_changed')`)
  if (signal_types.length > 0 && signal_types.length < ALL_SIGNAL_TYPES.length) {
    const placeholders = signal_types.map(() => '?').join(',')
    clauses.push(`s.type IN (${placeholders})`)
    params.push(...signal_types)
  }

  if (tags.length > 0) {
    const placeholders = tags.map(() => '?').join(',')
    clauses.push(`s.id IN (
      SELECT st.signal_id FROM signal_tags st
      JOIN tags t ON t.id = st.tag_id
      WHERE t.name IN (${placeholders})
    )`)
    params.push(...tags)
  }

  if (f.days > 0) {
    clauses.push(`a.detected_at >= datetime('now', ?)`)
    params.push(`-${f.days} days`)
  }

  if (f.status !== 'all') {
    clauses.push(`a.status = ?`)
    params.push(f.status)
  }

  if (f.search.length > 0) {
    clauses.push(`(a.title LIKE ? OR a.preview LIKE ? OR s.target LIKE ?)`)
    const like = `%${f.search}%`
    params.push(like, like, like)
  }

  const sql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  return { sql, params }
}
