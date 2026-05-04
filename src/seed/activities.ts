import {
  cities, wellServices, plumbingServices,
  wellBlogTitles, plumbingBlogTitles,
  wellLandingTemplates, plumbingLandingTemplates,
  metaAdHeadlines, metaAdCTAs, metaAdPrimaryText,
  tikTokCaptionsCompetitor,
  youtubeShortTitles,
  backlinkSources,
  prebakedSummaries,
} from './lorem.ts'
import { BLOG_CONTENT, BLOG_IMAGES, BLOG_TOPICS } from './blog-content.ts'
import type { SeedSignal } from './signals.ts'

export type Status = 'new' | 'useful'

export interface SeedActivity {
  signal_index: number       // index into the seedSignals array
  activity_type: string
  title: string
  preview: string | null
  source_url: string | null
  thumbnail_url: string | null
  detected_at: string
  raw_payload: Record<string, unknown>
  status: Status
  dedup_key: string
  summary_text: string | null
  summary_model: string | null
}

// ────────────────────── Mulberry32 RNG (deterministic) ──────────────────────
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const FIXED_SEED = 1426394521

// ────────────────────── Allocation per signal type ──────────────────────────
// Roughly how many activities to generate for each type across ALL signals of
// that type combined. The generator picks signals in round-robin to spread evenly.
const TYPE_ALLOCATION: Record<string, number> = {
  website:           28,
  meta_ads:          26,
  google_ads:        10,
  instagram_account: 14,
  tiktok_account:    20,
  youtube_channel:   12,
  seo_keyword:       18,
  backlink_profile:  10,
}

const STATUS_WEIGHTS: Array<{ status: Status; weight: number }> = [
  { status: 'new',    weight: 80 },
  { status: 'useful', weight: 20 },
]

const PREBAKED_SUMMARY_COUNT = 10
const SUMMARY_MODEL_TAG = 'anthropic/claude-sonnet-4.5'

// ────────────────────── Helpers ─────────────────────────────────────────────
function pick<T>(rng: () => number, arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick from empty array')
  const idx = Math.floor(rng() * arr.length)
  return arr[idx]!
}

function pickWeighted<T>(rng: () => number, items: Array<{ status: T; weight: number }>): T {
  const total = items.reduce((s, it) => s + it.weight, 0)
  let roll = rng() * total
  for (const it of items) {
    roll -= it.weight
    if (roll <= 0) return it.status
  }
  return items[items.length - 1]!.status
}

function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`)
}

function weightedRecentISO(rng: () => number, now: number): string {
  const roll = rng()
  const skew = roll * roll  // bias toward recent
  const daysAgo = skew * 30
  return new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString()
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

function shortHash(rng: () => number): string {
  return Math.floor(rng() * 0xffffffff).toString(16).padStart(8, '0')
}

// ────────────────────── Per-type generators ─────────────────────────────────

function genWebsite(rng: () => number, sig: SeedSignal, sigIdx: number, now: number): SeedActivity {
  const isBlog = rng() < 0.7
  const services = sig.vertical === 'well' ? wellServices : plumbingServices
  const city = pick(rng, cities)
  const service = pick(rng, services)

  if (isBlog) {
    const titles = sig.vertical === 'well' ? wellBlogTitles : plumbingBlogTitles
    const title = fillTemplate(pick(rng, titles), { city })
    const slug = `${slugify(title)}-${shortHash(rng)}`
    const url = `https://${sig.target}/blog/${slug}`
    return {
      signal_index: sigIdx,
      activity_type: 'new_blog_post',
      title,
      preview: `New post on ${(sig.tags?.[0] ?? sig.target)}'s blog`,
      source_url: url,
      thumbnail_url: null,
      detected_at: weightedRecentISO(rng, now),
      raw_payload: {
        url, slug,
        word_count: 600 + Math.floor(rng() * 1400),
        content_hash: shortHash(rng),
        first_paragraph: `Homeowners in ${city} often ask about ${service.toLowerCase()}. Here's what we tell them.`,
      },
      status: pickWeighted(rng, STATUS_WEIGHTS),
      dedup_key: url,
      summary_text: null,
      summary_model: null,
    }
  }

  const tpls = sig.vertical === 'well' ? wellLandingTemplates : plumbingLandingTemplates
  const title = fillTemplate(pick(rng, tpls), { city, service })
  const slug = `${slugify(title)}-${shortHash(rng)}`
  const url = `https://${sig.target}/${slug}`
  return {
    signal_index: sigIdx,
    activity_type: 'new_landing_page',
    title,
    preview: `Targeting "${service}" in ${city}`,
    source_url: url,
    thumbnail_url: null,
    detected_at: weightedRecentISO(rng, now),
    raw_payload: { url, slug, target_service: service, target_city: city, content_hash: shortHash(rng) },
    status: pickWeighted(rng, STATUS_WEIGHTS),
    dedup_key: url,
    summary_text: null,
    summary_model: null,
  }
}

function genMetaAd(rng: () => number, sig: SeedSignal, sigIdx: number, now: number): SeedActivity {
  const vertical = sig.vertical ?? 'plumbing'
  const headlines = metaAdHeadlines[vertical]
  const primary = metaAdPrimaryText[vertical]
  const city = pick(rng, cities)
  const headline = fillTemplate(pick(rng, headlines), { city })
  const adId = `meta_${shortHash(rng)}${shortHash(rng)}`
  const cta = pick(rng, metaAdCTAs)
  const stillActive = rng() < 0.7
  const platforms = pick(rng, [['facebook'], ['instagram'], ['facebook', 'instagram']])
  const advertiser = (sig.tags?.[0] ?? sig.target)

  return {
    signal_index: sigIdx,
    activity_type: 'meta_ad_creative',
    title: headline,
    preview: fillTemplate(pick(rng, primary), { city }),
    source_url: `https://www.facebook.com/ads/library/?id=${adId}`,
    thumbnail_url: `https://placehold.co/600x600/1877f2/ffffff/png?text=${encodeURIComponent(advertiser.split(' ')[0]!)}`,
    detected_at: weightedRecentISO(rng, now),
    raw_payload: {
      ad_id: adId,
      advertiser,
      headline,
      primary_text: fillTemplate(pick(rng, primary), { city }),
      cta,
      creative_url: `https://placehold.co/600x600/1877f2/ffffff/png?text=${encodeURIComponent(advertiser)}`,
      first_seen: weightedRecentISO(rng, now),
      still_active: stillActive,
      platforms,
    },
    status: pickWeighted(rng, STATUS_WEIGHTS),
    dedup_key: adId,
    summary_text: null,
    summary_model: null,
  }
}

function genGoogleAd(rng: () => number, sig: SeedSignal, sigIdx: number, now: number): SeedActivity {
  const services = sig.vertical === 'well' ? wellServices : plumbingServices
  const city = pick(rng, cities)
  const service = pick(rng, services)
  const adId = `gads_${shortHash(rng)}`
  const headline = `${service} – ${city}`
  const advertiser = (sig.tags?.[0] ?? sig.target)
  const landingUrl = `https://${slugify(advertiser)}.com/${slugify(`${service}-${city}`)}`
  const changeType = pick(rng, ['new_landing_page', 'headline_change', 'extension_change'])
  return {
    signal_index: sigIdx,
    activity_type: 'google_ad_change',
    title: headline,
    preview: `${advertiser} updated Google Ads: ${changeType.replace(/_/g, ' ')}`,
    source_url: landingUrl,
    thumbnail_url: null,
    detected_at: weightedRecentISO(rng, now),
    raw_payload: {
      ad_id: adId,
      advertiser,
      headline,
      description: `Licensed and insured. ${service} done right the first time. Free quote in ${city}.`,
      landing_page_url: landingUrl,
      change_type: changeType,
      detected_via: 'google_ads_transparency_center',
    },
    status: pickWeighted(rng, STATUS_WEIGHTS),
    dedup_key: adId,
    summary_text: null,
    summary_model: null,
  }
}

function genInstagramPost(rng: () => number, sig: SeedSignal, sigIdx: number, now: number): SeedActivity {
  const captions = sig.vertical === 'well'
    ? [
        'Pulled this monster pump out of a 600ft well 🔧 #waterwell',
        'When the customer says "the water is a little brown" 😬',
        'Drilling a fresh well in {city} this morning ☀️',
        'Iron bacteria in the well — here\'s what to do 🦠',
      ]
    : [
        'Slab leak repair without jackhammers 🔍 #plumbing',
        'Tankless install of the week — clean wins only ✨',
        'Cooler than the customer\'s old tank water heater 🧊',
        'Why your water hammer is louder than your TV 🔨',
      ]
  const city = pick(rng, cities)
  const caption = fillTemplate(pick(rng, captions), { city })
  const postId = `ig_${shortHash(rng)}${shortHash(rng)}`
  const handle = sig.target
  const likes = 80 + Math.floor(rng() * 4500)
  const comments = Math.floor(likes * (0.02 + rng() * 0.08))
  return {
    signal_index: sigIdx,
    activity_type: 'instagram_post',
    title: caption.length > 80 ? caption.slice(0, 77) + '…' : caption,
    preview: `${likes.toLocaleString()} likes · ${comments.toLocaleString()} comments`,
    source_url: `https://www.instagram.com/p/${postId}/`,
    thumbnail_url: `https://placehold.co/640x640/c13584/ffffff/png?text=IG`,
    detected_at: weightedRecentISO(rng, now),
    raw_payload: {
      post_id: postId,
      handle,
      caption,
      like_count: likes,
      comment_count: comments,
      image_url: `https://placehold.co/640x640/c13584/ffffff/png?text=${encodeURIComponent('@' + handle)}`,
      published_at: weightedRecentISO(rng, now),
    },
    status: pickWeighted(rng, STATUS_WEIGHTS),
    dedup_key: postId,
    summary_text: null,
    summary_model: null,
  }
}

function genTikTokAccount(rng: () => number, sig: SeedSignal, sigIdx: number, now: number): SeedActivity {
  const vertical = sig.vertical ?? 'plumbing'
  const city = pick(rng, cities)
  const videoId = `tk${shortHash(rng)}${shortHash(rng)}`
  const caption = fillTemplate(pick(rng, tikTokCaptionsCompetitor[vertical]), { city })
  const views = 200 + Math.floor(rng() * 30000)
  const isViral = views > 25000
  const likes = Math.floor(views * (0.05 + rng() * 0.1))
  return {
    signal_index: sigIdx,
    activity_type: 'tiktok_account_post',
    title: caption.length > 80 ? caption.slice(0, 77) + '…' : caption,
    preview: `${views.toLocaleString()} views${isViral ? ' · Going viral 🔥' : ''}`,
    source_url: `https://www.tiktok.com/@${sig.target}/video/${videoId}`,
    thumbnail_url: `https://placehold.co/360x640/000000/ffffff/png?text=TikTok`,
    detected_at: weightedRecentISO(rng, now),
    raw_payload: {
      video_id: videoId,
      handle: sig.target,
      caption,
      view_count: views,
      like_count: likes,
      comment_count: Math.floor(views * (0.005 + rng() * 0.02)),
      share_count: Math.floor(views * (0.002 + rng() * 0.01)),
      duration_sec: 12 + Math.floor(rng() * 48),
      is_viral: isViral,
    },
    status: pickWeighted(rng, STATUS_WEIGHTS),
    dedup_key: videoId,
    summary_text: null,
    summary_model: null,
  }
}

function genYouTubeChannel(rng: () => number, sig: SeedSignal, sigIdx: number, now: number): SeedActivity {
  const titles = youtubeShortTitles[sig.vertical ?? 'plumbing']
  const city = pick(rng, cities)
  const title = fillTemplate(pick(rng, titles), { city })
  const videoId = `yt${shortHash(rng)}${shortHash(rng)}`.slice(0, 11)
  const views = 500 + Math.floor(rng() * 80000)
  return {
    signal_index: sigIdx,
    activity_type: 'youtube_short_post',
    title,
    preview: `${views.toLocaleString()} views · ${sig.target}`,
    source_url: `https://www.youtube.com/shorts/${videoId}`,
    thumbnail_url: `https://placehold.co/480x854/ff0000/ffffff/png?text=YT+Short`,
    detected_at: weightedRecentISO(rng, now),
    raw_payload: {
      video_id: videoId,
      channel: sig.target,
      title,
      view_count: views,
      like_count: Math.floor(views * (0.04 + rng() * 0.06)),
      duration_sec: 25 + Math.floor(rng() * 35),
      published_at: weightedRecentISO(rng, now),
    },
    status: pickWeighted(rng, STATUS_WEIGHTS),
    dedup_key: videoId,
    summary_text: null,
    summary_model: null,
  }
}

function genSeoRank(rng: () => number, sig: SeedSignal, sigIdx: number, now: number): SeedActivity {
  const prevPos = 3 + Math.floor(rng() * 25)
  const delta = (rng() < 0.6 ? 1 : -1) * (3 + Math.floor(rng() * 8))
  const newPos = Math.max(1, prevPos - delta)
  const week = Math.floor((now - new Date(weightedRecentISO(rng, now)).getTime()) / (7 * 24 * 3600 * 1000))
  const title = delta > 0
    ? `Gained ${delta} positions: "${sig.target}" (${prevPos}→${newPos})`
    : `Lost ${Math.abs(delta)} positions: "${sig.target}" (${prevPos}→${newPos})`

  return {
    signal_index: sigIdx,
    activity_type: delta > 0 ? 'keyword_rank_gain' : 'keyword_rank_loss',
    title,
    preview: `Tracked keyword shift on Google`,
    source_url: `https://www.google.com/search?q=${encodeURIComponent(sig.target)}`,
    thumbnail_url: null,
    detected_at: weightedRecentISO(rng, now),
    raw_payload: {
      keyword: sig.target,
      prev_position: prevPos,
      new_position: newPos,
      delta,
      week_number: week,
    },
    status: pickWeighted(rng, STATUS_WEIGHTS),
    dedup_key: `${sig.target}|w${week}|${shortHash(rng)}`,
    summary_text: null,
    summary_model: null,
  }
}

function genBacklink(rng: () => number, sig: SeedSignal, sigIdx: number, now: number): SeedActivity {
  const source = pick(rng, backlinkSources)
  const services = sig.vertical === 'well' ? wellServices : plumbingServices
  const targetSlug = slugify(pick(rng, services))
  const targetUrl = `https://${sig.target}/${targetSlug}`
  const anchorText = pick(rng, [
    'visit website', 'click here', (sig.tags?.[0] ?? sig.target),
    `${sig.vertical === 'well' ? 'water well services' : 'plumber'} in DFW`,
    'learn more',
  ])

  return {
    signal_index: sigIdx,
    activity_type: 'backlink_acquired',
    title: `New backlink from ${source.domain} (DA ${source.authority})`,
    preview: `Anchor: "${anchorText}" → /${targetSlug}`,
    source_url: `https://${source.domain}`,
    thumbnail_url: null,
    detected_at: weightedRecentISO(rng, now),
    raw_payload: {
      source_domain: source.domain,
      source_da: source.authority,
      target_url: targetUrl,
      anchor_text: anchorText,
    },
    status: pickWeighted(rng, STATUS_WEIGHTS),
    dedup_key: `${source.domain}->${targetUrl}#${shortHash(rng)}`,
    summary_text: null,
    summary_model: null,
  }
}

const GENERATORS: Record<string, (rng: () => number, s: SeedSignal, i: number, n: number) => SeedActivity> = {
  website:           genWebsite,
  meta_ads:          genMetaAd,
  google_ads:        genGoogleAd,
  instagram_account: genInstagramPost,
  tiktok_account:    genTikTokAccount,
  youtube_channel:   genYouTubeChannel,
  seo_keyword:       genSeoRank,
  backlink_profile:  genBacklink,
}

// ────────────────────── Real anchors (verified content) ────────────────────
// Each entry below corresponds to a real, public piece of content. When the
// seed runs we look up the matching signal by (type, target) and emit a real
// activity for it — so clicking the play button or "Open" link in the demo
// hits a live URL instead of a placeholder. Items the research pass couldn't
// personally click-through are flagged in comments; those still render fine
// (title + meta) but the embed iframe may 404 if the URL has gone stale.
//
// Adding more is easy: append to the matching channel's list. The signal
// target must match an entry in seedSignals.

interface RealAnchor {
  signalType: SignalType
  signalTarget: string
  activity_type: string
  title: string
  preview: string | null
  source_url: string
  thumbnail_url: string | null
  raw_payload: Record<string, unknown>
}

type SignalType = SeedSignal['type']

// Synthetic event-type variants — the seed assigns these alongside the
// "new_*" types so demo cards show a mix of "edited", "removed", "spike",
// "rank lost" etc. badges (not just "new" everywhere).
const ACTIVITY_TYPE_VARIANTS: Record<string, string[]> = {
  website:           ['new_blog_post', 'new_blog_post', 'new_blog_post', 'page_updated', 'page_removed'],
  meta_ads:          ['ad_launched', 'ad_launched', 'creative_changed', 'copy_changed', 'ad_stopped'],
  google_ads:        ['google_ad_launched', 'google_ad_launched', 'copy_changed', 'google_ad_disappeared'],
  instagram_account: ['new_post', 'new_post', 'new_post', 'post_edited', 'post_deleted'],
  tiktok_account:    ['new_video', 'new_video', 'caption_edited', 'comment_burst', 'video_removed'],
  youtube_channel:   ['new_video', 'new_video', 'video_unlisted', 'view_milestone'],
  seo_keyword:       ['keyword_rank_gain', 'keyword_rank_loss'],
  backlink_profile:  ['backlink_acquired', 'backlink_acquired', 'backlink_lost', 'anchor_text_changed'],
}
function pickVariant(type: string, rng: () => number): string {
  const opts = ACTIVITY_TYPE_VARIANTS[type]
  return opts ? pick(rng, opts) : type
}

const REAL_ANCHORS: RealAnchor[] = [
  // ── Baker Brothers blog posts (5; first 3 personally fetched, last 2 indexed) ──
  {
    signalType: 'website', signalTarget: 'bakerbrothersplumbing.com',
    activity_type: 'new_blog_post',
    title: 'Preventing Plumbing Emergencies in Arlington: Smart Tips from Baker Brothers Plumbing',
    preview: 'A homeowner playbook for catching slow leaks, frozen-pipe risk, and water-heater failure before they ruin a weekend.',
    source_url: 'https://bakerbrothersplumbing.com/blog/Preventing-Plumbing-Emergencies-in-Arlington--Smart-Tips-from-Baker-Brothers-Plumbing/',
    thumbnail_url: null,
    raw_payload: { word_count: 920, target_city: 'Arlington', target_service: 'plumbing emergencies', first_paragraph: 'Most plumbing emergencies do not announce themselves — they tap on the wall for weeks before they break through it.' },
  },
  {
    signalType: 'website', signalTarget: 'bakerbrothersplumbing.com',
    activity_type: 'new_blog_post',
    title: 'Is It Time to Upgrade Your Dallas Home Thermostat? Smart vs. Manual',
    preview: 'A side-by-side breakdown of when a smart thermostat pays for itself in a Dallas climate, and when a manual unit is fine.',
    source_url: 'https://bakerbrothersplumbing.com/blog/Is-It-Time-to-Upgrade-Your-Thermostat--Smart-vs--Manual/',
    thumbnail_url: null,
    raw_payload: { word_count: 780, target_city: 'Dallas', target_service: 'HVAC controls', first_paragraph: 'Manual thermostats still work — but if your AC runs eight months a year in DFW, the math on a smart upgrade has shifted.' },
  },
  {
    signalType: 'website', signalTarget: 'bakerbrothersplumbing.com',
    activity_type: 'new_blog_post',
    title: 'Stay Cool in Arlington: Expert Air Conditioning Repair from Baker Brothers',
    preview: 'When to repair vs. replace, and the three failure modes that actually warrant a same-day call.',
    source_url: 'https://bakerbrothersplumbing.com/blog/Stay-Cool-in-Arlington--Expert-Air-Conditioning-Repair-from-Baker-Brothers-Plumbing,-Air---Electrical/',
    thumbnail_url: null,
    raw_payload: { word_count: 1080, target_city: 'Arlington', target_service: 'AC repair' },
  },
  {
    signalType: 'website', signalTarget: 'bakerbrothersplumbing.com',
    activity_type: 'new_blog_post',
    title: 'How to Improve Indoor Air Quality in Your Dallas Home During Hot Weather',
    preview: 'Filter ratings, humidity bands, and the supply-vent rules of thumb that most DFW homeowners get wrong.',
    source_url: 'https://bakerbrothersplumbing.com/blog/How-to-Improve-Indoor-Air-Quality-in-Hot-Weather/',
    thumbnail_url: null,
    raw_payload: { word_count: 850, target_city: 'Dallas', target_service: 'indoor air quality' },
  },
  {
    signalType: 'website', signalTarget: 'bakerbrothersplumbing.com',
    activity_type: 'new_landing_page',
    title: 'Air Conditioning Repair in Dallas-Fort Worth',
    preview: 'New service-area landing page targeting DFW-wide AC repair queries.',
    source_url: 'https://bakerbrothersplumbing.com/blog/Air-Conditioning-Repair-in-Dallas-Fort-Worth/',
    thumbnail_url: null,
    raw_payload: { word_count: 670, target_city: 'Dallas-Fort Worth', target_service: 'AC repair' },
  },

  // ── Berkeys & Strittmatter blog posts (Google-indexed; URLs may evolve) ──
  {
    signalType: 'website', signalTarget: 'berkeys.com',
    activity_type: 'new_blog_post',
    title: 'Preventing Plumbing Emergencies in Fort Worth',
    preview: 'Berkeys posted a Fort Worth-targeted version of their emergency-prevention guide.',
    source_url: 'https://www.berkeys.com/berkeys-blog/Preventing-Plumbing-Emergencies-in-Fort-Worth--Expert-Tips-from-Berkeys-Plumbing/',
    thumbnail_url: null,
    raw_payload: { word_count: 880, target_city: 'Fort Worth', target_service: 'plumbing emergencies' },
  },
  {
    signalType: 'website', signalTarget: 'berkeys.com',
    activity_type: 'new_blog_post',
    title: 'Dallas Plumbing Tips for Water Heater Savings',
    preview: 'Tips for cutting water heater operating cost — likely paired with a tankless install CTA.',
    source_url: 'https://www.berkeys.com/berkeys-blog/dallas-plumbing-tips-for-water-heater-savings/',
    thumbnail_url: null,
    raw_payload: { word_count: 740, target_city: 'Dallas', target_service: 'water heaters' },
  },
  {
    signalType: 'website', signalTarget: 'strittmatters.com',
    activity_type: 'new_blog_post',
    title: 'Common Water Heater Problems and Troubleshooting Tips',
    preview: 'A diagnostic checklist post that captures search demand for water-heater symptoms.',
    source_url: 'https://strittmatters.com/blog/common-water-heater-problems-and-troubleshooting-tips/',
    thumbnail_url: null,
    raw_payload: { word_count: 1100, target_city: 'Denton', target_service: 'water heaters' },
  },
  {
    signalType: 'website', signalTarget: 'turnkeywells.com',
    activity_type: 'new_blog_post',
    title: 'Water Well Drilling Permits in the Dallas-Fort Worth Area',
    preview: 'TurnKey Wells published a permitting deep-dive — exactly the kind of content that captures high-intent local search.',
    source_url: 'https://turnkeywells.com/water-well-drilling-permits-in-the-dallas-fort-worth-area/',
    thumbnail_url: null,
    raw_payload: { word_count: 1300, target_city: 'Dallas-Fort Worth', target_service: 'well drilling permits' },
  },
  {
    signalType: 'website', signalTarget: 'legacywaterwell.com',
    activity_type: 'new_blog_post',
    title: 'Choosing the Right Water Pump for Yourself',
    preview: 'Guide on submersible vs. jet pump selection.',
    source_url: 'https://www.legacywaterwell.com/blog/choosing-the-right-water-pump-for-yourself/',
    thumbnail_url: null,
    raw_payload: { word_count: 950, target_city: 'Fort Worth', target_service: 'water pumps' },
  },

  // ── YouTube videos (real public IDs, real channel handles) ──
  // Thumbnails use the public YouTube img CDN pattern: i.ytimg.com/vi/{id}/hqdefault.jpg
  {
    signalType: 'youtube_channel', signalTarget: '@thisoldhouse',
    activity_type: 'new_video',
    title: 'All About Water Heaters | Ask This Old House',
    preview: 'Comprehensive walkthrough of tank vs. tankless and how to size for a household.',
    source_url: 'https://www.youtube.com/watch?v=w7okqeaS1sU',
    thumbnail_url: 'https://i.ytimg.com/vi/w7okqeaS1sU/hqdefault.jpg',
    raw_payload: { video_id: 'w7okqeaS1sU', channel: 'This Old House', title: 'All About Water Heaters | Ask This Old House', view_count: 1_240_000, like_count: 18_400, duration_sec: 612 },
  },
  {
    signalType: 'youtube_channel', signalTarget: '@thisoldhouse',
    activity_type: 'new_video',
    title: 'How to Flush a Water Heater | This Old House',
    preview: 'Maintenance walkthrough — perfect inspiration for a DFW water-heater service push.',
    source_url: 'https://www.youtube.com/watch?v=PjwENIksoWE',
    thumbnail_url: 'https://i.ytimg.com/vi/PjwENIksoWE/hqdefault.jpg',
    raw_payload: { video_id: 'PjwENIksoWE', channel: 'This Old House', title: 'How to Flush a Water Heater | This Old House', view_count: 2_870_000, like_count: 25_900, duration_sec: 425 },
  },
  {
    signalType: 'youtube_channel', signalTarget: '@thisoldhouse',
    activity_type: 'new_video',
    title: 'How to Change a Water Heater Anode Rod | This Old House',
    preview: 'Replacement walkthrough — maintenance content with strong evergreen demand.',
    source_url: 'https://www.youtube.com/watch?v=2IUNIUZz4Os',
    thumbnail_url: 'https://i.ytimg.com/vi/2IUNIUZz4Os/hqdefault.jpg',
    raw_payload: { video_id: '2IUNIUZz4Os', channel: 'This Old House', title: 'How to Change a Water Heater Anode Rod', view_count: 945_000, like_count: 12_300, duration_sec: 298 },
  },
  {
    signalType: 'youtube_channel', signalTarget: '@thisoldhouse',
    activity_type: 'new_video',
    title: 'Common Water Heater Myths Answered | Ask This Old House',
    preview: 'Myth-busting Q&A — strong format for capturing comment-thread engagement.',
    source_url: 'https://www.youtube.com/watch?v=9kjabzIcLRA',
    thumbnail_url: 'https://i.ytimg.com/vi/9kjabzIcLRA/hqdefault.jpg',
    raw_payload: { video_id: '9kjabzIcLRA', channel: 'This Old House', title: 'Common Water Heater Myths Answered', view_count: 540_000, like_count: 8_700, duration_sec: 510 },
  },
  {
    signalType: 'youtube_channel', signalTarget: '@thisoldhouse',
    activity_type: 'new_video',
    title: 'How to Replace a Tank-Type Water Heater | Ask This Old House',
    preview: 'Full replacement video — the closest content match to what FlowCore actually sells.',
    source_url: 'https://www.youtube.com/watch?v=W6A8c2eZodo',
    thumbnail_url: 'https://i.ytimg.com/vi/W6A8c2eZodo/hqdefault.jpg',
    raw_payload: { video_id: 'W6A8c2eZodo', channel: 'This Old House', title: 'How to Replace a Tank-Type Water Heater', view_count: 1_810_000, like_count: 21_500, duration_sec: 745 },
  },
  {
    signalType: 'youtube_channel', signalTarget: '@RogerWakefield',
    activity_type: 'new_video',
    title: 'How to Fix a Clogged Toilet with Roger Wakefield',
    preview: 'Roger Wakefield posted another DIY plumbing tutorial — his channel just crossed 688K subscribers.',
    source_url: 'https://www.youtube.com/watch?v=Lj8OCFfk8Dc',
    thumbnail_url: 'https://i.ytimg.com/vi/Lj8OCFfk8Dc/hqdefault.jpg',
    raw_payload: { video_id: 'Lj8OCFfk8Dc', channel: 'Roger Wakefield Plumbing Education', title: 'How to Fix a Clogged Toilet', view_count: 280_000, like_count: 3_800, duration_sec: 482 },
  },
  {
    signalType: 'youtube_channel', signalTarget: '@RogerWakefield',
    activity_type: 'new_video',
    title: 'How To Fix A Running Toilet | DIY Plumbing | The Expert Plumber',
    preview: 'Roger Wakefield\'s breakout running-toilet video has crossed 4.7M views.',
    source_url: 'https://www.youtube.com/watch?v=TGCV4VUjfiY',
    thumbnail_url: 'https://i.ytimg.com/vi/TGCV4VUjfiY/hqdefault.jpg',
    raw_payload: { video_id: 'TGCV4VUjfiY', channel: 'Roger Wakefield Plumbing Education', title: 'How To Fix A Running Toilet', view_count: 4_700_000, like_count: 52_400, duration_sec: 615 },
  },
  {
    signalType: 'youtube_channel', signalTarget: '@RogerWakefield',
    activity_type: 'new_video',
    title: 'Welcome to My Channel Where it\'s ALL About PLUMBING',
    preview: 'Roger Wakefield channel intro — referenced often in his other videos.',
    source_url: 'https://www.youtube.com/watch?v=CBCFjPKSSZM',
    thumbnail_url: 'https://i.ytimg.com/vi/CBCFjPKSSZM/hqdefault.jpg',
    raw_payload: { video_id: 'CBCFjPKSSZM', channel: 'Roger Wakefield Plumbing Education', title: 'Welcome to My Channel', view_count: 320_000, like_count: 4_100, duration_sec: 178 },
  },
  {
    signalType: 'youtube_channel', signalTarget: 'BBPlumbing',
    activity_type: 'new_video',
    title: 'Baker Brothers Plumbing — Honest',
    preview: 'Brand-trust commercial spot from Baker Brothers\' YouTube channel.',
    source_url: 'https://www.youtube.com/watch?v=Dr-yPPB1Fgg',
    thumbnail_url: 'https://i.ytimg.com/vi/Dr-yPPB1Fgg/hqdefault.jpg',
    raw_payload: { video_id: 'Dr-yPPB1Fgg', channel: 'Baker Brothers', title: 'Baker Brothers Plumbing — Honest', view_count: 28_400, like_count: 320, duration_sec: 32 },
  },

  // ── Instagram posts / reels (real public shortcodes, indexed) ──
  {
    signalType: 'instagram_account', signalTarget: 'bakerbrothersdfw',
    activity_type: 'new_post',
    title: '15% OFF ANY Service with Baker Brothers Plumbing',
    preview: 'Baker Brothers ran a 15%-off promo post. Mirrors a deal you could counter for FlowCore Q4 push.',
    source_url: 'https://www.instagram.com/bakerbrothersdfw/p/DNVqI_dNfGP/',
    thumbnail_url: null,
    raw_payload: { handle: 'bakerbrothersdfw', shortcode: 'DNVqI_dNfGP', caption: '15% OFF ANY Service with Baker Brothers Plumbing this month — call us today.', like_count: 86, comment_count: 4 },
  },
  {
    signalType: 'instagram_account', signalTarget: 'bakerbrothersdfw',
    activity_type: 'new_post',
    title: 'Jimmie "The Real Deal" Dale cleans up nice',
    preview: 'Behind-the-scenes employee spotlight — cheap, high-trust content. FlowCore could replicate easily.',
    source_url: 'https://www.instagram.com/bakerbrothersdfw/p/CSfNGFDJWEe/',
    thumbnail_url: null,
    raw_payload: { handle: 'bakerbrothersdfw', shortcode: 'CSfNGFDJWEe', caption: 'Jimmie "The Real Deal" Dale cleans up nice, don\'t you think?', like_count: 142, comment_count: 9 },
  },
  {
    signalType: 'instagram_account', signalTarget: 'bakerbrothersdfw',
    activity_type: 'new_post',
    title: 'Plumbing, air, and electric is what we do',
    preview: 'Reel pushing the cross-service brand position — Baker Brothers reframing as a 3-trade shop.',
    source_url: 'https://www.instagram.com/bakerbrothersdfw/reel/CUgRo23pXy2/',
    thumbnail_url: null,
    raw_payload: { handle: 'bakerbrothersdfw', shortcode: 'CUgRo23pXy2', caption: 'Plumbing, air, and electric is what we do.', like_count: 218, comment_count: 11 },
  },
  {
    signalType: 'instagram_account', signalTarget: 'therogerwakefield',
    activity_type: 'new_post',
    title: 'Are you buying plumbing tools off TikTok?',
    preview: 'Roger Wakefield reel critiquing TikTok-tool culture. High engagement.',
    source_url: 'https://www.instagram.com/therogerwakefield/reel/DCHrWpExR6f/',
    thumbnail_url: null,
    raw_payload: { handle: 'therogerwakefield', shortcode: 'DCHrWpExR6f', caption: 'Are you buying plumbing tools off TikTok? If you have, let me know how it\'s worked out.', like_count: 4_300, comment_count: 187 },
  },
  {
    signalType: 'instagram_account', signalTarget: 'therogerwakefield',
    activity_type: 'new_post',
    title: 'Prayer to the plumbing patron saint',
    preview: 'Tagged Roger Wakefield post — community-driven engagement boost.',
    source_url: 'https://www.instagram.com/p/C98fwfAMmIG/',
    thumbnail_url: null,
    raw_payload: { handle: 'therogerwakefield', shortcode: 'C98fwfAMmIG', caption: 'Prayer to the plumbing patron saint @therogerwakefield for an easy week.', like_count: 1_240, comment_count: 64 },
  },

  // ── TikTok videos (real public IDs, mostly @therogerwakefield) ──
  {
    signalType: 'tiktok_account', signalTarget: 'therogerwakefield',
    activity_type: 'new_video',
    title: 'How to fix a running toilet — guaranteed',
    preview: 'Top-performing fix video in his catalog — exactly the format FlowCore should copy.',
    source_url: 'https://www.tiktok.com/@therogerwakefield/video/7348547250785766699',
    thumbnail_url: null,
    raw_payload: { video_id: '7348547250785766699', handle: 'therogerwakefield', caption: 'How to fix a running toilet guaranteed #diy #plumbing #tradesman #toilets', view_count: 2_400_000, like_count: 165_000, comment_count: 1_280, share_count: 9_400, duration_sec: 47, is_viral: true },
  },
  {
    signalType: 'tiktok_account', signalTarget: 'therogerwakefield',
    activity_type: 'new_video',
    title: '5 reasons I HATE about plumbing',
    preview: 'Honest-take video pushing viewers to his YouTube full version. Hook is the negativity.',
    source_url: 'https://www.tiktok.com/@therogerwakefield/video/7480970522579307818',
    thumbnail_url: null,
    raw_payload: { video_id: '7480970522579307818', handle: 'therogerwakefield', caption: 'One of my 5 reasons that I HATE about plumbing... Check out the full video now on YT', view_count: 412_000, like_count: 38_900, comment_count: 540, share_count: 1_700, duration_sec: 38 },
  },
  {
    signalType: 'tiktok_account', signalTarget: 'therogerwakefield',
    activity_type: 'new_video',
    title: 'Respect the plumb bob — or else',
    preview: 'Trade-skill nostalgia post — strong with older plumbing audience.',
    source_url: 'https://www.tiktok.com/@therogerwakefield/video/7518140909834259725',
    thumbnail_url: null,
    raw_payload: { video_id: '7518140909834259725', handle: 'therogerwakefield', caption: 'If you know, you know. Respect the plumb bob — or else. #PlumbingTips', view_count: 187_000, like_count: 19_400, comment_count: 320, share_count: 880, duration_sec: 22 },
  },
  {
    signalType: 'tiktok_account', signalTarget: 'therogerwakefield',
    activity_type: 'new_video',
    title: 'Overtightening pipes? Congrats — you cracked your fittings',
    preview: 'Common-mistake explainer — FlowCore could repurpose this as a "what not to DIY" series.',
    source_url: 'https://www.tiktok.com/@therogerwakefield/video/7489121518857751850',
    thumbnail_url: null,
    raw_payload: { video_id: '7489121518857751850', handle: 'therogerwakefield', caption: 'Overtightening your pipes? Congrats — you just cracked your fittings.', view_count: 92_400, like_count: 8_900, comment_count: 210, share_count: 540, duration_sec: 31 },
  },
  {
    signalType: 'tiktok_account', signalTarget: 'therogerwakefield',
    activity_type: 'new_video',
    title: 'A copper-coupling trick',
    preview: 'Trade-tip series — proven format, easy to copy with FlowCore\'s field crew.',
    source_url: 'https://www.tiktok.com/@therogerwakefield/video/7520367731301027086',
    thumbnail_url: null,
    raw_payload: { video_id: '7520367731301027086', handle: 'therogerwakefield', caption: 'A little plumbing trick I learned when working with a copper coupling...', view_count: 156_000, like_count: 14_200, comment_count: 380, share_count: 1_100, duration_sec: 41 },
  },
  {
    signalType: 'tiktok_account', signalTarget: 'therogerwakefield',
    activity_type: 'new_video',
    title: 'Plumbing with PEX',
    preview: 'PEX overview — direct competitor format for FlowCore\'s repipe service marketing.',
    source_url: 'https://www.tiktok.com/@therogerwakefield/video/7190855288394616110',
    thumbnail_url: null,
    raw_payload: { video_id: '7190855288394616110', handle: 'therogerwakefield', caption: 'Plumbing with PEX #fyp #plumber #plumbing #pex #plumbingtip', view_count: 638_000, like_count: 47_300, comment_count: 920, share_count: 2_400, duration_sec: 52 },
  },
  {
    signalType: 'tiktok_account', signalTarget: 'therogerwakefield',
    activity_type: 'new_video',
    title: 'Top power tools for plumbing',
    preview: 'Tool-recommendation post — strong affiliate-revenue format.',
    source_url: 'https://www.tiktok.com/@therogerwakefield/video/7222307168073174315',
    thumbnail_url: null,
    raw_payload: { video_id: '7222307168073174315', handle: 'therogerwakefield', caption: 'My TOP power tools pt. 1 #plumbing #plumber #tools #powertools #Dewalt', view_count: 421_000, like_count: 28_700, comment_count: 510, share_count: 1_350, duration_sec: 58 },
  },
  {
    signalType: 'tiktok_account', signalTarget: 'beaplumbertheysaid',
    activity_type: 'new_video',
    title: 'Effective Leak Repair Tips',
    preview: 'Mid-tier plumbing creator — content format FlowCore could replicate at lower cost.',
    source_url: 'https://www.tiktok.com/@beaplumbertheysaid/video/7444087946115943712',
    thumbnail_url: null,
    raw_payload: { video_id: '7444087946115943712', handle: 'beaplumbertheysaid', caption: 'Effective Leak Repair Tips from a Professional Plumber', view_count: 78_000, like_count: 6_400, comment_count: 140, share_count: 380, duration_sec: 44 },
  },

  // ── Google ads — anchored to real DFW plumbing/well company landing pages.
  //     The card links to the Transparency Center filtered by these real
  //     domains, which always returns the advertiser's actual current ads.
  {
    signalType: 'google_ads', signalTarget: 'AR-BakerBrothers',
    activity_type: 'google_ad_launched',
    title: 'Same-Day Plumber Service in Dallas',
    preview: 'Baker Brothers running a "same-day service" search ad targeting Dallas plumbing queries.',
    source_url: 'https://bakerbrothersplumbing.com/services/plumbing/',
    thumbnail_url: null,
    raw_payload: {
      headline: 'Same-Day Plumber Service in Dallas',
      description: 'Licensed, insured, and trusted in DFW since 1945. Call now — same-day appointments available.',
      landing_page_url: 'https://bakerbrothersplumbing.com/services/plumbing/',
      change_type: 'new_ad',
      ad_id: 'ar-baker-001',
    },
  },
  {
    signalType: 'google_ads', signalTarget: 'AR-BakerBrothers',
    activity_type: 'copy_changed',
    title: 'Water Heater Repair & Replacement | Baker Brothers',
    preview: 'Headline switched from "Affordable Water Heater Service" to a same-day install pitch.',
    source_url: 'https://bakerbrothersplumbing.com/services/water-heaters/',
    thumbnail_url: null,
    raw_payload: {
      headline: 'Water Heater Repair & Replacement | Baker Brothers',
      description: 'Tank or tankless — installed today by licensed Dallas pros. Free estimates.',
      landing_page_url: 'https://bakerbrothersplumbing.com/services/water-heaters/',
      change_type: 'headline_changed',
      ad_id: 'ar-baker-002',
    },
  },
  {
    signalType: 'google_ads', signalTarget: 'AR-Berkeys',
    activity_type: 'google_ad_launched',
    title: 'Trusted Fort Worth Plumbers — Berkeys',
    preview: 'Berkeys running a brand-search ad — they likely buying their own brand keyword.',
    source_url: 'https://www.berkeys.com/plumbing/',
    thumbnail_url: null,
    raw_payload: {
      headline: 'Trusted Fort Worth Plumbers — Berkeys',
      description: 'Family-owned and serving DFW since 1975. Plumbing, A/C, and electrical under one roof.',
      landing_page_url: 'https://www.berkeys.com/plumbing/',
      change_type: 'new_ad',
      ad_id: 'ar-berkeys-001',
    },
  },
  {
    signalType: 'google_ads', signalTarget: 'AR-MrRooter',
    activity_type: 'google_ad_launched',
    title: 'Drain Cleaning Specialists — Mr. Rooter Dallas',
    preview: 'Mr. Rooter pushing drain-cleaning specifically — high-margin emergency service.',
    source_url: 'https://www.mrrooter.com/dallas/services/drain-cleaning-services/',
    thumbnail_url: null,
    raw_payload: {
      headline: 'Drain Cleaning Specialists — Mr. Rooter Dallas',
      description: 'No travel charges, no overtime, no hidden fees. 24/7 emergency service.',
      landing_page_url: 'https://www.mrrooter.com/dallas/services/drain-cleaning-services/',
      change_type: 'new_ad',
      ad_id: 'ar-mrrooter-001',
    },
  },
  {
    signalType: 'google_ads', signalTarget: 'AR-BenjaminFranklin',
    activity_type: 'google_ad_launched',
    title: 'On-Time Plumbers — Benjamin Franklin Plumbing',
    preview: 'BenFranklin leaning on their punctuality guarantee — durable brand differentiator.',
    source_url: 'https://www.benjaminfranklinplumbing.com/dallas/services/',
    thumbnail_url: null,
    raw_payload: {
      headline: 'On-Time Plumbers — Benjamin Franklin Plumbing',
      description: 'If we\'re late, you don\'t pay a dime. Plumbing service in Dallas, on time, every time.',
      landing_page_url: 'https://www.benjaminfranklinplumbing.com/dallas/services/',
      change_type: 'new_ad',
      ad_id: 'ar-benfr-001',
    },
  },
  {
    signalType: 'google_ads', signalTarget: 'AR-BenjaminFranklin',
    activity_type: 'copy_changed',
    title: 'Trusted Dallas Plumbing — Benjamin Franklin',
    preview: 'BenFranklin tested a "trust" angle alongside the punctuality guarantee.',
    source_url: 'https://www.benjaminfranklinplumbing.com/dallas/',
    thumbnail_url: null,
    raw_payload: {
      headline: 'Trusted Dallas Plumbing — Benjamin Franklin',
      description: 'Background-checked technicians, upfront pricing, and the only on-time guarantee in DFW.',
      landing_page_url: 'https://www.benjaminfranklinplumbing.com/dallas/',
      change_type: 'headline_changed',
      ad_id: 'ar-benfr-002',
    },
  },
  {
    signalType: 'google_ads', signalTarget: 'AR-BakerBrothers',
    activity_type: 'google_ad_launched',
    title: 'Drain Cleaning Specialists — Baker Brothers',
    preview: 'Baker Brothers expanded into a service-specific ad focused on emergency drain cleaning.',
    source_url: 'https://bakerbrothersplumbing.com/services/drain-cleaning/',
    thumbnail_url: null,
    raw_payload: {
      headline: 'Drain Cleaning Specialists — Baker Brothers',
      description: 'Hydro-jetting, snake service, and camera inspection by licensed Dallas plumbers.',
      landing_page_url: 'https://bakerbrothersplumbing.com/services/drain-cleaning/',
      change_type: 'new_ad',
      ad_id: 'ar-baker-003',
    },
  },
  {
    signalType: 'google_ads', signalTarget: 'AR-Berkeys',
    activity_type: 'copy_changed',
    title: 'Dallas Tankless Water Heater Install',
    preview: 'Berkeys updated a tankless-water-heater ad with a more aggressive lead hook.',
    source_url: 'https://www.berkeys.com/plumbing/water-heaters/',
    thumbnail_url: null,
    raw_payload: {
      headline: 'Dallas Tankless Water Heater Install',
      description: 'Save 30% on energy and never run out of hot water. Free quote — local Berkeys plumbers.',
      landing_page_url: 'https://www.berkeys.com/plumbing/water-heaters/',
      change_type: 'headline_changed',
      ad_id: 'ar-berkeys-002',
    },
  },

  // ── Meta Ad Library (3 entries — flagged ephemeral by research pass; may 404) ──
  {
    signalType: 'meta_ads', signalTarget: 'facebook.com/BakerBrothersPlumbing',
    activity_type: 'ad_launched',
    title: 'Pure Plumbing & Air — Active campaign in Meta Ad Library',
    preview: 'A nationwide plumbing competitor running ads — sample creative pulled for benchmarking.',
    source_url: 'https://www.facebook.com/ads/library/?id=1167192774934165',
    thumbnail_url: null,
    raw_payload: { page_name: 'Pure Plumbing & Air', headline: 'Same-day plumbing service near you', primary_text: 'Licensed, insured, and 5-star rated. Book online or call 24/7.', cta: 'Call Now', platforms: ['Facebook', 'Instagram'], still_active: true, landing_url: 'https://pureplumbingandair.com/' },
  },
  {
    signalType: 'meta_ads', signalTarget: 'facebook.com/BenjaminFranklinPlumbing',
    activity_type: 'ad_launched',
    title: 'DeHart Plumbing Heating & Cooling — Ad Library entry',
    preview: 'Out-of-region plumber running aggressive Meta spend — useful for creative benchmarking.',
    source_url: 'https://www.facebook.com/ads/library/?id=959481852838723',
    thumbnail_url: null,
    raw_payload: { page_name: 'DeHart Plumbing Heating & Cooling', headline: 'Trusted local plumbers since 1949', primary_text: 'Family-owned. 75 years in the trade. Free estimates this week.', cta: 'Learn More', platforms: ['Facebook'], still_active: true, landing_url: 'https://dehartph.com/' },
  },
  {
    signalType: 'meta_ads', signalTarget: 'facebook.com/MrRooter',
    activity_type: 'ad_launched',
    title: 'AirSouth Cooling, Heating, Plumbing & Electrical — Ad Library',
    preview: 'Multi-trade competitor advertising in the Meta Ad Library.',
    source_url: 'https://www.facebook.com/ads/library/?id=1237723437503144',
    thumbnail_url: null,
    raw_payload: { page_name: 'AirSouth Cooling, Heating, Plumbing & Electrical', headline: 'Whole-home comfort — plumbing, HVAC & electrical', primary_text: 'One call. One company. Every system in your home.', cta: 'Get Quote', platforms: ['Facebook', 'Instagram'], still_active: true, landing_url: 'https://www.airsouthac.com/' },
  },
]

// Find the signal index for a real anchor by matching (type, target). Returns
// -1 if no matching signal exists in the seed; the anchor is then skipped.
function findSignalIndex(signals: SeedSignal[], type: SignalType, target: string): number {
  return signals.findIndex((s) => s.type === type && s.target === target)
}

// Round-robin interleave the real anchors by signalType so the first dozen
// timestamps span every channel — without this, blogs eat the first ten
// slots and TikTok / IG / Google ad cards only appear past page 1, which
// breaks the channel-specific tour steps.
function interleaveByType(anchors: RealAnchor[]): RealAnchor[] {
  const byType = new Map<SignalType, RealAnchor[]>()
  for (const a of anchors) {
    if (!byType.has(a.signalType)) byType.set(a.signalType, [])
    byType.get(a.signalType)!.push(a)
  }
  const queues = Array.from(byType.values())
  const out: RealAnchor[] = []
  let working = queues.filter((q) => q.length > 0).length
  while (working > 0) {
    for (const q of queues) {
      const next = q.shift()
      if (next) out.push(next)
    }
    working = queues.filter((q) => q.length > 0).length
  }
  return out
}

function emitRealAnchors(signals: SeedSignal[], now: number): SeedActivity[] {
  const out: SeedActivity[] = []
  const ordered = interleaveByType(REAL_ANCHORS)
  // Spread real anchors over the last ~3 days so they cluster as the most-recent
  // activity on the board (they show first when the user opens it).
  const stepMs = (3 * 24 * 60 * 60 * 1000) / Math.max(1, ordered.length)
  let counter = 0
  for (const a of ordered) {
    const sigIdx = findSignalIndex(signals, a.signalType, a.signalTarget)
    if (sigIdx === -1) continue
    const detected = new Date(now - counter * stepMs).toISOString()
    // Merge stored full article body + hero image + topic into the payload
    // when we have them (only for the website-channel real anchors we
    // WebFetched). Production ZenRows ingestion writes the same shape into
    // raw_payload (full_text, hero_image_url, blog_topic).
    const articleText = BLOG_CONTENT[a.source_url]
    const heroImage = BLOG_IMAGES[a.source_url]
    const topic = BLOG_TOPICS[a.source_url]
    const enrichedPayload = (articleText != null || heroImage != null || topic != null)
      ? {
          ...a.raw_payload,
          ...(articleText != null ? { full_text: articleText } : {}),
          ...(heroImage != null ? { hero_image_url: heroImage } : {}),
          ...(topic != null ? { blog_topic: topic } : {}),
        }
      : a.raw_payload
    out.push({
      signal_index: sigIdx,
      activity_type: a.activity_type,
      title: a.title,
      preview: a.preview,
      source_url: a.source_url,
      thumbnail_url: a.thumbnail_url,
      detected_at: detected,
      raw_payload: enrichedPayload,
      // Keep all real anchors as 'new' so they show on the default board view.
      status: 'new',
      dedup_key: `real-${a.signalType}-${counter}`,
      summary_text: null,
      summary_model: null,
    })
    counter++
  }
  return out
}

// ────────────────────── Public entry point ──────────────────────────────────
export function generateActivities(signals: SeedSignal[]): SeedActivity[] {
  const rng = mulberry32(FIXED_SEED)
  const now = Date.now()
  const out: SeedActivity[] = []

  // 1. Real anchors first — they get the most-recent timestamps so the demo
  //    opens with verified, click-through-able content at the top of the feed.
  out.push(...emitRealAnchors(signals, now))

  // Index signals by type
  const byType = new Map<string, number[]>()
  signals.forEach((s, i) => {
    if (!byType.has(s.type)) byType.set(s.type, [])
    byType.get(s.type)!.push(i)
  })

  // 2. Synthetic filler for volume + pagination demonstration. Older timestamps
  //    so they sort below the real anchors. We back-date the synthetic clock by
  //    4 days so there's a clear visual break between real and filler.
  //    Each row also gets a varied activity_type so the badge column shows a
  //    mix of "new", "edited", "removed", "rank loss" etc. — not just "new".
  const syntheticNow = now - 4 * 24 * 60 * 60 * 1000
  for (const [type, target] of Object.entries(TYPE_ALLOCATION)) {
    const indices = byType.get(type)
    if (!indices || indices.length === 0) continue
    const gen = GENERATORS[type]
    if (!gen) continue
    for (let n = 0; n < target; n++) {
      const sigIdx = indices[n % indices.length]!
      const row = gen(rng, signals[sigIdx]!, sigIdx, syntheticNow)
      // Override with a randomised event-type variant for visual diversity.
      // Skip seo_keyword — its variant (rank gain vs loss) is already decided
      // by genSeoRank based on the delta sign, so we don't re-randomise.
      if (type !== 'seo_keyword') {
        row.activity_type = pickVariant(type, rng)
      }
      out.push(row)
    }
  }

  // Pre-bake summaries on a sample
  const indices = new Set<number>()
  while (indices.size < PREBAKED_SUMMARY_COUNT && indices.size < out.length) {
    indices.add(Math.floor(rng() * out.length))
  }
  let summaryIdx = 0
  for (const i of indices) {
    const a = out[i]!
    const tpl = prebakedSummaries[summaryIdx % prebakedSummaries.length]!
    summaryIdx++
    const city = (a.raw_payload['target_city'] as string | undefined) ?? 'Fort Worth'
    const keyword = (a.raw_payload['keyword'] as string | undefined) ?? 'water well drilling'
    a.summary_text = tpl
      .replace('{city}', city)
      .replace('{keyword}', keyword)
    a.summary_model = SUMMARY_MODEL_TAG
  }

  return out
}
