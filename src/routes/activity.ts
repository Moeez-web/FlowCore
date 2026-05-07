import { Hono } from 'hono'
import { getActivityById, triageActivity, countActivities } from '../db/queries.ts'
import { activityDetail, summarySection } from '../views/activity-detail.ts'
import { activityRow } from '../views/activity-row.ts'
import { getOrGenerateSummary } from '../services/summary.ts'
import { getSetting } from '../db/settings.ts'
import { parseFilter, type Filter, DEFAULT_FILTER, ALL_STATUSES } from '../lib/filters.ts'
import { html } from '../lib/html.ts'

export const activityRoutes = new Hono()

const ALLOWED_ACTIONS = ['useful', 'skip', 'unsave'] as const
type TriageAction = (typeof ALLOWED_ACTIONS)[number]

/** Render out-of-band count spans that htmx swaps into the status pills + feed count. */
function statusCountOob(filter: Filter): string {
  const counts: Record<string, number> = {}
  for (const s of ALL_STATUSES) {
    counts[s] = countActivities({ ...filter, status: s })
  }
  const pillHtml = ALL_STATUSES.map((s) => {
    const c = counts[s]
    return `<span id="status-count-${s}" hx-swap-oob="true" class="text-[10px] font-bold tabular-nums opacity-80">${c}</span>`
  }).join('')
  const total = counts[filter.status] ?? 0
  const feedHtml = `<p id="feed-item-count" hx-swap-oob="true" class="text-xs text-slate-500 font-medium">${total} ${total === 1 ? 'item' : 'items'}</p>`
  return pillHtml + feedHtml
}

function parseId(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number.parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

activityRoutes.get('/activities/:id', (c) => {
  const id = parseId(c.req.param('id'))
  if (id == null) return c.text('Bad activity id', 400)
  const row = getActivityById(id)
  if (!row) return c.text('Not found', 404)
  return c.html(activityDetail(row).value)
})

activityRoutes.post('/activities/:id/triage', async (c) => {
  const id = parseId(c.req.param('id'))
  if (id == null) return c.text('Bad activity id', 400)

  let action: string | undefined
  const ct = c.req.header('content-type') ?? ''
  if (ct.includes('application/json')) {
    const body = (await c.req.json()) as { action?: string }
    action = body.action
  } else {
    const form = await c.req.parseBody()
    action = typeof form['action'] === 'string' ? form['action'] : undefined
  }

  if (!action || !ALLOWED_ACTIONS.includes(action as TriageAction)) {
    return c.text(`Invalid action`, 400)
  }

  const result = triageActivity(id, action as TriageAction)
  if (!result) return c.text('Not found', 404)

  // Build out-of-band count update using the user's saved filter context
  const saved = getSetting<Filter>('last_filter')
  const filter: Filter = { ...DEFAULT_FILTER, ...(saved ?? {}), page: 1, cursor: undefined }

  // Status pill OOB spans only exist on the Board page (not /useful).
  // Skip the 3 extra countActivities queries when coming from Useful.
  const referer = c.req.header('Referer') ?? ''
  const fromUseful = referer.includes('/useful')
  const counts = fromUseful
    ? (() => {
        const total = countActivities(filter)
        return `<p id="feed-item-count" hx-swap-oob="true" class="text-xs text-slate-500 font-medium">${total} ${total === 1 ? 'item' : 'items'}</p>`
      })()
    : statusCountOob(filter)

  if (action === 'skip') {
    // Row is gone from DB. Return just the OOB count update — the card element
    // is removed by the empty swap, and htmx processes the OOB spans separately.
    return c.html(counts)
  }

  if (action === 'unsave' && result.activity) {
    return c.html(activityRow(result.activity, { context: 'board' }).value + counts)
  }

  if (action === 'useful' && result.activity) {
    return c.html(activityRow(result.activity, { context: 'board' }).value + counts)
  }

  return c.body('', 200)
})

activityRoutes.post('/activities/:id/summary', async (c) => {
  const id = parseId(c.req.param('id'))
  if (id == null) return c.text('Bad activity id', 400)

  const result = await getOrGenerateSummary(id)
  if (!result.activity) return c.text('Not found', 404)

  // autoOpen so the popup pops as soon as the freshly-generated summary
  // swaps into the card — saves the user an extra click.
  return c.html(summarySection(result.activity, { error: result.error, autoOpen: true }).value)
})
