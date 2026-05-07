import { runActorAndWait } from '../services/apify.ts'
import { listSignals, insertActivityFromPoller } from '../db/queries.ts'

// streamers/youtube-scraper (API uses ~ instead of /)
const ACTOR_ID = 'streamers~youtube-scraper'

interface YoutubeVideo {
  id: string
  title: string
  url: string
  description: string
  viewCount: number
  likeCount: number
  thumbnail: string
  durationSec: number
  publishDate: string
  channelName: string
}


export async function runYouTube(): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const signals = listSignals({ activeOnly: true, typeFilter: 'youtube_channel' })
  let fetched = 0
  let inserted = 0
  let skipped = 0

  for (const sig of signals) {
    try {
      // Build a valid YouTube channel URL from the signal target
      let channelUrl: string
      if (sig.target.startsWith('http')) {
        channelUrl = sig.target
      } else {
        const handle = sig.target.replace('@', '')
        channelUrl = `https://www.youtube.com/@${handle}`
      }

      const { items: results } = await runActorAndWait<YoutubeVideo>(ACTOR_ID, {
        startUrls: [{ url: channelUrl }],
        maxResults: 20,
      })

      fetched += results.length

      for (const video of results) {
        if (!video.id) continue

        // YouTube thumbnails are predictable — generate from video ID
        // if the scraper didn't return one. Route through proxy for caching.
        const rawThumb = video.thumbnail || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
        const thumbUrl = `/proxy/media?url=${encodeURIComponent(rawThumb)}`

        const didInsert = insertActivityFromPoller({
          signal_id: sig.id,
          activity_type: 'new_video',
          title: video.title?.slice(0, 200) || 'New YouTube video',
          preview: video.description?.slice(0, 300) || null,
          source_url: video.url || `https://www.youtube.com/watch?v=${video.id}`,
          thumbnail_url: thumbUrl,
          detected_at: video.publishDate || new Date().toISOString(),
          raw_payload_json: JSON.stringify({
            videoId: video.id,
            title: video.title,
            view_count: video.viewCount,
            like_count: video.likeCount,
            duration_sec: video.durationSec,
            channel_name: video.channelName,
            thumbnail_url: rawThumb,
          }),
          dedup_key: `yt:${video.id}`,
        })

        if (didInsert) inserted++
        else skipped++
      }
    } catch (err) {
      console.error('[youtube] error for', sig.target, ':', err instanceof Error ? err.message : err)
    }
  }

  return { fetched, inserted, skipped }
}
