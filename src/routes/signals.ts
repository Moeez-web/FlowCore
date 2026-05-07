import { Hono } from 'hono'
import { z } from 'zod'
import {
  listSignals,
  countSignals,
  countSignalsByType,
  getSignal,
  getSignalByTypeAndTarget,
  createSignal,
  deleteSignal,
  setSignalActive,
  addTagToSignal,
  removeTagFromSignal,
  applyTagToSignals,
  removeTagFromSignals,
  searchSignals,
  SIGNAL_TYPES,
  SIGNAL_TYPE_LABELS,
  PAGE_SIZE,
  type SignalType,
} from '../db/queries.ts'
import { html } from '../lib/html.ts'
import { signalsPage, signalsTableFragment, signalRow } from '../views/signals.ts'

export const signalRoutes = new Hono()

const NewSignalSchema = z.object({
  type: z.enum(SIGNAL_TYPES),
  target: z.string().trim().min(1).max(200),
  tags: z.array(z.string().trim().min(1).max(80)).optional(),
  vertical: z.enum(['well', 'plumbing']).optional().nullable(),
  tier: z.enum(['local', 'mondo', 'national', 'inspiration']).optional().nullable(),
})

function parsePage(raw: unknown): number {
  const n = Number.parseInt(String(raw ?? '1'), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

// /signals uses grouped competitor layout — splitting a competitor's channels
// across pages is bad UX. Show a lot per page so most competitors fit on page
// one. A future scale-out would paginate by group, not by signal.
const SIGNALS_PAGE_LIMIT = 200

function buildPagination(page: number, total: number, filterParams: URLSearchParams) {
  return {
    page,
    pageSize: SIGNALS_PAGE_LIMIT,
    total,
    baseUrl: '/signals',
    query: filterParams,
    hxTarget: '#signal-page-shell',
    hxSwap: 'innerHTML',
  }
}

function parseTypeParam(raw: unknown): SignalType | null {
  const s = String(raw ?? '').trim()
  return (SIGNAL_TYPES as readonly string[]).includes(s) ? (s as SignalType) : null
}

signalRoutes.get('/signals', (c) => {
  const page = parsePage(c.req.query('page'))
  const typeFilter = parseTypeParam(c.req.query('type'))
  const tagRaw = String(c.req.query('tag') ?? '').trim()
  const tagFilter = tagRaw.length > 0 && tagRaw.length <= 80 ? tagRaw : null
  const searchRaw = String(c.req.query('q') ?? '').trim()
  const search = searchRaw.length > 0 && searchRaw.length <= 80 ? searchRaw : null

  const totalCount = countSignals()  // unfiltered, for type-card grid
  const filteredCount = countSignals({ typeFilter, tagFilter, search })
  const signals = listSignals({ page, limit: SIGNALS_PAGE_LIMIT, typeFilter, tagFilter, search })

  const filterParams = new URLSearchParams()
  if (typeFilter) filterParams.set('type', typeFilter)
  if (tagFilter)  filterParams.set('tag', tagFilter)
  if (search)     filterParams.set('q', search)

  const pagination = buildPagination(page, filteredCount, filterParams)
  const filters = { type: typeFilter, tag: tagFilter, search }
  const signalsByType: Record<string, number> = {}
  for (const tc of countSignalsByType()) signalsByType[tc.type] = tc.n
  const isHtmx = c.req.header('HX-Request') === 'true'

  if (isHtmx) {
    return c.html(signalsTableFragment({ signals, pagination, totalCount, filteredCount, filters, signalsByType }).value)
  }

  return c.html(signalsPage({
    signals, totalCount, filteredCount, signalsByType, pagination, filters,
  }).value)
})

// Add a competitor and all of their channels in one request. The form posts
// name + website (required) plus optional facebook / google_ads / instagram
// / tiktok / youtube fields. We create one signal per non-empty field, all
// tagged with the competitor name. Already-tracked signals are skipped (the
// UNIQUE conflict on (type, target) is treated as "fine, move on"). After
// the batch we trigger a full-page refresh so the type counts update.
signalRoutes.post('/signals/competitor', async (c) => {
  const form = await c.req.parseBody()
  const name = String(form['name'] ?? '').trim()
  const website = String(form['website'] ?? '').trim()
  if (!name) return c.text('Name is required', 400)
  if (!website) return c.text('Website is required', 400)
  if (name.length > 80) return c.text('Name too long (max 80)', 400)

  const stripProto = (s: string) => s.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '')
  const channels: Array<{ type: SignalType; target: string }> = [
    { type: 'website',           target: stripProto(website) },
  ]
  const fb = String(form['facebook'] ?? '').trim()
  if (fb) channels.push({ type: 'meta_ads', target: stripProto(fb) })
  const gads = String(form['google_ads'] ?? '').trim()
  if (gads) channels.push({ type: 'google_ads', target: gads })
  const ig = String(form['instagram'] ?? '').trim()
  if (ig) channels.push({ type: 'instagram_account', target: ig.replace(/^@/, '') })
  const tt = String(form['tiktok'] ?? '').trim()
  if (tt) channels.push({ type: 'tiktok_account', target: tt.replace(/^@/, '') })
  const yt = String(form['youtube'] ?? '').trim()
  if (yt) channels.push({ type: 'youtube_channel', target: yt.startsWith('@') ? yt : `@${yt}` })

  let created = 0
  let skipped = 0
  const tag = name
  for (const ch of channels) {
    try {
      createSignal({ type: ch.type, target: ch.target, tags: [tag] })
      created++
    } catch (err) {
      if (/UNIQUE/.test((err as Error).message)) {
        // Already tracked — make sure the competitor tag is on it so it
        // shows up under this competitor's tag filter.
        const existing = getSignalByTypeAndTarget(ch.type, ch.target)
        if (existing) addTagToSignal(existing.id, tag)
        skipped++
      } else {
        throw err
      }
    }
  }

  // HX-Refresh forces a full-page reload so the type-count grid + table all
  // reflect the new state in one shot. Trigger a toast via HX-Trigger before
  // the refresh fires so the user gets confirmation; layout.ts persists the
  // toast across reload via sessionStorage.
  const toastMsg = skipped > 0
    ? `Added ${created} channel${created === 1 ? '' : 's'} for ${name} (${skipped} already tracked)`
    : `Added ${created} channel${created === 1 ? '' : 's'} for ${name}`
  c.header('HX-Trigger', JSON.stringify({ 'fc:toast-after-refresh': { msg: toastMsg, type: 'success' } }))
  c.header('HX-Refresh', 'true')
  return c.body('', 200)
})

signalRoutes.post('/signals', async (c) => {
  const form = await c.req.parseBody()
  const tagsRaw = String(form['tags'] ?? '').trim()
  const tags = tagsRaw ? tagsRaw.split(',').map((s) => s.trim()).filter(Boolean) : undefined
  const parsed = NewSignalSchema.safeParse({
    type: form['type'],
    target: form['target'],
    tags,
    vertical: (form['vertical'] as string) || undefined,
    tier: (form['tier'] as string) || undefined,
  })
  if (!parsed.success) return c.text(`Invalid: ${parsed.error.issues.map((i) => i.message).join(', ')}`, 400)
  try {
    createSignal(parsed.data)
  } catch (err) {
    if (/UNIQUE/.test((err as Error).message)) return c.text('That signal already exists.', 409)
    throw err
  }
  // Refresh the page so the new row lands in the right competitor group and
  // the type counts update.
  c.header('HX-Trigger', JSON.stringify({ 'fc:toast-after-refresh': { msg: 'Signal added', type: 'success' } }))
  c.header('HX-Refresh', 'true')
  return c.body('', 200)
})

// Per-signal tag operations
signalRoutes.post('/signals/:id/tags', async (c) => {
  const id = Number.parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id) || id <= 0) return c.text('Bad id', 400)
  const form = await c.req.parseBody()
  const tag = String(form['tag'] ?? '').trim()
  if (!tag) return c.text('Empty tag', 400)
  if (tag.length > 80) return c.text('Tag too long (max 80)', 400)
  const updated = addTagToSignal(id, tag)
  if (!updated) return c.text('Not found', 404)
  return c.html(signalRow(updated).value)
})

signalRoutes.delete('/signals/:id/tags/:tag', (c) => {
  const id = Number.parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id) || id <= 0) return c.text('Bad id', 400)
  const tag = decodeURIComponent(c.req.param('tag'))
  const updated = removeTagFromSignal(id, tag)
  if (!updated) return c.text('Not found', 404)
  return c.html(signalRow(updated).value)
})

// Bulk-tag — apply or remove a tag across multiple selected signals
signalRoutes.post('/signals/bulk-tag', async (c) => {
  const form = await c.req.parseBody({ all: true })
  const tag = String(form['tag'] ?? '').trim()
  const op = String(form['op'] ?? 'add')
  if (!tag) return c.text('Tag is required', 400)
  // signal_id is an array because the form sends repeated fields ({ all: true })
  const raw = form['signal_id']
  const ids = (Array.isArray(raw) ? raw : raw ? [raw] : [])
    .map((v) => Number.parseInt(String(v), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (ids.length === 0) return c.text('No signals selected', 400)

  if (op === 'remove') removeTagFromSignals(ids, tag)
  else applyTagToSignals(ids, tag)

  // Re-render the page shell so all affected rows refresh with their new tags
  const page = parsePage(c.req.query('page'))
  const totalCount = countSignals()
  const signals = listSignals({ page, limit: SIGNALS_PAGE_LIMIT })
  const pagination = buildPagination(page, totalCount, new URLSearchParams())
  const signalsByType: Record<string, number> = {}
  for (const tc of countSignalsByType()) signalsByType[tc.type] = tc.n
  return c.html(signalsTableFragment({
    signals, pagination, totalCount, filteredCount: totalCount,
    filters: { type: null, tag: null, search: null },
    signalsByType,
  }).value)
})

signalRoutes.delete('/signals/:id', (c) => {
  const id = Number.parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id) || id <= 0) return c.text('Bad id', 400)
  const ok = deleteSignal(id)
  if (!ok) return c.text('Not found', 404)
  return c.body('', 200)
})

signalRoutes.post('/signals/:id/toggle-active', (c) => {
  const id = Number.parseInt(c.req.param('id'), 10)
  if (!Number.isFinite(id) || id <= 0) return c.text('Bad id', 400)
  const sig = getSignal(id)
  if (!sig) return c.text('Not found', 404)
  const updated = setSignalActive(id, sig.is_active === 0)
  if (!updated) return c.text('Failed', 500)
  return c.html(signalRow(updated).value)
})

// Live search for the bulk-tag picker. Returns a tiny HTML list of matching
// signals; each row carries the data needed to construct a pill on the client.
signalRoutes.get('/signals/search', (c) => {
  const q = String(c.req.query('q') ?? '').trim()
  if (q.length < 2) {
    return c.html('<p class="text-xs text-slate-400 px-3 py-2">Type at least 2 characters…</p>')
  }
  const matches = searchSignals(q, 10)
  if (matches.length === 0) {
    return c.html('<p class="text-xs text-slate-400 px-3 py-2">No signals match.</p>')
  }
  const items = matches.map((s) => {
    const primaryTag = s.tags[0] ?? ''
    const display = primaryTag ? `${primaryTag} · ${s.target}` : s.target
    return html`<button type="button"
                       data-search-result
                       data-signal-id="${String(s.id)}"
                       data-signal-display="${display}"
                       data-signal-type="${s.type}"
                       data-signal-target="${s.target}"
                       class="w-full text-left px-3 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-2">
      <span class="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
        ${SIGNAL_TYPE_LABELS[s.type]?.slice(0, 2) ?? s.type.slice(0, 2)}
      </span>
      <span class="flex-1 min-w-0">
        <span class="text-sm text-slate-800 font-medium truncate block">${display}</span>
        <span class="text-[10px] text-slate-400">${SIGNAL_TYPE_LABELS[s.type] ?? s.type}</span>
      </span>
      ${s.tags.length > 0 ? html`<span class="text-[10px] text-slate-400 truncate max-w-[120px]">${s.tags.slice(0, 2).join(', ')}</span>` : ''}
    </button>`
  })
  return c.html(items.map((r) => r.value).join(''))
})

signalRoutes.get('/competitors', (c) => c.redirect('/signals', 301))
