import { runActorAndWait, listKvsKeys } from '../services/apify.ts'
import { listSignals, insertActivityFromPoller } from '../db/queries.ts'

// clockworks/tiktok-scraper (API uses ~ instead of /)
const ACTOR_ID = 'clockworks~tiktok-scraper'

// Actual Apify TikTok scraper output uses flat dot-notation keys for nested
// paths (e.g. "authorMeta.name", "videoMeta.duration") plus top-level fields.
// The `clean=true` dataset fetch may return either flat or nested forms, so
// the interface handles both.
interface TikTokVideo {
  id?: string
  text: string
  webVideoUrl: string
  playCount: number
  diggCount: number
  commentCount: number
  shareCount: number
  collectCount?: number
  createTimeISO: string
  // Nested form (from some output modes)
  authorMeta?: { name: string; nickName: string; avatar?: string }
  videoMeta?: { duration: number; coverUrl: string; height: number; width: number }
  // Flat dot-notation form (from dataset clean output)
  'authorMeta.name'?: string
  'authorMeta.nickName'?: string
  'authorMeta.avatar'?: string
  'videoMeta.duration'?: number
  'videoMeta.coverUrl'?: string
  mediaUrls?: string[]
}


function extractVideoId(video: TikTokVideo): string | null {
  if (video.id) return video.id
  const url = video.webVideoUrl
  if (!url) return null
  const m = url.match(/\/video\/(\d+)/)
  return m?.[1] ?? null
}

function getAuthorName(video: TikTokVideo): string {
  return video['authorMeta.name'] ?? video.authorMeta?.name ?? ''
}

function getCoverUrl(video: TikTokVideo): string {
  return video['videoMeta.coverUrl'] ?? video.videoMeta?.coverUrl ?? ''
}

function getDuration(video: TikTokVideo): number | null {
  return video['videoMeta.duration'] ?? video.videoMeta?.duration ?? null
}

export async function runTikTok(): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const signals = listSignals({ activeOnly: true, typeFilter: 'tiktok_account' })
  let fetched = 0
  let inserted = 0
  let skipped = 0

  for (const sig of signals) {
    try {
      const profileUrl = sig.target.startsWith('http')
        ? sig.target
        : `https://www.tiktok.com/@${sig.target.replace('@', '')}`

      const { items: results, keyValueStoreId } = await runActorAndWait<TikTokVideo>(ACTOR_ID, {
        profiles: [profileUrl],
        resultsPerPage: 20,
        shouldDownloadVideos: true,
        shouldDownloadCovers: true,
      })

      fetched += results.length

      for (const video of results) {
        const videoId = extractVideoId(video)
        if (!videoId) continue

        const caption = video.text?.split('\n')[0] || 'New TikTok video'
        const rawCoverUrl = getCoverUrl(video)
        const duration = getDuration(video)
        const handle = getAuthorName(video)

        // Resolve video/cover URLs from Apify key-value store.
        // The KVS key format is "video-{handle}-{timestamp}-{videoId}.mp4",
        // so we look up the actual key name from the KVS key list.
        // All KVS URLs must be proxied because they require Apify auth.
        let videoUrl: string | null = null
        let coverUrl: string | null = null

        if (keyValueStoreId) {
          const kvsKeys = await listKvsKeys(keyValueStoreId)
          for (const [key, rawUrl] of kvsKeys) {
            if (key.endsWith(`${videoId}.mp4`)) {
              videoUrl = `/proxy/media?url=${encodeURIComponent(rawUrl)}`
            }
            if (key.endsWith(`${videoId}.jpg`)) {
              coverUrl = `/proxy/media?url=${encodeURIComponent(rawUrl)}`
            }
          }
        }

        // Fall back to inline cover from dataset — route through proxy for caching
        if (!coverUrl && rawCoverUrl) coverUrl = `/proxy/media?url=${encodeURIComponent(rawCoverUrl)}`

        const didInsert = insertActivityFromPoller({
          signal_id: sig.id,
          activity_type: 'new_video',
          title: caption.slice(0, 200),
          preview: video.text?.slice(0, 300) || null,
          source_url: video.webVideoUrl || null,
          thumbnail_url: coverUrl,
          detected_at: video.createTimeISO || new Date().toISOString(),
          raw_payload_json: JSON.stringify({
            videoId,
            handle,
            caption: video.text,
            view_count: video.playCount,
            like_count: video.diggCount,
            comment_count: video.commentCount,
            share_count: video.shareCount,
            duration_sec: duration,
            cover_url: coverUrl,
            video_url: videoUrl,
            avatar_url: video['authorMeta.avatar'] ?? video.authorMeta?.avatar ?? null,
          }),
          dedup_key: `tt:${videoId}`,
        })

        if (didInsert) inserted++
        else skipped++
      }
    } catch (err) {
      console.error('[tiktok] error for', sig.target, ':', err instanceof Error ? err.message : err)
    }
  }

  return { fetched, inserted, skipped }
}
