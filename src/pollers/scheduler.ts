import { config } from '../config.ts'
import { runSerper } from './serper.ts'
import { runZenrows } from './zenrows.ts'
import { runSerpStat } from './serpstat.ts'
import { runYouTube } from './youtube.ts'
import { runTikTok } from './tiktok.ts'
import { runGoogleAds } from './google-ads.ts'
import { runMetaAds } from './meta-ads.ts'
import { runInstagram } from './instagram.ts'
import { getSetting, setSetting } from '../db/settings.ts'

interface Poller {
  name: string
  run: () => Promise<{ fetched: number; inserted: number; skipped: number; baseline?: number }>
  intervalMs: number
}

function lastRunKey(name: string): string {
  return `poller_last_run:${name}`
}

function getLastRun(name: string): number {
  const ts = getSetting<string>(lastRunKey(name))
  return ts ? new Date(ts).getTime() : 0
}

function setLastRun(name: string): void {
  setSetting(lastRunKey(name), new Date().toISOString())
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

  for (let i = 0; i < pollers.length; i++) {
    const p = pollers[i]!
    const runSafe = async () => {
      try {
        const result = await p.run()
        const extra = 'baseline' in result && result.baseline ? ` baseline=${result.baseline}` : ''
        console.log(`[${p.name}] fetched=${result.fetched} inserted=${result.inserted} skipped=${result.skipped}${extra}`)
        setLastRun(p.name)
      } catch (err) {
        console.error(`[${p.name}] error:`, err instanceof Error ? err.message : err)
      }
    }

    // Check when this poller last ran. If within its interval, skip the
    // immediate first run and just schedule the next one at the right time.
    const lastRun = getLastRun(p.name)
    const elapsed = Date.now() - lastRun
    const remaining = p.intervalMs - elapsed

    if (remaining > 0 && lastRun > 0) {
      // Ran recently — schedule next run at the remaining time
      const hours = (remaining / 3600000).toFixed(1)
      console.log(`[${p.name}] last ran ${Math.round(elapsed / 3600000)}h ago — next run in ${hours}h`)
      setTimeout(() => {
        runSafe()
        setInterval(runSafe, p.intervalMs).unref()
      }, remaining)
    } else {
      // Never ran or interval fully elapsed — stagger first run by 30s per poller
      const delayMs = (i + 1) * 30_000
      console.log(`[${p.name}] first run in ${delayMs / 1000}s, then every ${p.intervalMs / 3600000}h`)
      setTimeout(() => {
        runSafe()
        setInterval(runSafe, p.intervalMs).unref()
      }, delayMs)
    }
  }
}
