import { createHash } from 'node:crypto'
import { config } from '../config.ts'
import { listSignals, insertActivityFromPoller } from '../db/queries.ts'
import { getSetting, setSetting } from '../db/settings.ts'

const ENDPOINT = 'https://api.zenrows.com/v1/'
const TIMEOUT_MS = config.zenrows.timeoutMs

export class ZenRowsError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'ZenRowsError'
  }
}

interface PageSnapshot {
  htmlHash: string
  links: string[]
  timestamp: string
}

async function fetchPage(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  const params = new URLSearchParams({
    url,
    apikey: config.zenrows.apiKey,
    js_render: 'true',
    premium_proxy: 'true',
    original_status: 'true',
  })

  try {
    const res = await fetch(`${ENDPOINT}?${params}`, { signal: controller.signal })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new ZenRowsError(`ZenRows HTTP ${res.status} for ${url}: ${detail.slice(0, 300)}`)
    }
    return await res.text()
  } catch (err) {
    if (err instanceof ZenRowsError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ZenRowsError(`ZenRows request timed out for ${url}`, err)
    }
    throw new ZenRowsError(`ZenRows request failed for ${url}: ${(err as Error).message}`, err)
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

const SKIP_PATH_PATTERNS = [
  /\/images\//i, /\/img\//i, /\/assets\//i, /\/static\//i,
  /\/favicon/i, /\/fonts\//i, /\/_next\/image/i, /\/_next\/static/i,
  /\/wp-content\/uploads\//i, /\/cdn-cgi\//i,
]

function extractLinks(html: string, baseDomain: string): string[] {
  const links: string[] = []
  const re = /href=["'](\/[^"']*)["']/gi
  let match: RegExpExecArray | null
  while ((match = re.exec(html)) !== null) {
    const path = match[1]!
    // Skip protocol-relative (//cdn.example.com/...), hash-only, and short paths
    if (path.startsWith('//') || path.startsWith('/#') || path.length <= 5) continue
    // Skip known static-asset path segments
    if (SKIP_PATH_PATTERNS.some((p) => p.test(path))) continue
    // Strip hash and query before checking extension
    const clean = path.split('#')[0]!.split('?')[0]!
    const ext = clean.split('.').pop()?.toLowerCase()
    if (ext && SKIP_EXTENSIONS.has(ext)) continue
    // Skip image optimizer / CDN query params
    if (/[?&](fmt|w=|q=|width|height|quality|crop|url=)=/i.test(path)) continue
    links.push(`https://${baseDomain}${path}`)
  }
  return [...new Set(links)]
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match ? match[1]!.trim() : ''
}

function extractMetaDescription(html: string): string {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
  return match ? match[1]!.trim() : ''
}

function extractOgImage(html: string): string | null {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
  return match ? match[1]!.trim() : null
}

function extractFirstParagraph(html: string): string {
  const match = html.match(/<p[^>]*>([^<]+)<\/p>/i)
  if (!match) return ''
  const text = match[1]!.trim()
  return text.length > 300 ? text.slice(0, 297) + '...' : text
}

function contentHash(html: string): string {
  return createHash('sha256').update(html).digest('hex').slice(0, 16)
}

function getSnapshotKey(signalId: number): string {
  return `zenrows_snapshot:${signalId}`
}

function getSnapshot(signalId: number): PageSnapshot | null {
  return getSetting<PageSnapshot>(getSnapshotKey(signalId))
}

function saveSnapshot(signalId: number, snapshot: PageSnapshot): void {
  setSetting(getSnapshotKey(signalId), snapshot)
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

export async function runZenrows(): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const websiteSignals = listSignals({ activeOnly: true, typeFilter: 'website' })

  let fetched = 0
  let inserted = 0
  let skipped = 0

  for (const sig of websiteSignals) {
    const domain = sig.target.replace(/^www\./, '')
    const homepageUrl = `https://${domain}/`

    try {
      // Fetch homepage
      const homepageHtml = await fetchPage(homepageUrl)
      fetched++

      const currentLinks = extractLinks(homepageHtml, domain)
      const currentHash = contentHash(homepageHtml)
      const prevSnapshot = getSnapshot(sig.id)

      // Detect new pages (links in current but not in previous snapshot)
      const prevLinks = prevSnapshot?.links ?? []
      const newLinks = currentLinks.filter((l) => !prevLinks.includes(l))

      // Fetch each new page and create an activity
      for (const pageUrl of newLinks.slice(0, 15)) {
        try {
          const pageHtml = await fetchPage(pageUrl)
          fetched++

          const title = extractTitle(pageHtml) || slugify(pageUrl)
          const preview = extractMetaDescription(pageHtml) || extractFirstParagraph(pageHtml) || null
          const heroImage = extractOgImage(pageHtml)
          const slug = slugify(pageUrl)
          const pageType = classifyPage(pageUrl)
          const wordCount = pageHtml.length // rough proxy

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
              content_hash: contentHash(pageHtml),
              first_paragraph: extractFirstParagraph(pageHtml),
              hero_image_url: heroImage,
            }),
            dedup_key: pageUrl,
          })

          if (didInsert) inserted++
          else skipped++
        } catch (err) {
          console.error(`[zenrows] failed to fetch ${pageUrl}:`, err instanceof Error ? err.message : err)
        }
      }

      // Detect homepage content changes
      if (prevSnapshot && prevSnapshot.htmlHash !== currentHash) {
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
            prev_hash: prevSnapshot.htmlHash,
            new_hash: currentHash,
          }),
          dedup_key: `update:${homepageUrl}:${currentHash}`,
        })

        if (didInsert) inserted++
        else skipped++
      }

      // Save new snapshot
      saveSnapshot(sig.id, {
        htmlHash: currentHash,
        links: currentLinks,
        timestamp: new Date().toISOString(),
      })

    } catch (err) {
      console.error(`[zenrows] failed for ${domain}:`, err instanceof Error ? err.message : err)
    }
  }

  return { fetched, inserted, skipped }
}
