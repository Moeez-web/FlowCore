import { config } from '../config.ts'
import { listSignals, insertActivityFromPoller, listKeywords } from '../db/queries.ts'
import { getSetting, setSetting } from '../db/settings.ts'

const ENDPOINT = 'https://google.serper.dev/search'
const TIMEOUT_MS = config.serper.timeoutMs

export const DEFAULT_KEYWORDS = [
  // ── Water well drilling & service ──
  'water well drilling fort worth',
  'well drilling cost north texas',
  'water well drilling dallas tx',
  'well pump repair near me dfw',
  'well pump replacement denton tx',
  'water well service weatherford tx',
  'residential water well drilling texas',
  'water well inspection dfw',
  'well pump installation keller tx',
  'water well repair near me',

  // ── Plumbing — emergency & high-intent ──
  'emergency plumber fort worth',
  '24 hour plumber dallas tx',
  'emergency plumber near me dfw',
  'burst pipe repair fort worth',
  'sewer backup plumber dallas',

  // ── Water heaters ──
  'tankless water heater installation dfw',
  'water heater replacement fort worth',
  'water heater repair denton tx',
  'tankless water heater repair near me',
  'gas water heater installation keller',

  // ── Leak detection & repair ──
  'slab leak detection fort worth',
  'slab leak repair dallas tx',
  'water leak detection near me dfw',
  'foundation leak repair southlake',

  // ── Sewer & drain ──
  'sewer line repair southlake',
  'drain cleaning fort worth tx',
  'sewer line replacement dallas',
  'clogged drain repair near me dfw',
  'hydro jetting dallas fort worth',

  // ── Water treatment ──
  'water filtration system dfw',
  'water softener installation keller',
  'reverse osmosis system fort worth',
  'whole house water filter dallas tx',

  // ── Repipe & gas line ──
  'whole home repipe fort worth',
  'gas line repair dallas tx',
  'gas line installation near me dfw',
  'copper repipe specialist dallas',

  // ── General plumbing by city ──
  'plumber fort worth tx',
  'plumber dallas tx',
  'plumber keller tx',
  'plumber southlake tx',
  'plumber weatherford tx',
  'best plumber in dfw',
]

export class SerperError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'SerperError'
  }
}

interface SerperOrganicResult {
  position: number
  title: string
  link: string
  snippet: string
}

interface SerperResponse {
  organic?: SerperOrganicResult[]
}

async function searchKeyword(keyword: string): Promise<SerperOrganicResult[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'X-API-KEY': config.serper.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: keyword, gl: 'us', hl: 'en', num: 20 }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new SerperError(`Serper HTTP ${res.status}: ${detail.slice(0, 300)}`)
    }
    const data = (await res.json()) as SerperResponse
    return data.organic ?? []
  } catch (err) {
    if (err instanceof SerperError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new SerperError('Serper request timed out', err)
    }
    throw new SerperError(`Serper request failed: ${(err as Error).message}`, err)
  } finally {
    clearTimeout(timer)
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function getTrackedKeywords(): string[] {
  const fromDb = listKeywords()
  if (fromDb.length > 0) return fromDb
  return DEFAULT_KEYWORDS
}

type PositionMap = Record<string, number>

function getStoredPositions(keyword: string): PositionMap {
  return getSetting<PositionMap>(`serper_positions:${keyword}`) ?? {}
}

function setStoredPositions(keyword: string, positions: PositionMap): void {
  setSetting(`serper_positions:${keyword}`, positions)
}

export async function runSerper(): Promise<{ fetched: number; inserted: number; skipped: number; baseline: number }> {
  const keywords = getTrackedKeywords()
  const websiteSignals = listSignals({ activeOnly: true, typeFilter: 'website' })

  // Build domain → signal lookup
  const domainToSignal = new Map<string, { id: number; target: string; tags: string[] }>()
  for (const sig of websiteSignals) {
    domainToSignal.set(sig.target.replace(/^www\./, ''), { id: sig.id, target: sig.target, tags: sig.tags })
  }

  let fetched = 0
  let inserted = 0
  let skipped = 0
  let baseline = 0 // First-run: positions recorded but no activity yet
  const today = new Date().toISOString().slice(0, 10)

  for (const keyword of keywords) {
    try {
      const results = await searchKeyword(keyword)
      fetched++

      const prevPositions = getStoredPositions(keyword)
      const isFirstRun = Object.keys(prevPositions).length === 0
      const newPositions: PositionMap = {}
      const matchedDomains: string[] = []

      for (const result of results) {
        const domain = extractDomain(result.link)
        if (!domain) continue

        const signal = domainToSignal.get(domain)
        if (!signal) continue

        newPositions[domain] = result.position
        matchedDomains.push(`${domain}=#${result.position}`)

        const prevPos = prevPositions[domain]
        if (prevPos == null) {
          // First time seeing this domain for this keyword — record baseline, no activity
          baseline++
          continue
        }

        if (result.position === prevPos) {
          skipped++
          continue
        }

        const delta = prevPos - result.position // positive = moved up

        // Skip noise — only track rank shifts of 3+ positions
        if (Math.abs(delta) < 3) {
          skipped++
          continue
        }
        const activityType = delta > 0 ? 'keyword_rank_gain' : 'keyword_rank_loss'
        const dedupKey = `seo:${keyword}:${domain}:${today}`

        const didInsert = insertActivityFromPoller({
          signal_id: signal.id,
          activity_type: activityType,
          title: delta > 0
            ? `Gained ${delta} positions: "${keyword}" (${prevPos}→${result.position})`
            : `Lost ${Math.abs(delta)} positions: "${keyword}" (${prevPos}→${result.position})`,
          preview: 'Tracked keyword shift on Google',
          source_url: `https://www.google.com/search?q=${encodeURIComponent(keyword)}`,
          thumbnail_url: null,
          detected_at: new Date().toISOString(),
          raw_payload_json: JSON.stringify({
            keyword,
            prev_position: prevPos,
            new_position: result.position,
            delta,
            serp_title: result.title,
            serp_url: result.link,
          }),
          dedup_key: dedupKey,
        })

        if (didInsert) inserted++
        else skipped++
      }

      if (matchedDomains.length > 0) {
        console.log(`[serper] "${keyword}" → ${matchedDomains.join(', ')}`)
      }

      setStoredPositions(keyword, newPositions)

      if (isFirstRun && matchedDomains.length > 0) {
        console.log(`[serper] baseline recorded for "${keyword}" — next run will detect changes`)
      }
    } catch (err) {
      console.error(`[serper] keyword "${keyword}" failed:`, err instanceof Error ? err.message : err)
    }
  }

  if (baseline > 0) {
    console.log(`[serper] first run: ${baseline} baseline positions recorded. Next poll will detect rank changes.`)
  }

  return { fetched, inserted, skipped, baseline }
}
