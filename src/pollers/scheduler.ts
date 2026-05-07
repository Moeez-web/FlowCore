import { config } from '../config.ts'
import { runSerper } from './serper.ts'
import { runZenrows } from './zenrows.ts'
import { runSerpStat } from './serpstat.ts'
import { runYouTube } from './youtube.ts'
import { runTikTok } from './tiktok.ts'
import { runGoogleAds } from './google-ads.ts'
import { runMetaAds } from './meta-ads.ts'
import { runInstagram } from './instagram.ts'
import { getSetting, setSetting, clearSetting } from '../db/settings.ts'

interface Poller {
  name: string
  run: () => Promise<{ fetched: number; inserted: number; skipped: number; baseline?: number }>
  intervalMs: number
}

interface PollerResult {
  fetched: number
  inserted: number
  skipped: number
  baseline?: number
  completedAt: string
  error?: string
}

export const POLLER_REGISTRY: Map<string, { run: Poller['run']; intervalMs: number }> = new Map()

const POLLER_TIMERS: Map<string, { timeout: ReturnType<typeof setTimeout>; interval: ReturnType<typeof setInterval> }> = new Map()

function lastRunKey(name: string): string {
  return `poller_last_run:${name}`
}

function lastResultKey(name: string): string {
  return `poller_last_result:${name}`
}

function pausedKey(name: string): string {
  return `poller_paused:${name}`
}

function getLastRun(name: string): number {
  const ts = getSetting<string>(lastRunKey(name))
  return ts ? new Date(ts).getTime() : 0
}

function setLastRun(name: string): void {
  setSetting(lastRunKey(name), new Date().toISOString())
}

function setLastResult(name: string, result: { fetched: number; inserted: number; skipped: number; baseline?: number }): void {
  setSetting(lastResultKey(name), {
    ...result,
    completedAt: new Date().toISOString(),
  })
}

function setLastError(name: string, message: string): void {
  const existing = getSetting<PollerResult>(lastResultKey(name))
  setSetting(lastResultKey(name), {
    ...(existing ?? { fetched: 0, inserted: 0, skipped: 0 }),
    completedAt: new Date().toISOString(),
    error: message,
  })
}

export function isPollerPaused(name: string): boolean {
  return getSetting<boolean>(pausedKey(name)) === true
}

export function pausePoller(name: string): boolean {
  const entry = POLLER_REGISTRY.get(name)
  if (!entry) return false
  const timers = POLLER_TIMERS.get(name)
  if (timers) {
    clearTimeout(timers.timeout)
    clearInterval(timers.interval)
    POLLER_TIMERS.delete(name)
  }
  setSetting(pausedKey(name), true)
  console.log(`[${name}] paused`)
  return true
}

export function resumePoller(name: string): boolean {
  const entry = POLLER_REGISTRY.get(name)
  if (!entry) return false
  clearSetting(pausedKey(name))

  const lastRun = getLastRun(name)
  const elapsed = Date.now() - lastRun
  const remaining = entry.intervalMs - elapsed
  const runSafe = buildRunSafe(name, entry.run)

  if (remaining > 0 && lastRun > 0) {
    const timeout = setTimeout(() => {
      runSafe()
      const interval = setInterval(runSafe, entry.intervalMs)
      interval.unref()
      POLLER_TIMERS.set(name, { timeout: timeout as ReturnType<typeof setTimeout>, interval })
    }, remaining)
    POLLER_TIMERS.set(name, { timeout, interval: undefined as unknown as ReturnType<typeof setInterval> })
  } else {
    const timeout = setTimeout(() => {
      runSafe()
      const interval = setInterval(runSafe, entry.intervalMs)
      interval.unref()
      POLLER_TIMERS.set(name, { timeout: timeout as ReturnType<typeof setTimeout>, interval })
    }, 30_000)
    POLLER_TIMERS.set(name, { timeout, interval: undefined as unknown as ReturnType<typeof setInterval> })
  }
  console.log(`[${name}] resumed`)
  return true
}

function buildRunSafe(name: string, run: Poller['run']): () => Promise<void> {
  return async () => {
    if (isPollerPaused(name)) {
      console.log(`[${name}] skipped — paused`)
      return
    }
    try {
      const result = await run()
      const extra = 'baseline' in result && result.baseline ? ` baseline=${result.baseline}` : ''
      console.log(`[${name}] fetched=${result.fetched} inserted=${result.inserted} skipped=${result.skipped}${extra}`)
      setLastRun(name)
      setLastResult(name, result)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[${name}] error:`, msg)
      setLastError(name, msg)
    }
  }
}

export function startScheduler(): void {
  if (!config.pollers.enabled) {
    console.log('[scheduler] polling disabled (POLLERS_ENABLED=0)')
    return
  }

  const pollers: Poller[] = []

  if (config.zenrows.apiKey) {
    pollers.push({ name: 'zenrows', run: runZenrows, intervalMs: config.pollers.zenrowsIntervalMs })
  } else {
    console.log('[scheduler] skipping zenrows — ZENROWS_API_KEY not set')
  }

  if (config.serper.apiKey) {
    pollers.push({ name: 'serper', run: runSerper, intervalMs: config.pollers.serperIntervalMs })
  } else {
    console.log('[scheduler] skipping serper — SERP_API_KEY not set')
  }

  // PAUSED — re-enable when needed
  // if (config.serpstat.apiToken) {
  //   pollers.push({ name: 'serpstat', run: runSerpStat, intervalMs: config.pollers.serpstatIntervalMs })
  // } else {
  //   console.log('[scheduler] skipping serpstat — SERPSTAT_API_TOKEN not set')
  // }
  if (config.serpstat.apiToken) {
    console.log('[scheduler] skipping serpstat — paused')
  }

  if (config.apify.apiToken) {
    pollers.push({ name: 'youtube', run: runYouTube, intervalMs: config.pollers.youtubeIntervalMs })
    pollers.push({ name: 'tiktok', run: runTikTok, intervalMs: config.pollers.tiktokIntervalMs })
    pollers.push({ name: 'google-ads', run: runGoogleAds, intervalMs: config.pollers.googleAdsIntervalMs })
    pollers.push({ name: 'meta-ads', run: runMetaAds, intervalMs: config.pollers.metaAdsIntervalMs })
    pollers.push({ name: 'instagram', run: runInstagram, intervalMs: config.pollers.instagramIntervalMs })
  } else {
    console.log('[scheduler] skipping apify pollers — APIFY_API_TOKEN not set')
  }

  if (pollers.length === 0) {
    console.log('[scheduler] no pollers registered (no API keys configured)')
    return
  }

  console.log(`[scheduler] registering ${pollers.length} poller(s): ${pollers.map((p) => p.name).join(', ')}`)

  for (const p of pollers) {
    POLLER_REGISTRY.set(p.name, { run: p.run, intervalMs: p.intervalMs })

    if (isPollerPaused(p.name)) {
      console.log(`[${p.name}] skipped — paused`)
      continue
    }

    const runSafe = buildRunSafe(p.name, p.run)

    // Check when this poller last ran. If within its interval, skip the
    // immediate first run and just schedule the next one at the right time.
    const lastRun = getLastRun(p.name)
    const elapsed = Date.now() - lastRun
    const remaining = p.intervalMs - elapsed

    if (remaining > 0 && lastRun > 0) {
      const hours = (remaining / 3600000).toFixed(1)
      console.log(`[${p.name}] last ran ${Math.round(elapsed / 3600000)}h ago — next run in ${hours}h`)
      const timeout = setTimeout(() => {
        runSafe()
        const interval = setInterval(runSafe, p.intervalMs)
        interval.unref()
        POLLER_TIMERS.set(p.name, { timeout: timeout as ReturnType<typeof setTimeout>, interval })
      }, remaining)
      POLLER_TIMERS.set(p.name, { timeout, interval: undefined as unknown as ReturnType<typeof setInterval> })
    } else {
      // Never ran or interval fully elapsed — stagger first run by 30s per poller index
      const idx = POLLER_REGISTRY.size - 1
      const delayMs = (idx + 1) * 30_000
      console.log(`[${p.name}] first run in ${delayMs / 1000}s, then every ${p.intervalMs / 3600000}h`)
      const timeout = setTimeout(() => {
        runSafe()
        const interval = setInterval(runSafe, p.intervalMs)
        interval.unref()
        POLLER_TIMERS.set(p.name, { timeout: timeout as ReturnType<typeof setTimeout>, interval })
      }, delayMs)
      POLLER_TIMERS.set(p.name, { timeout, interval: undefined as unknown as ReturnType<typeof setInterval> })
    }
  }
}
