import { Hono } from 'hono'
import { config } from '../config.ts'
import { existsSync, mkdirSync, createReadStream, createWriteStream, renameSync, writeFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { createHash } from 'node:crypto'

const THUMB_DIR = resolve(import.meta.dirname, '../../data/thumbnails')

function cachePath(url: string): string {
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 24)
  const ext = url.includes('.mp4') ? '.mp4' : '.jpg'
  return join(THUMB_DIR, `${hash}${ext}`)
}

export const proxyRoutes = new Hono()

// Proxy media files to the browser with local disk caching.
// Accepts Apify KVS URLs (adds auth header) and Instagram/TikTok
// CDN URLs (passes through). Responses are cached in data/thumbnails/
// so expired CDN URLs still serve from disk.
proxyRoutes.get('/proxy/media', async (c) => {
  const url = c.req.query('url')
  if (!url || !url.startsWith('https://')) {
    return c.text('Invalid URL', 400)
  }

  const cached = cachePath(url)

  // Serve from disk cache if available
  if (existsSync(cached)) {
    const isVideo = cached.endsWith('.mp4')
    const contentType = isVideo ? 'video/mp4' : 'image/jpeg'
    const stat = statSync(cached)

    // Support range requests for video playback
    if (isVideo) {
      const range = c.req.header('Range')
      if (range) {
        const match = range.match(/bytes=(\d+)-(\d*)/)
        if (match) {
          const start = parseInt(match[1]!, 10)
          const end = match[2] ? parseInt(match[2], 10) : stat.size - 1
          const chunkSize = end - start + 1
          return new Response(createReadStream(cached, { start, end }), {
            status: 206,
            headers: {
              'Content-Type': contentType,
              'Content-Range': `bytes ${start}-${end}/${stat.size}`,
              'Content-Length': String(chunkSize),
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'public, max-age=86400',
            },
          })
        }
      }
      // Full video request (no range)
      return new Response(createReadStream(cached), {
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(stat.size),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }

    // Images — simple response
    return new Response(createReadStream(cached), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  }

  const isApifyKvs = url.startsWith('https://api.apify.com/v2/key-value-stores/')
  const headers: Record<string, string> = {}
  if (isApifyKvs && config.apify.apiToken) {
    headers['Authorization'] = `Bearer ${config.apify.apiToken}`
  }

  try {
    const res = await fetch(url, { headers })

    if (!res.ok) {
      return c.text(`Upstream returned ${res.status}`, res.status as 401 | 403 | 404 | 500)
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream'

    // For videos: stream directly to browser + cache to disk in parallel
    if (contentType.startsWith('video/') && res.body) {
      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []
      const stream = new ReadableStream({
        async pull(controller) {
          const { done, value } = await reader.read()
          if (done) {
            controller.close()
            // Cache to disk now that all chunks are collected
            try {
              const total = chunks.reduce((n, c) => n + c.length, 0)
              const buf = new Uint8Array(total)
              let off = 0
              for (const c of chunks) { buf.set(c, off); off += c.length }
              mkdirSync(THUMB_DIR, { recursive: true })
              writeFileSync(cached, buf)
            } catch {}
            return
          }
          chunks.push(value)
          controller.enqueue(value)
        },
      })
      return new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      })
    }

    // For images: buffer fully (small), cache, respond
    const buffer = await res.arrayBuffer()
    if (contentType.startsWith('image/')) {
      try {
        mkdirSync(THUMB_DIR, { recursive: true })
        writeFileSync(cached, Buffer.from(buffer))
      } catch { /* ignore cache write errors */ }
    }

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch (err) {
    return c.text('Proxy error', 500)
  }
})
