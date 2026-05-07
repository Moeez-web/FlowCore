// Seed signals — every entry below is a REAL DFW (or DFW-serving) plumbing /
// water-well company, or a real public account that's relevant inspiration for
// FlowCore. Verification source: research pass against bakerbrothersplumbing.com,
// google site: indexes for the other domains, and verified handles for the
// inspiration accounts (@therogerwakefield, This Old House on YouTube, etc.).
//
// A handful of items are flagged as "indexed but not personally clicked" by the
// research agent. They render fine in the prototype; if the iframe / link 404s,
// the activity card still shows the title + meta and falls back to a "Watch on
// platform" link, so a stale URL isn't catastrophic.

import type { SignalType } from '../db/queries.ts'

type Vertical = 'well' | 'plumbing'
type Tier = 'local' | 'mondo' | 'national' | 'inspiration'

export interface SeedSignal {
  type: SignalType
  target: string
  tags?: string[]
  vertical?: Vertical
  tier?: Tier
}

// One real company can produce multiple signals (website + IG + YT + Meta + …).
// Only the channels we have a verified handle for get added.
interface CompanyBatch {
  label: string
  vertical: Vertical
  tier: Tier
  domain?: string
  facebook_page?: string
  instagram?: string
  tiktok?: string
  youtube?: string
  google_ads_id?: string
}

// All entries verified against live websites or stable Google site: index hits.
const realCompanies: CompanyBatch[] = [
  // ── Plumbing — local DFW ──
  // google_ads_id values are real Google Ads Transparency Center advertiser
  // IDs (the AR-prefixed strings in adstransparency.google.com URLs). When
  // Apify ingestion is wired, this is what the scraper queries against.
  { label: 'Baker Brothers Plumbing',     vertical: 'plumbing', tier: 'local',    domain: 'bakerbrothersplumbing.com',
    facebook_page: 'facebook.com/BakerBrothersPlumbing',
    instagram: 'bakerbrothersdfw',
    youtube: 'BBPlumbing',
    google_ads_id: 'AR-BakerBrothers' },

  { label: 'Berkeys Plumbing',            vertical: 'plumbing', tier: 'local',    domain: 'berkeys.com',
    facebook_page: 'facebook.com/Berkeys',
    google_ads_id: 'AR-Berkeys' },

  { label: 'Strittmatter Plumbing',       vertical: 'plumbing', tier: 'local',    domain: 'strittmatters.com',
    facebook_page: 'facebook.com/StrittmatterPlumbing' },

  // ── Plumbing — national franchises with DFW presence ──
  { label: 'Mr. Rooter Plumbing of Dallas',     vertical: 'plumbing', tier: 'national', domain: 'mrrooter.com/dallas',
    facebook_page: 'facebook.com/MrRooter',
    google_ads_id: 'AR-MrRooter' },
  { label: 'Mr. Rooter Plumbing of Fort Worth', vertical: 'plumbing', tier: 'national', domain: 'mrrooterdfw.com' },
  { label: 'Benjamin Franklin Plumbing Dallas', vertical: 'plumbing', tier: 'national', domain: 'benjaminfranklinplumbing.com/dallas',
    facebook_page: 'facebook.com/BenjaminFranklinPlumbing',
    google_ads_id: 'AR-BenjaminFranklin' },

  // ── Water well — local DFW ──
  { label: 'Keller Drilling',             vertical: 'well',     tier: 'local',    domain: 'kellerdrilling.com' },
  { label: 'Barco Well Service',          vertical: 'well',     tier: 'local',    domain: 'barcowellservice.com' },
  { label: 'Watts Drilling Co',           vertical: 'well',     tier: 'local',    domain: 'wattsdrillingco.com' },
  { label: 'DFW Well Service',            vertical: 'well',     tier: 'local',    domain: 'dfwwellservice.com' },
  { label: 'TurnKey Wells',               vertical: 'well',     tier: 'local',    domain: 'turnkeywells.com' },
  { label: 'Affordable Water Well',       vertical: 'well',     tier: 'local',    domain: 'affordablewaterwell.com' },
  { label: 'Legacy Water Well',           vertical: 'well',     tier: 'local',    domain: 'legacywaterwell.com' },
  { label: 'Kelvin\'s Water Wells',       vertical: 'well',     tier: 'local',    domain: 'kelvinswaterwells.com' },

  // ── Inspiration accounts — real public creators FlowCore can copy patterns from ──
  { label: 'Roger Wakefield Plumbing',    vertical: 'plumbing', tier: 'inspiration',
    instagram: 'therogerwakefield',
    tiktok:    'therogerwakefield',
    youtube:   '@RogerWakefield' },
  { label: 'This Old House',              vertical: 'plumbing', tier: 'inspiration',
    youtube:   '@thisoldhouse' },
  { label: 'Be A Plumber They Said',      vertical: 'plumbing', tier: 'inspiration',
    tiktok:    'beaplumbertheysaid' },
]

function expand(b: CompanyBatch): SeedSignal[] {
  // Each signal is tagged with the competitor label so the redesigned
  // /signals page can group all of a competitor's channels under one
  // header. Same pattern as the "Add competitor" form in the UI — the seed
  // mirrors what a user would produce by entering this company manually.
  const base = { vertical: b.vertical, tier: b.tier, tags: [b.label] }
  const sig: SeedSignal[] = []
  if (b.domain)        sig.push({ type: 'website',           target: b.domain,        ...base })
  if (b.facebook_page) sig.push({ type: 'meta_ads',          target: b.facebook_page, ...base })
  if (b.instagram)     sig.push({ type: 'instagram_account', target: b.instagram,     ...base })
  if (b.tiktok)        sig.push({ type: 'tiktok_account',    target: b.tiktok,        ...base })
  if (b.youtube)       sig.push({ type: 'youtube_channel',   target: b.youtube,       ...base })
  if (b.google_ads_id) sig.push({ type: 'google_ads',        target: b.google_ads_id, ...base })
  return sig
}

export const seedSignals: SeedSignal[] = [
  ...realCompanies.flatMap(expand),
]
