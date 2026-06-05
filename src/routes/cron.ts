import { Hono } from 'hono'
import { config } from '../config.ts'
import { getSetting, setSetting } from '../db/settings.ts'
import { pruneOldActivities } from '../db/queries.ts'
import { runFirecrawl } from '../pollers/firecrawl.ts'
import { runSerper } from '../pollers/serper.ts'
import { runYouTube } from '../pollers/youtube.ts'
import { runTikTok } from '../pollers/tiktok.ts'
import { runGoogleAds } from '../pollers/google-ads.ts'
import { runMetaAds } from '../pollers/meta-ads.ts'
import { runInstagram } from '../pollers/instagram.ts'

export const cronRoutes = new Hono()

// Auth middleware — requires CRON_SECRET in production; open in dev when unset
cronRoutes.use('/api/cron/*', async (c, next) => {
  if (config.cronSecret) {
    const key = c.req.query('key')
    if (key !== config.cronSecret) {
      return c.json({ error: 'Unauthorized' }, 403)
    }
  }
  return next()
})

const POLLERS: Record<string, () => Promise<{ fetched: number; inserted: number; skipped: number; baseline?: number }>> = {
  firecrawl: runFirecrawl,
  serper: runSerper,
  youtube: runYouTube,
  tiktok: runTikTok,
  'google-ads': runGoogleAds,
  'meta-ads': runMetaAds,
  instagram: runInstagram,
}

interface CronResult {
  poller: string
  fetched: number
  inserted: number
  skipped: number
  baseline?: number
  completedAt: string
  durationMs: number
  error?: string
}

async function runSinglePoller(name: string): Promise<CronResult> {
  const run = POLLERS[name]
  if (!run) {
    return { poller: name, fetched: 0, inserted: 0, skipped: 0, completedAt: new Date().toISOString(), durationMs: 0, error: `Unknown poller: ${name}` }
  }
  setSetting(`poller_running:${name}`, true)
  const start = Date.now()
  try {
    const result = await run()
    const cronResult: CronResult = { poller: name, ...result, completedAt: new Date().toISOString(), durationMs: Date.now() - start }
    setSetting(`poller_last_run:${name}`, new Date().toISOString())
    setSetting(`poller_last_result:${name}`, { ...result, completedAt: new Date().toISOString() })
    return cronResult
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const existing = getSetting<Record<string, unknown>>(`poller_last_result:${name}`)
    setSetting(`poller_last_result:${name}`, { ...(existing ?? { fetched: 0, inserted: 0, skipped: 0 }), completedAt: new Date().toISOString(), error: msg })
    return { poller: name, fetched: 0, inserted: 0, skipped: 0, completedAt: new Date().toISOString(), durationMs: Date.now() - start, error: msg }
  } finally {
    setSetting(`poller_running:${name}`, false)
  }
}

// Individual poller endpoints
for (const name of Object.keys(POLLERS)) {
  cronRoutes.get(`/api/cron/${name}`, async (c) => {
    const result = await runSinglePoller(name)
    return c.json(result, result.error ? 500 : 200)
  })
}

// Run all pollers sequentially
cronRoutes.get('/api/cron/all', async (c) => {
  const results: CronResult[] = []
  for (const name of Object.keys(POLLERS)) {
    results.push(await runSinglePoller(name))
  }
  const hasError = results.some((r) => r.error)
  return c.json({ results, completedAt: new Date().toISOString() }, hasError ? 207 : 200)
})

// Retention — permanently delete activities older than N days that aren't 'useful'
cronRoutes.get('/api/cron/retention', (c) => {
  const start = Date.now()
  try {
    const deleted = pruneOldActivities(config.retentionDays)
    return c.json({ job: 'retention', deleted, retentionDays: config.retentionDays, durationMs: Date.now() - start, completedAt: new Date().toISOString() })
  } catch (err) {
    return c.json({ job: 'retention', error: err instanceof Error ? err.message : String(err), durationMs: Date.now() - start, completedAt: new Date().toISOString() }, 500)
  }
})

// Status — return last run info for each poller
cronRoutes.get('/api/cron/status', (c) => {
  const statuses: Record<string, unknown> = {}
  for (const name of Object.keys(POLLERS)) {
    const lastRun = getSetting<string>(`poller_last_run:${name}`)
    const lastResult = getSetting<Record<string, unknown>>(`poller_last_result:${name}`)
    statuses[name] = { lastRun, lastResult }
  }
  return c.json({ pollers: statuses, timestamp: new Date().toISOString() })
})
