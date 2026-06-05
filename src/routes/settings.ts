import { Hono } from 'hono'
import { config } from '../config.ts'
import { getSetting, setSetting } from '../db/settings.ts'
import { POLLER_REGISTRY, pausePoller, resumePoller, isPollerPaused } from '../pollers/scheduler.ts'
import { settingsPage, pollerRowHtml, type PollerStatus } from '../views/settings.ts'

export const settingsRoutes = new Hono()

interface PollerDisplay {
  name: string
  label: string
  iconName: string
  intervalLabel: string
  intervalMs: number
  description: string
}

const POLLER_DISPLAY: PollerDisplay[] = [
  { name: 'firecrawl',   label: 'Website Scraping', iconName: 'website',        intervalLabel: '7 days', intervalMs: config.pollers.firecrawlIntervalMs, description: 'Website content monitoring — detects new pages, homepage changes, and blog posts' },
  { name: 'serper',     label: 'SEO Keywords',      iconName: 'seo',            intervalLabel: '1 day',  intervalMs: config.pollers.serperIntervalMs,   description: 'SEO rank tracking — monitors Google SERP positions for tracked keywords' },
  { name: 'youtube',    label: 'YouTube',    iconName: 'youtube_shorts', intervalLabel: '7 days', intervalMs: config.pollers.youtubeIntervalMs,   description: '' },
  { name: 'tiktok',     label: 'TikTok',     iconName: 'tiktok',         intervalLabel: '7 days', intervalMs: config.pollers.tiktokIntervalMs,    description: '' },
  { name: 'instagram',  label: 'Instagram',  iconName: 'instagram',      intervalLabel: '7 days', intervalMs: config.pollers.instagramIntervalMs, description: '' },
  { name: 'meta-ads',   label: 'Meta Ads',   iconName: 'meta_ads',       intervalLabel: '3 days', intervalMs: config.pollers.metaAdsIntervalMs,   description: '' },
  { name: 'google-ads', label: 'Google Ads', iconName: 'google_ads',     intervalLabel: '3 days', intervalMs: config.pollers.googleAdsIntervalMs, description: '' },
]

function buildSingleStatus(display: PollerDisplay): PollerStatus {
  const lastRunIso = getSetting<string>(`poller_last_run:${display.name}`)
  const lastResult = getSetting<Record<string, unknown>>(`poller_last_result:${display.name}`) as PollerStatus['lastResult']
  const paused = isPollerPaused(display.name)
  const running = getSetting<boolean>(`poller_running:${display.name}`) === true

  let nextRun: string | null = null
  if (lastRunIso && !paused) {
    const next = new Date(new Date(lastRunIso).getTime() + display.intervalMs)
    nextRun = next.toISOString()
  }

  return {
    ...display,
    paused,
    running,
    lastRun: lastRunIso,
    nextRun,
    lastResult,
  }
}

function buildAllStatuses(): PollerStatus[] {
  return POLLER_DISPLAY.map(buildSingleStatus)
}

settingsRoutes.get('/settings', (c) => {
  const statuses = buildAllStatuses()
  return c.html(settingsPage(statuses).value)
})

settingsRoutes.post('/settings/run/:name', async (c) => {
  const name = c.req.param('name')
  const entry = POLLER_REGISTRY.get(name)
  if (!entry) {
    const display = POLLER_DISPLAY.find(d => d.name === name)
    if (!display) return c.text('Unknown poller', 404)
    return c.html(pollerRowHtml({ ...buildSingleStatus(display), lastResult: { fetched: 0, inserted: 0, skipped: 0, error: 'Poller not configured — missing API key', completedAt: new Date().toISOString() } }).value)
  }

  // Prevent double-run
  if (getSetting<boolean>(`poller_running:${name}`)) {
    const display = POLLER_DISPLAY.find(d => d.name === name)!
    return c.html(pollerRowHtml(buildSingleStatus(display)).value)
  }

  setSetting(`poller_running:${name}`, true)

  try {
    const result = await entry.run()
    setSetting(`poller_last_run:${name}`, new Date().toISOString())
    setSetting(`poller_last_result:${name}`, { ...result, completedAt: new Date().toISOString() })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const existing = getSetting<Record<string, unknown>>(`poller_last_result:${name}`)
    setSetting(`poller_last_result:${name}`, {
      ...(existing ?? { fetched: 0, inserted: 0, skipped: 0 }),
      completedAt: new Date().toISOString(),
      error: msg,
    })
  } finally {
    setSetting(`poller_running:${name}`, false)
  }

  const display = POLLER_DISPLAY.find(d => d.name === name)!
  return c.html(pollerRowHtml(buildSingleStatus(display)).value)
})

settingsRoutes.post('/settings/pause/:name', (c) => {
  const name = c.req.param('name')
  pausePoller(name)
  const display = POLLER_DISPLAY.find(d => d.name === name)
  if (!display) return c.text('Unknown poller', 404)
  return c.html(pollerRowHtml(buildSingleStatus(display)).value)
})

settingsRoutes.post('/settings/resume/:name', (c) => {
  const name = c.req.param('name')
  resumePoller(name)
  const display = POLLER_DISPLAY.find(d => d.name === name)
  if (!display) return c.text('Unknown poller', 404)
  return c.html(pollerRowHtml(buildSingleStatus(display)).value)
})
