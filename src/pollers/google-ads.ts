import { runActorAndWait } from '../services/apify.ts'
import { listSignals, insertActivityFromPoller } from '../db/queries.ts'

// Google Ads via Google Search SERP — free on Apify ($5 free credit)
// Extracts paid results (ads) shown on Google for a competitor's brand query
const ACTOR_ID = 'apify~google-search-scraper'

interface GoogleSerpResult {
  searchQuery: { term: string }
  paidResults: Array<{
    title: string
    url: string
    displayedUrl: string
    description: string
    position: number
    type: string
  }>
  organicResults: Array<{
    title: string
    url: string
    description: string
    position: number
    type: string
  }>
}


export async function runGoogleAds(): Promise<{ fetched: number; inserted: number; skipped: number }> {
  const signals = listSignals({ activeOnly: true, typeFilter: 'google_ads' })
  let fetched = 0
  let inserted = 0
  let skipped = 0

  for (const sig of signals) {
    try {
      // Build a realistic search query from the signal target
      // e.g. "AR-BakerBrothers" → "Baker Brothers Plumbing Dallas"
      const raw = sig.target.replace(/^AR-/, '')
      const brandName = raw.replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase → spaces
      const searchTerm = brandName

      const { items: serpPages } = await runActorAndWait<GoogleSerpResult>(ACTOR_ID, {
        queries: searchTerm,
        maxPagesPerQuery: 3,
        countryCode: 'us',
        focusOnPaidAds: true,
      })

      // Extract paid results from SERP response
      const ads: Array<{ title: string; url: string; description: string; position: number }> = []
      for (const page of serpPages) {
        if (page.paidResults) {
          for (const ad of page.paidResults) {
            ads.push({
              title: ad.title || '',
              url: ad.url || '',
              description: ad.description || '',
              position: ad.position,
            })
          }
        }
      }

      fetched += ads.length

      for (const ad of ads) {
        const adId = ad.url || `${ad.title}:${ad.position}`
        if (!adId) continue

        const title = ad.title || 'New Google Ad'

        const didInsert = insertActivityFromPoller({
          signal_id: sig.id,
          activity_type: 'google_ad_launched',
          title: title.slice(0, 200),
          preview: ad.description?.slice(0, 300) || null,
          source_url: ad.url || null,
          thumbnail_url: null,
          detected_at: new Date().toISOString(),
          raw_payload_json: JSON.stringify({
            searchTerm,
            headline: ad.title,
            description: ad.description,
            url: ad.url,
            position: ad.position,
          }),
          dedup_key: `gad:${adId}`,
        })

        if (didInsert) inserted++
        else skipped++
      }
    } catch (err) {
      console.error('[google-ads] error for', sig.target, ':', err instanceof Error ? err.message : err)
    }
  }

  return { fetched, inserted, skipped }
}