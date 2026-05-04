import { Hono } from 'hono'
import { getActivityById, triageActivity } from '../db/queries.ts'
import { activityDetail, summarySection } from '../views/activity-detail.ts'
import { activityRow } from '../views/activity-row.ts'
import { getOrGenerateSummary } from '../services/summary.ts'

export const activityRoutes = new Hono()

const ALLOWED_ACTIONS = ['useful', 'skip', 'unsave'] as const
type TriageAction = (typeof ALLOWED_ACTIONS)[number]

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

  if (action === 'skip') {
    // Row is gone from DB. Empty body causes outerHTML swap to remove the element.
    return c.body('', 200)
  }

  if (action === 'unsave' && result.activity) {
    // Status went back to 'new' — re-render the row so the saved pill clears
    // and the Useful/Skip buttons replace Unsave/Remove.
    return c.html(activityRow(result.activity, { context: 'board' }).value)
  }

  if (action === 'useful' && result.activity) {
    // Keep the row visible with saved pill + Unsave/Remove buttons so the user
    // can see what they just marked instead of having it vanish.
    return c.html(activityRow(result.activity, { context: 'board' }).value)
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
