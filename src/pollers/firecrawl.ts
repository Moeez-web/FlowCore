import { createHash } from 'node:crypto'
import { config } from '../config.ts'
import { listSignals, insertActivityFromPoller } from '../db/queries.ts'
import { getSetting, setSetting, clearSetting } from '../db/settings.ts'

const ENDPOINT = 'https://api.firecrawl.dev/v2/scrape'
const TIMEOUT_MS = config.firecrawl.timeoutMs
const REQUEST_DELAY_MS = 1_500

export class FirecrawlError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'FirecrawlError'
  }
}

interface FirecrawlScrapeResponse {
  success: boolean
  data: {
    markdown?: string
    html?: string
    links?: string[]
    metadata?: {
      title?: string
      description?: string
      sourceURL?: string
      ogImage?: string
    }
  }
}

interface PageSnapshot {
  markdownHash: string
  links: string[]
  timestamp: string
}

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchPage(url: string): Promise<FirecrawlScrapeResponse> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${config.firecrawl.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html', 'links'],
        onlyMainContent: true,
        timeout: 60000,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new FirecrawlError(`Firecrawl HTTP ${res.status} for ${url}: ${detail.slice(0, 300)}`)
    }
    const data = (await res.json()) as FirecrawlScrapeResponse
    if (!data.success) {
      throw new FirecrawlError(`Firecrawl scrape failed for ${url}`)
    }
    return data
  } catch (err) {
    if (err instanceof FirecrawlError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new FirecrawlError(`Firecrawl request timed out for ${url}`, err)
    }
    throw new FirecrawlError(`Firecrawl request failed for ${url}: ${(err as Error).message}`, err)
  } finally {
    clearTimeout(timer)
  }
}

const SKIP_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico',
  'css', 'js', 'woff', 'woff2', 'ttf', 'eot', 'otf',
  'pdf', 'zip', 'mp4', 'mp3', 'avi', 'mov',
  'webmanifest', 'json', 'xml', 'txt', 'map',
])

function filterLinks(links: string[], baseDomain: string): string[] {
  return links.filter((link) => {
    try {
      const url = new URL(link)
      if (url.hostname.replace(/^www\./, '') !== baseDomain) return false
      if (url.pathname === '/' || url.pathname.length <= 1) return false
      const clean = url.pathname.split('#')[0]!.split('?')[0]!
      const ext = clean.split('.').pop()?.toLowerCase()
      if (ext && SKIP_EXTENSIONS.has(ext)) return false
      return true
    } catch {
      return false
    }
  })
}

function extractFirstParagraphFromMarkdown(markdown: string): string {
  const lines = markdown.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---') || trimmed.startsWith('|')) continue
    return trimmed.length > 300 ? trimmed.slice(0, 297) + '...' : trimmed
  }
  return ''
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function contentHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

function getSnapshotKey(signalId: number): string {
  return `firecrawl_snapshot:${signalId}`
}

function getSnapshot(signalId: number): PageSnapshot | null {
  return getSetting<PageSnapshot>(getSnapshotKey(signalId))
}

function saveSnapshot(signalId: number, snapshot: PageSnapshot): void {
  setSetting(getSnapshotKey(signalId), snapshot)
}

function getSnapshotWithMigration(signalId: number): PageSnapshot | null {
  const existing = getSnapshot(signalId)
  if (existing) return existing

  const legacyKey = `zenrows_snapshot:${signalId}`
  const legacy = getSetting<{ htmlHash: string; links: string[]; timestamp: string }>(legacyKey)
  if (legacy) {
    const migrated: PageSnapshot = {
      markdownHash: '',
      links: legacy.links,
      timestamp: legacy.timestamp,
    }
    saveSnapshot(signalId, migrated)
    clearSetting(legacyKey)
    return migrated
  }
  return null
}

function slugify(url: string): string {
  try {
    const path = new URL(url).pathname
    return path.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 80)
  } catch {
    return url.slice(0, 80)
  }
}

function classifyPage(url: string): 'blog' | 'landing' {
  const path = url.toLowerCase()
  if (path.includes('/blog') || path.includes('/news') || path.includes('/article')) return 'blog'
  return 'landing'
}

export async function runFirecrawl(): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const websiteSignals = listSignals({ activeOnly: true, typeFilter: 'website' })

  let fetched = 0
  let inserted = 0
  let skipped = 0

  for (const sig of websiteSignals) {
    const domain = sig.target.replace(/^www\./, '')
    const homepageUrl = `https://${domain}/`

    try {
      const homepageResponse = await fetchPage(homepageUrl)
      fetched++

      const homepageMarkdown = homepageResponse.data.markdown ?? ''
      const homepageLinks = filterLinks(homepageResponse.data.links ?? [], domain)
      const currentHash = contentHash(homepageMarkdown)
      const prevSnapshot = getSnapshotWithMigration(sig.id)

      const prevLinks = prevSnapshot?.links ?? []
      const newLinks = homepageLinks.filter((l) => !prevLinks.includes(l))

      for (const pageUrl of newLinks.slice(0, 15)) {
        try {
          await delay(REQUEST_DELAY_MS)
          const pageResponse = await fetchPage(pageUrl)
          fetched++

          const pageMarkdown = pageResponse.data.markdown ?? ''
          const metadata = pageResponse.data.metadata ?? {}
          const title = metadata.title || slugify(pageUrl)
          const preview = metadata.description || extractFirstParagraphFromMarkdown(pageMarkdown) || null
          const heroImage = metadata.ogImage ?? null
          const slug = slugify(pageUrl)
          const pageType = classifyPage(pageUrl)
          const wordCount = countWords(pageMarkdown)

          const didInsert = insertActivityFromPoller({
            signal_id: sig.id,
            activity_type: pageType === 'blog' ? 'new_blog_post' : 'new_landing_page',
            title,
            preview: preview ? `New ${pageType} on ${(sig.tags[0] ?? domain)}: ${preview.slice(0, 100)}` : null,
            source_url: pageUrl,
            thumbnail_url: heroImage,
            detected_at: new Date().toISOString(),
            raw_payload_json: JSON.stringify({
              url: pageUrl,
              slug,
              word_count: wordCount,
              content_hash: contentHash(pageMarkdown),
              first_paragraph: extractFirstParagraphFromMarkdown(pageMarkdown),
              hero_image_url: heroImage,
            }),
            dedup_key: pageUrl,
          })

          if (didInsert) inserted++
          else skipped++
        } catch (err) {
          console.error(`[firecrawl] failed to fetch ${pageUrl}:`, err instanceof Error ? err.message : err)
        }
      }

      if (prevSnapshot && prevSnapshot.markdownHash !== '' && prevSnapshot.markdownHash !== currentHash) {
        const didInsert = insertActivityFromPoller({
          signal_id: sig.id,
          activity_type: 'page_updated',
          title: `Homepage updated — ${sig.tags[0] ?? domain}`,
          preview: 'Content or structure changed since last check',
          source_url: homepageUrl,
          thumbnail_url: null,
          detected_at: new Date().toISOString(),
          raw_payload_json: JSON.stringify({
            url: homepageUrl,
            change_type: 'content',
            prev_hash: prevSnapshot.markdownHash,
            new_hash: currentHash,
          }),
          dedup_key: `update:${homepageUrl}:${currentHash}`,
        })

        if (didInsert) inserted++
        else skipped++
      }

      saveSnapshot(sig.id, {
        markdownHash: currentHash,
        links: homepageLinks,
        timestamp: new Date().toISOString(),
      })

    } catch (err) {
      console.error(`[firecrawl] failed for ${domain}:`, err instanceof Error ? err.message : err)
    }
  }

  return { fetched, inserted, skipped }
}
