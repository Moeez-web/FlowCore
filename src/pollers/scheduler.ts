import { config } from '../config.ts'
import { runSerper } from './serper.ts'
import { runFirecrawl } from './firecrawl.ts'
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

export const POLLER_REGISTRY: Map<string, { run: Poller['run']; intervalMs: number }> = new Map()

const SIGNAL_TYPE_TO_POLLERS: Record<string, string[]> = {
  website:           ['firecrawl', 'serper'],
  instagram_account: ['instagram'],
  tiktok_account:    ['tiktok'],
  youtube_channel:   ['youtube'],
  meta_ads:          ['meta-ads'],
  google_ads:        ['google-ads'],
}

export async function runPollersForSignalType(signalType: string): Promise<void> {
  const pollerNames = SIGNAL_TYPE_TO_POLLERS[signalType]
  if (!pollerNames) return
  for (const name of pollerNames) {
    const entry = POLLER_REGISTRY.get(name)
    if (!entry) continue
    try {
      await entry.run()
    } catch (err) {
      console.error(`[${name}] error:`, err instanceof Error ? err.message : String(err))
    }
  }
}

function pausedKey(name: string): string {
  return `poller_paused:${name}`
}

export function isPollerPaused(name: string): boolean {
  return getSetting<boolean>(pausedKey(name)) === true
}

export function pausePoller(name: string): boolean {
  const entry = POLLER_REGISTRY.get(name)
  if (!entry) return false
  setSetting(pausedKey(name), true)
  console.log(`[${name}] paused`)
  return true
}

export function resumePoller(name: string): boolean {
  const entry = POLLER_REGISTRY.get(name)
  if (!entry) return false
  clearSetting(pausedKey(name))
  console.log(`[${name}] resumed`)
  return true
}

// Register pollers into the registry (no timers — triggered via /api/cron/* endpoints)
export function registerPollers(): void {
  const pollers: Poller[] = []

  if (config.firecrawl.apiKey) {
    pollers.push({ name: 'firecrawl', run: runFirecrawl, intervalMs: config.pollers.firecrawlIntervalMs })
  }
  if (config.serper.apiKey) {
    pollers.push({ name: 'serper', run: runSerper, intervalMs: config.pollers.serperIntervalMs })
  }
  if (config.serpstat.apiToken) {
    pollers.push({ name: 'serpstat', run: runSerpStat, intervalMs: config.pollers.serpstatIntervalMs })
  }
  if (config.apify.apiToken) {
    pollers.push({ name: 'youtube', run: runYouTube, intervalMs: config.pollers.youtubeIntervalMs })
    pollers.push({ name: 'tiktok', run: runTikTok, intervalMs: config.pollers.tiktokIntervalMs })
    pollers.push({ name: 'google-ads', run: runGoogleAds, intervalMs: config.pollers.googleAdsIntervalMs })
    pollers.push({ name: 'meta-ads', run: runMetaAds, intervalMs: config.pollers.metaAdsIntervalMs })
    pollers.push({ name: 'instagram', run: runInstagram, intervalMs: config.pollers.instagramIntervalMs })
  }

  for (const p of pollers) {
    POLLER_REGISTRY.set(p.name, { run: p.run, intervalMs: p.intervalMs })
  }

  if (pollers.length > 0) {
    console.log(`[scheduler] registered ${pollers.length} poller(s): ${pollers.map((p) => p.name).join(', ')}`)
  }
}
