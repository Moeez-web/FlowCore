import { config } from '../config.ts'
import { listSignals, insertActivityFromPoller } from '../db/queries.ts'
import { getSetting, setSetting } from '../db/settings.ts'

const ENDPOINT = 'https://api.serpstat.com/v4'
const TIMEOUT_MS = config.serpstat.timeoutMs

export class SerpStatError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'SerpStatError'
  }
}

interface SerpStatResponse<T> {
  id: string
  result?: {
    data: T[]
    summary_info: {
      page: number
      count: number
      total: number
      left_lines: number
    }
  }
  error?: {
    code: number
    message: string
  }
}

interface SerpStatBacklink {
  url_from: string
  url_to: string
  link_text: string
  nofollow: string
  link_type: string
  links_ext: number
  first_seen: string
  last_visited: string
  domain_rank: string
}

interface SerpStatLostBacklink {
  url_from: string
  url_to: string
  anchor: string
  domain_rank: string
  lost_date: string
}

async function serpStatRequest<T>(method: string, params: Record<string, unknown>): Promise<T[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const url = `${ENDPOINT}/?token=${config.serpstat.apiToken}`
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: '1',
        method,
        params,
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new SerpStatError(`SerpStat HTTP ${res.status}: ${detail.slice(0, 300)}`)
    }

    const data = (await res.json()) as SerpStatResponse<T>

    if (data.error) {
      throw new SerpStatError(`SerpStat API error ${data.error.code}: ${data.error.message}`)
    }

    return data.result?.data ?? []
  } catch (err) {
    if (err instanceof SerpStatError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new SerpStatError('SerpStat request timed out', err)
    }
    throw new SerpStatError(`SerpStat request failed: ${(err as Error).message}`, err)
  } finally {
    clearTimeout(timer)
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

interface StoredBacklink {
  sourceDomain: string
  sourcePage: string
  anchorText: string
  sourceSdr: number
  targetUrl: string
}

function getStoredBacklinks(domain: string): StoredBacklink[] {
  return getSetting<StoredBacklink[]>(`serpstat_backlinks:${domain}`) ?? []
}

function setStoredBacklinks(domain: string, backlinks: StoredBacklink[]): void {
  setSetting(`serpstat_backlinks:${domain}`, backlinks)
}

// Minimum Serpstat Domain Rank to track — filters out low-authority links.
const MIN_SDR = 50
// Delay between domain requests to avoid rate limits (seconds)
const DELAY_BETWEEN_DOMAINS_MS = 3_000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function runSerpStat(): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const websiteSignals = listSignals({ activeOnly: true, typeFilter: 'website' })

  let fetched = 0
  let inserted = 0
  let skipped = 0
  const today = new Date().toISOString().slice(0, 10)

  for (let i = 0; i < websiteSignals.length; i++) {
    const signal = websiteSignals[i]!
    const domain = signal.target.replace(/^www\./, '')
    if (!domain) continue

    // Delay between domains to respect rate limits
    if (i > 0) await sleep(DELAY_BETWEEN_DOMAINS_MS)

    try {
      const prevBacklinks = getStoredBacklinks(domain)
      const prevKeySet = new Set(prevBacklinks.map((b) => `${b.sourceDomain}|${b.targetUrl}`))

      // Fetch active backlinks from SerpStat (with retry on rate limit)
      let activeResults: SerpStatBacklink[] = []
      let retries = 0
      while (retries < 3) {
        try {
          activeResults = await serpStatRequest<SerpStatBacklink>(
            'SerpstatBacklinksProcedure.getNewBacklinks',
            {
              query: domain,
              searchType: 'domain',
              sort: 'domain_rank',
              order: 'desc',
              page: 1,
              size: 100,
              linkPerDomain: 1,
            },
          )
          break
        } catch (err) {
          if (err instanceof SerpStatError && err.message.includes('-32429')) {
            retries++
            const waitMs = retries * 5_000
            console.log(`[serpstat] ${domain} rate limited, retry ${retries}/3 in ${waitMs / 1000}s`)
            await sleep(waitMs)
          } else {
            throw err
          }
        }
      }
      if (retries >= 3) {
        console.error(`[serpstat] ${domain} failed after 3 retries (rate limit)`)
        continue
      }
      fetched += activeResults.length

      const current: StoredBacklink[] = activeResults.map((r) => ({
        sourceDomain: extractDomain(r.url_from),
        sourcePage: r.url_from ?? '',
        anchorText: r.link_text ?? '',
        sourceSdr: Number(r.domain_rank) || 0,
        targetUrl: r.url_to ?? '',
      })).filter((b) => b.sourceDomain.length > 0 && b.sourceSdr >= MIN_SDR)

      const currentKeySet = new Set(current.map((b) => `${b.sourceDomain}|${b.targetUrl}`))

      // Detect new backlinks and anchor text changes
      for (const bl of current) {
        const key = `${bl.sourceDomain}|${bl.targetUrl}`
        if (!prevKeySet.has(key)) {
          const dedupKey = `serpstat:backlink_acquired:${domain}:${bl.sourceDomain}:${today}`
          const didInsert = insertActivityFromPoller({
            signal_id: signal.id,
            activity_type: 'backlink_acquired',
            title: `New backlink from ${bl.sourceDomain} (SDR ${bl.sourceSdr})`,
            preview: `Anchor: "${bl.anchorText}"`,
            source_url: bl.targetUrl,
            thumbnail_url: null,
            detected_at: new Date().toISOString(),
            raw_payload_json: JSON.stringify({
                source_domain: bl.sourceDomain,
                source_page: bl.sourcePage,
                targetDomain: domain,
                anchor_text: bl.anchorText,
                source_da: bl.sourceSdr,
                target_url: bl.targetUrl,
              }),
            dedup_key: dedupKey,
          })
          if (didInsert) inserted++
          else skipped++
        } else {
          const prevBl = prevBacklinks.find((b) => `${b.sourceDomain}|${b.targetUrl}` === key)
          if (prevBl && prevBl.anchorText !== bl.anchorText) {
            const dedupKey = `serpstat:anchor_changed:${domain}:${bl.sourceDomain}:${today}`
            const didInsert = insertActivityFromPoller({
              signal_id: signal.id,
              activity_type: 'anchor_text_changed',
              title: `Anchor changed on ${bl.sourceDomain} (SDR ${bl.sourceSdr})`,
              preview: `"${prevBl.anchorText}" → "${bl.anchorText}"`,
              source_url: bl.targetUrl,
              thumbnail_url: null,
              detected_at: new Date().toISOString(),
              raw_payload_json: JSON.stringify({
                source_domain: bl.sourceDomain,
                source_page: bl.sourcePage,
                targetDomain: domain,
                anchor_text: bl.anchorText,
                source_da: bl.sourceSdr,
                target_url: bl.targetUrl,
              }),
              dedup_key: dedupKey,
            })
            if (didInsert) inserted++
            else skipped++
          } else {
            skipped++
          }
        }
      }

      // Detect lost backlinks
      for (const prev of prevBacklinks) {
        const key = `${prev.sourceDomain}|${prev.targetUrl}`
        if (!currentKeySet.has(key)) {
          const dedupKey = `serpstat:backlink_lost:${domain}:${prev.sourceDomain}:${today}`
          const didInsert = insertActivityFromPoller({
            signal_id: signal.id,
            activity_type: 'backlink_lost',
            title: `Lost backlink from ${prev.sourceDomain} (SDR ${prev.sourceSdr})`,
            preview: `Was anchored: "${prev.anchorText}"`,
            source_url: prev.targetUrl,
            thumbnail_url: null,
            detected_at: new Date().toISOString(),
            raw_payload_json: JSON.stringify({
              source_domain: prev.sourceDomain,
              source_page: prev.sourcePage,
              targetDomain: domain,
              anchor_text: prev.anchorText,
              source_da: prev.sourceSdr,
              target_url: prev.targetUrl,
            }),
            dedup_key: dedupKey,
          })
          if (didInsert) inserted++
          else skipped++
        }
      }

      setStoredBacklinks(domain, current)
      console.log(`[serpstat] ${domain}: ${activeResults.length} backlinks fetched, ${inserted} new, ${skipped} skipped`)
    } catch (err) {
      console.error(`[serpstat] ${domain} failed:`, err instanceof Error ? err.message : err)
    }
  }

  return { fetched, inserted, skipped }
}
