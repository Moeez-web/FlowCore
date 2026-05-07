import { runActorAndWait } from '../services/apify.ts'
import { listSignals, insertActivityFromPoller } from '../db/queries.ts'

// apify/instagram-post-scraper — scrapes all post types (Image, Video,
// Sidecar/carousel, reels) from public profiles. Proxy rotation via
// Apify's built-in proxy prevents IP blocks from Instagram.
const ACTOR_ID = 'apify~instagram-post-scraper'

interface ChildPost {
  displayUrl?: string | null
  videoUrl?: string | null
  images?: string[]
}

interface InstagramPost {
  id?: string
  shortCode?: string
  url?: string
  caption?: string
  type?: string // "Image" | "Video" | "Sidecar"
  displayUrl?: string | null
  images?: string[]
  videoUrl?: string | null
  downloadedVideo?: string | null
  videoDuration?: number | null
  videoViewCount?: number | null
  videoPlayCount?: number | null
  likesCount?: number
  sharesCount?: number
  commentsCount?: number
  timestamp?: string
  ownerUsername?: string
  ownerFullName?: string
  ownerId?: string
  // Post Scraper extras
  childPosts?: ChildPost[]
  hashtags?: string[]
  mentions?: string[]
  productType?: string // "clips" = reel, "feed" = regular post
  alt?: string | null
  firstComment?: string
  // Error items
  error?: string
  errorDescription?: string
}


export async function runInstagram(): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const signals = listSignals({ activeOnly: true, typeFilter: 'instagram_account' })
  let fetched = 0
  let inserted = 0
  let skipped = 0

  for (const sig of signals) {
    try {
      const username = sig.target.replace('@', '').replace(/^(https?:\/\/(www\.)?instagram\.com\/)/i, '')

      const { items: results } = await runActorAndWait<InstagramPost>(ACTOR_ID, {
        username: [username],
        resultsLimit: 50,
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyCountry: 'US',
        },
      })

      console.log('[instagram]', username, ': got', results.length, 'results, keys:', results.length > 0 ? Object.keys(results[0]!).join(', ') : 'EMPTY')

      // Filter out error items — Apify returns { error: "no_items", ... }
      // when an account is empty, private, or blocked.
      const posts = results.filter((item) => !item.error)
      const errors = results.filter((item) => !!item.error)

      if (errors.length > 0) {
        console.log('[instagram]', username, ':', errors.length, 'error(s) -', errors.map((e) => e.errorDescription || e.error).join('; '))
      }

      fetched += posts.length

      for (const post of posts) {
        const postId = post.shortCode || post.id
        if (!postId) continue

        const isReel = post.productType === 'clips'
        const caption = post.caption?.split('\n')[0] || 'New Instagram post'

        // Instagram CDN URLs expire quickly and are IP-bound. Prefer displayUrl
        // (thumbnail-sized, tends to last longer) over full-res images[].
        const rawImageUrl = post.displayUrl || (post.images && post.images.length > 0 ? post.images[0] : null) || null
        // Route through our proxy so it gets cached to disk and survives CDN expiration
        const imageUrl = rawImageUrl ? `/proxy/media?url=${encodeURIComponent(rawImageUrl)}` : null
        const videoUrl = post.videoUrl || post.downloadedVideo || null

        const didInsert = insertActivityFromPoller({
          signal_id: sig.id,
          activity_type: isReel ? 'new_reel' : 'new_post',
          title: caption.slice(0, 200),
          preview: post.caption?.slice(0, 300) || null,
          source_url: post.url || `https://www.instagram.com/p/${postId}`,
          thumbnail_url: imageUrl,
          detected_at: post.timestamp || new Date().toISOString(),
          raw_payload_json: JSON.stringify({
            postId,
            handle: post.ownerUsername || sig.target,
            caption: post.caption,
            like_count: post.likesCount ?? 0,
            comment_count: post.commentsCount ?? 0,
            shares_count: post.sharesCount ?? 0,
            post_type: post.type,
            product_type: post.productType || null,
            is_video: !!post.videoUrl,
            video_url: videoUrl,
            image_url: imageUrl,
            raw_image_url: rawImageUrl,
            video_duration: post.videoDuration || null,
            video_views: post.videoViewCount || post.videoPlayCount || null,
            child_posts: (post.childPosts && post.childPosts.length > 0) ? post.childPosts : undefined,
            hashtags: (post.hashtags && post.hashtags.length > 0) ? post.hashtags.slice(0, 10) : undefined,
            mentions: (post.mentions && post.mentions.length > 0) ? post.mentions.slice(0, 10) : undefined,
          }),
          dedup_key: `ig:${postId}`,
        })

        if (didInsert) inserted++
        else skipped++
      }
    } catch (err) {
      console.error('[instagram] error for', sig.target, ':', err instanceof Error ? err.message : err)
    }
  }

  return { fetched, inserted, skipped }
}
