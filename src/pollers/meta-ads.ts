import { runActorAndWait } from '../services/apify.ts'
import { listSignals, insertActivityFromPoller } from '../db/queries.ts'

// Official Apify Facebook Ad Library Scraper
const ACTOR_ID = 'apify~facebook-ads-scraper'

interface MetaAd {
  adArchiveId?: string
  adId?: string
  startDateFormatted?: string
  endDateFormatted?: string | null
  isActive?: boolean
  gatedType?: string
  publisherPlatform?: string[]
  snapshot?: {
    pageName?: string
    title?: string
    displayFormat?: string
    body?: { text?: string }
    ctaText?: string
    ctaType?: string
    linkUrl?: string
    linkDescription?: string
    caption?: string
    pageProfilePictureUrl?: string
    videos?: Array<{
      videoHdUrl?: string
      videoSdUrl?: string
      videoPreviewImageUrl?: string
    }>
    images?: Array<{ originalUrl?: string }>
  }
  spend?: unknown
  reachEstimate?: unknown
}


export async function runMetaAds(): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const signals = listSignals({ activeOnly: true, typeFilter: 'meta_ads' })
  let fetched = 0
  let inserted = 0
  let skipped = 0

  for (const sig of signals) {
    try {
      const pageSlug = sig.target
        .replace(/^https?:\/\/(www\.)?facebook\.com\//i, '')
        .replace(/^facebook\.com\//i, '')
        .replace(/\/$/, '')
      const pageUrl = `https://www.facebook.com/${pageSlug}`

      const { items: results } = await runActorAndWait<MetaAd>(ACTOR_ID, {
        startUrls: [{ url: pageUrl }],
        resultsPerPage: 50,
      })

      fetched += results.length

      for (let i = 0; i < results.length; i++) {
        const ad = results[i]!
        const snap = ad.snapshot ?? {}
        const adArchiveId = ad.adArchiveId || `${i}`

        const pageName = snap.pageName || 'Unknown'
        const headline = snap.title || pageName
        const primaryText = snap.body?.text || ''
        const displayFormat = snap.displayFormat || ''
        const stillActive = ad.isActive ?? true
        const landingUrl = snap.linkUrl || null

        // Skip DCO / template ads that contain unresolved placeholders
        if (headline.includes('{{') || primaryText.includes('{{')) continue

        // Best available thumbnail: video preview > page profile pic
        const videoPreview = snap.videos?.[0]?.videoPreviewImageUrl || null
        const videoUrl = snap.videos?.[0]?.videoHdUrl || snap.videos?.[0]?.videoSdUrl || null
        const pageAvatar = snap.pageProfilePictureUrl || null
        const rawThumb = videoPreview || pageAvatar || null
        const thumbUrl = rawThumb ? `/proxy/media?url=${encodeURIComponent(rawThumb)}` : null

        const didInsert = insertActivityFromPoller({
          signal_id: sig.id,
          activity_type: stillActive ? 'ad_launched' : 'ad_stopped',
          title: headline.slice(0, 200),
          preview: primaryText.slice(0, 300) || `${displayFormat} ad by ${pageName}`,
          source_url: landingUrl,
          thumbnail_url: thumbUrl,
          detected_at: ad.startDateFormatted || new Date().toISOString(),
          raw_payload_json: JSON.stringify({
            page_name: pageName,
            headline,
            primary_text: primaryText,
            cta_text: snap.ctaText || null,
            cta_type: snap.ctaType || null,
            display_format: displayFormat,
            platforms: ad.publisherPlatform || [],
            still_active: stillActive,
            landing_url: landingUrl,
            link_description: snap.linkDescription || null,
            caption: snap.caption || null,
            start_date: ad.startDateFormatted || null,
            end_date: ad.endDateFormatted || null,
            creative_url: rawThumb,
            video_url: videoUrl,
            page_avatar_url: pageAvatar,
          }),
          dedup_key: `meta:${adArchiveId}`,
        })

        if (didInsert) inserted++
        else skipped++
      }
    } catch (err) {
      console.error('[meta-ads] error for', sig.target, ':', err instanceof Error ? err.message : err)
    }
  }

  return { fetched, inserted, skipped }
}
