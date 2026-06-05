import { html, type Raw } from '../lib/html.ts'
import type { ActivityRow } from '../db/queries.ts'
import { icon } from '../lib/icons.ts'
import { summarySection } from './activity-detail.ts'

// ────────────────── Common bits shared by all card types ──────────────────

interface TypeStyle {
  label: string
  badge: string
  iconKey: string
  iconColor: string
  stripeBorder: string
  ribbon: string  // gradient for the top accent bar
}

const TYPE_STYLES: Record<string, TypeStyle> = {
  website:           { label: 'Website',     badge: 'bg-slate-100 text-slate-700',       iconKey: 'website',        iconColor: 'text-slate-500',  stripeBorder: 'border-l-slate-300',    ribbon: 'from-slate-400 to-slate-600' },
  meta_ads:          { label: 'Meta ad',     badge: 'bg-blue-100 text-blue-700',         iconKey: 'meta_ads',       iconColor: 'text-blue-500',   stripeBorder: 'border-l-blue-400',     ribbon: 'from-blue-500 to-indigo-600' },
  google_ads:        { label: 'Google ad',   badge: 'bg-emerald-100 text-emerald-700',   iconKey: 'google_ads',     iconColor: 'text-emerald-600',stripeBorder: 'border-l-emerald-400',  ribbon: 'from-emerald-500 to-teal-600' },
  instagram_account: { label: 'Instagram',   badge: 'bg-pink-100 text-pink-700',         iconKey: 'instagram',      iconColor: 'text-pink-500',   stripeBorder: 'border-l-pink-400',     ribbon: 'from-pink-500 via-purple-500 to-orange-400' },
  tiktok_account:    { label: 'TikTok',      badge: 'bg-pink-100 text-pink-700',         iconKey: 'tiktok',         iconColor: 'text-pink-500',   stripeBorder: 'border-l-pink-400',     ribbon: 'from-pink-500 to-fuchsia-600' },
  youtube_channel:   { label: 'YouTube',     badge: 'bg-red-100 text-red-700',           iconKey: 'youtube_shorts', iconColor: 'text-red-500',    stripeBorder: 'border-l-red-400',      ribbon: 'from-red-500 to-rose-600' },
  seo_keyword:       { label: 'SEO',         badge: 'bg-purple-100 text-purple-700',     iconKey: 'seo',            iconColor: 'text-purple-600', stripeBorder: 'border-l-purple-400',   ribbon: 'from-purple-500 to-violet-600' },
  backlink_profile:  { label: 'Backlink',    badge: 'bg-indigo-100 text-indigo-700',     iconKey: 'seo',            iconColor: 'text-indigo-600', stripeBorder: 'border-l-indigo-400',   ribbon: 'from-indigo-500 to-violet-600' },
}

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000))
  if (sec < 60) return `${sec}s ago`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day}d ago`
  return `${Math.round(day / 30)}mo ago`
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

function safePayload(a: ActivityRow): Record<string, unknown> {
  try { return JSON.parse(a.raw_payload_json) as Record<string, unknown> }
  catch { return {} }
}

// Extract a video id from a known platform URL so we can build an embed.
// Returns null if the URL doesn't look like a single-video page (e.g. a search
// results URL), in which case we fall back to a "Watch on platform" link.
function youtubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  return m && m[1] ? m[1] : null
}
function tiktokVideoId(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/tiktok\.com\/[^/]+\/video\/(\d+)/)
  return m && m[1] ? m[1] : null
}
function instagramShortcode(url: string | null | undefined): string | null {
  if (!url) return null
  const m = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
  return m && m[1] ? m[1] : null
}
function instagramIsReel(url: string | null | undefined): boolean {
  return !!url && /instagram\.com\/(?:[^/]+\/)?(?:reel|tv)\//.test(url)
}

// ── Activity-type badge ─────────────────────────────────────────────────────
// What kind of event the row represents — "new post", "post removed", "ad
// stopped", "rank gained", etc. Shown at the top of every card so the user
// can scan the feed and triage by event type at a glance.
interface BadgeSpec { label: string; tone: 'emerald' | 'rose' | 'amber' | 'blue' | 'pink' | 'slate' }
const ACTIVITY_BADGES: Record<string, BadgeSpec> = {
  // Website
  new_blog_post:           { label: 'New blog post',     tone: 'emerald' },
  new_landing_page:        { label: 'New landing page',  tone: 'emerald' },
  page_updated:            { label: 'Page updated',      tone: 'amber' },
  page_removed:            { label: 'Page removed',      tone: 'rose' },
  // Meta ads
  ad_launched:             { label: 'Ad launched',       tone: 'emerald' },
  ad_stopped:              { label: 'Ad stopped',        tone: 'slate' },
  creative_changed:        { label: 'Creative changed',  tone: 'amber' },
  copy_changed:            { label: 'Copy changed',      tone: 'amber' },
  meta_ad_launch:          { label: 'Ad launched',       tone: 'emerald' },
  // Google ads
  google_ads_change:       { label: 'Ad copy changed',   tone: 'amber' },
  google_ad_launched:      { label: 'New Google ad',     tone: 'emerald' },
  google_ad_disappeared:   { label: 'Ad pulled',         tone: 'slate' },
  // Instagram
  instagram_account_post:  { label: 'New post',          tone: 'pink' },
  new_post:                { label: 'New post',          tone: 'pink' },
  new_reel:                { label: 'New reel',          tone: 'pink' },
  post_deleted:            { label: 'Post removed',      tone: 'rose' },
  post_edited:             { label: 'Post edited',       tone: 'amber' },
  // TikTok
  tiktok_account_post:     { label: 'New TikTok',        tone: 'pink' },
  video_removed:           { label: 'Video removed',     tone: 'rose' },
  caption_edited:          { label: 'Caption edited',    tone: 'amber' },
  comment_burst:           { label: 'Comment spike',     tone: 'pink' },
  viral_threshold:         { label: 'Crossed viral',     tone: 'pink' },
  // YouTube
  youtube_short_post:      { label: 'New video',         tone: 'rose' },
  new_video:               { label: 'New video',         tone: 'rose' },
  video_unlisted:          { label: 'Video unlisted',    tone: 'amber' },
  view_milestone:          { label: 'View milestone',    tone: 'pink' },
  // SEO
  keyword_rank_gain:       { label: 'Rank gained',       tone: 'emerald' },
  keyword_rank_loss:       { label: 'Rank lost',         tone: 'rose' },
  // Backlinks
  backlink_acquired:       { label: 'New backlink',      tone: 'emerald' },
  backlink_lost:           { label: 'Backlink lost',     tone: 'rose' },
  anchor_text_changed:     { label: 'Anchor changed',    tone: 'amber' },
}
const TONE_CLASSES: Record<BadgeSpec['tone'], string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rose:    'bg-rose-50 text-rose-700 border-rose-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  pink:    'bg-pink-50 text-pink-700 border-pink-200',
  slate:   'bg-slate-100 text-slate-600 border-slate-200',
}
function activityBadge(activityType: string): Raw {
  // Default badge for unknown types → neutral slate "Update".
  const spec = ACTIVITY_BADGES[activityType] ?? { label: 'Update', tone: 'slate' as const }
  return html`<span class="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TONE_CLASSES[spec.tone]}">
    ${spec.label}
  </span>`
}

function cardHeader(a: ActivityRow): Raw {
  const t = TYPE_STYLES[visualType(a)] ?? TYPE_STYLES['website']!
  return html`<div class="flex items-start justify-between gap-2 mb-2 flex-wrap">
    <div class="flex items-center gap-2 text-xs flex-wrap">
      ${activityBadge(a.activity_type)}
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${t.badge}">
        <span class="${t.iconColor}">${icon(t.iconKey)}</span>${t.label}
      </span>
      ${a.signal_tags.length > 0
        ? html`<span class="flex items-center gap-1 flex-wrap">
            ${a.signal_tags.slice(0, 2).map((tg) => html`<span class="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">${tg}</span>`)}
            ${a.signal_tags.length > 2 ? html`<span class="text-[10px] text-slate-400 font-medium">+${String(a.signal_tags.length - 2)}</span>` : ''}
          </span>`
        : ''}
      <span class="font-mono text-[11px] text-slate-500 truncate max-w-[180px]">${a.signal_target}</span>
      <span class="text-slate-300">·</span>
      <span class="text-slate-500">${timeAgo(a.detected_at)}</span>
    </div>
    ${a.status === 'useful'
      ? html`<span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0 select-none cursor-default">
          <span class="text-sm leading-none">✓</span> Saved
        </span>`
      : a.status === 'skipped'
        ? html`<span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-500 border border-slate-200 shrink-0 select-none cursor-default">
            <span class="text-sm leading-none">✕</span> Skipped
          </span>`
        : ''}
  </div>`
}

function triageButtons(a: ActivityRow): Raw {
  // Skipped — show Restore + Useful buttons
  if (a.status === 'skipped') {
    return html`<div class="flex gap-2"
         hx-on:click="event.stopPropagation()">
      <button type="button"
              hx-post="/activities/${String(a.id)}/triage"
              hx-vals='{"action":"unsave"}'
              hx-target="#activity-${String(a.id)}"
              hx-swap="outerHTML"
              class="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 border-2 border-blue-300 bg-white text-blue-600 rounded-lg hover:bg-blue-50 active:scale-95 transition-all">
        <span class="text-base leading-none">↩</span> Restore
      </button>
      <button type="button"
              hx-post="/activities/${String(a.id)}/triage"
              hx-vals='{"action":"useful"}'
              hx-target="#activity-${String(a.id)}"
              hx-swap="outerHTML"
              class="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 text-green-700 rounded-lg hover:from-green-500 hover:to-emerald-600 hover:text-white hover:border-green-600 active:scale-95 transition-all shadow-sm">
        <span class="text-base leading-none">✓</span> Useful
      </button>
    </div>`
  }
  // Already saved on the board → Unsave + Remove. (Saved pill is in the card header.)
  if (a.status === 'useful') {
    return html`<div class="flex items-center gap-2 flex-wrap"
         hx-on:click="event.stopPropagation()">
      <button type="button"
              hx-post="/activities/${String(a.id)}/triage"
              hx-vals='{"action":"unsave"}'
              hx-target="#activity-${String(a.id)}"
              hx-swap="outerHTML"
              class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-2 border-slate-300 bg-white text-slate-600 rounded-lg hover:bg-slate-100 active:scale-95 transition-all"
              title="Move back to 'new' on the board">
        <span class="text-base leading-none">↩</span> Unsave
      </button>
      <button type="button"
              hx-post="/activities/${String(a.id)}/triage"
              hx-vals='{"action":"skip"}'
              hx-target="#activity-${String(a.id)}"
              hx-swap="outerHTML swap:200ms"
              class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-2 border-rose-300 bg-white text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white hover:border-rose-600 active:scale-95 transition-all"
              title="Delete permanently (also removes from Saved)">
        <span class="text-base leading-none">✕</span> Remove
      </button>
    </div>`
  }
  // Default new state — Useful keeps row visible w/ saved pill, Skip hard-deletes.
  return html`<div class="flex gap-2"
       hx-on:click="event.stopPropagation()">
    <button type="button"
            hx-post="/activities/${String(a.id)}/triage"
            hx-vals='{"action":"useful"}'
            hx-target="#activity-${String(a.id)}"
            hx-swap="outerHTML"
            class="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-100 text-green-700 rounded-lg hover:from-green-500 hover:to-emerald-600 hover:text-white hover:border-green-600 active:scale-95 transition-all shadow-sm">
      <span class="text-base leading-none">✓</span> Useful
    </button>
    <button type="button"
            hx-post="/activities/${String(a.id)}/triage"
            hx-vals='{"action":"skip"}'
            hx-target="#activity-${String(a.id)}"
            hx-swap="outerHTML swap:200ms"
            class="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 border-2 border-slate-300 bg-white text-slate-500 rounded-lg hover:bg-slate-700 hover:text-white hover:border-slate-700 active:scale-95 transition-all">
      <span class="text-base leading-none">✕</span> Skip
    </button>
  </div>`
}

function unsaveButton(a: ActivityRow): Raw {
  return html`<div class="flex items-center gap-2 flex-wrap" hx-on:click="event.stopPropagation()">
    <button type="button"
            hx-post="/activities/${String(a.id)}/triage"
            hx-vals='{"action":"unsave"}'
            hx-target="#activity-${String(a.id)}"
            hx-swap="outerHTML swap:200ms"
            title="Move back to 'new' on the board"
            class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-2 border-slate-300 bg-white text-slate-600 rounded-lg hover:bg-slate-100 active:scale-95 transition-all">
      <span class="text-base leading-none">↩</span> Unsave
    </button>
    <button type="button"
            hx-post="/activities/${String(a.id)}/triage"
            hx-vals='{"action":"skip"}'
            hx-target="#activity-${String(a.id)}"
            hx-swap="outerHTML swap:200ms"
            hx-confirm="Permanently delete this saved activity?"
            title="Delete permanently"
            class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-2 border-rose-300 bg-white text-rose-600 rounded-lg hover:bg-rose-600 hover:text-white hover:border-rose-600 active:scale-95 transition-all">
      <span class="text-base leading-none">✕</span> Remove
    </button>
  </div>`
}

function externalLink(href: string | null, label: string): Raw {
  if (!href) return html``
  return html`<a href="${href}" target="_blank" rel="noopener"
                 class="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                 hx-on:click="event.stopPropagation()">
    ${icon('external')}${label}
  </a>`
}

// ────────────────── Per-type card bodies ──────────────────

// Website — newspaper-style article preview. The full first paragraph shows
// (line-clamped to 6 lines so the card doesn't blow out vertically). Click
// the card → existing detail drawer opens with the full content. The CTA row
// has a strong "Read full post" button that opens the actual article in a
// new tab.
// Topic-themed CSS gradient + emoji icon used as a hero placeholder on blog
// cards/modals when no real image is available. Keeps cards looking
// article-like even though the source site JS-renders its hero images.
interface TopicVisual { gradient: string; emoji: string; label: string }
const BLOG_TOPIC_VISUALS: Record<string, TopicVisual> = {
  plumbing:       { gradient: 'from-cyan-600 via-sky-600 to-blue-700',     emoji: '🔧', label: 'Plumbing' },
  'water-heater': { gradient: 'from-orange-500 via-rose-500 to-red-600',   emoji: '🚿', label: 'Water heater' },
  thermostat:     { gradient: 'from-violet-600 via-indigo-600 to-blue-700',emoji: '🌡️', label: 'Thermostat' },
  hvac:           { gradient: 'from-amber-500 via-orange-500 to-rose-600', emoji: '❄️', label: 'HVAC' },
  air:            { gradient: 'from-teal-500 via-cyan-500 to-sky-600',     emoji: '💨', label: 'Indoor air' },
  well:           { gradient: 'from-emerald-600 via-teal-600 to-cyan-700', emoji: '⛲', label: 'Water well' },
}

function blogHero(heroImage: string | null, topic: string | null, edge: 'card' | 'modal'): Raw {
  const wrapClass = edge === 'card'
    ? 'aspect-[16/9] mb-1 bg-slate-100 overflow-hidden relative rounded-lg'
    : 'aspect-[16/9] bg-slate-100 overflow-hidden relative'
  if (heroImage) {
    return html`<div class="${wrapClass}">
      <img src="${heroImage}" alt="" loading="lazy"
           class="w-full h-full object-cover"
           onerror="this.parentElement.style.display='none'" />
    </div>`
  }
  const t = (topic && BLOG_TOPIC_VISUALS[topic]) || BLOG_TOPIC_VISUALS['plumbing']!
  return html`<div class="${wrapClass} bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white">
    <div class="text-center px-4">
      <div class="text-5xl sm:text-6xl mb-1 drop-shadow">${t.emoji}</div>
      <div class="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] opacity-90">${t.label}</div>
    </div>
    <div class="absolute inset-0 bg-black/10 pointer-events-none"></div>
  </div>`
}

function cardWebsite(a: ActivityRow, p: Record<string, unknown>): Raw {
  const isBlog = a.activity_type === 'new_blog_post'
  let domain = a.signal_target ?? ''
  try { domain = new URL(String(a.source_url ?? '')).hostname.replace(/^www\./, '') } catch { /* keep */ }
  const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : ''
  const wordCount = typeof p['word_count'] === 'number' ? Number(p['word_count']) : null
  const previewText = String(p['first_paragraph'] ?? a.preview ?? '')
  const fullText = typeof p['full_text'] === 'string' ? String(p['full_text']) : null
  const heroImage = typeof p['hero_image_url'] === 'string' && (p['hero_image_url'] as string).startsWith('http')
    ? String(p['hero_image_url'])
    : null
  const topic = typeof p['blog_topic'] === 'string' ? String(p['blog_topic']) : null
  // Render a hero band on blog cards (real image when we have one, themed
  // gradient otherwise) so the card reads as an article preview.
  const showHero = isBlog && (heroImage != null || topic != null)
  return html`<div class="flex flex-col gap-2.5">
    <div class="flex items-center gap-2 text-[11px] text-slate-500 pb-2 border-b border-slate-100">
      <img src="${favicon}" alt="" class="w-5 h-5 rounded bg-slate-100" />
      <span class="font-semibold text-slate-700 truncate">${domain}</span>
      <span class="text-slate-300">·</span>
      <span class="font-bold uppercase tracking-wider text-[10px] ${isBlog ? 'text-amber-700' : 'text-slate-600'}">${isBlog ? 'Blog post' : 'Landing page'}</span>
    </div>
    ${showHero ? blogHero(heroImage, topic, 'card') : ''}
    <h3 class="text-base sm:text-lg font-bold text-slate-900 leading-snug line-clamp-3" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">${a.title}</h3>
    ${previewText
      ? html`<p class="text-sm text-slate-600 leading-relaxed line-clamp-6">${previewText}</p>`
      : ''}
    <div class="flex items-center gap-2 text-[11px] flex-wrap">
      ${wordCount != null ? html`<span class="inline-flex items-center gap-1 text-slate-500">📖 ${String(wordCount)} words</span>` : ''}
      ${p['target_city'] ? html`<span class="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">📍 ${String(p['target_city'])}</span>` : ''}
      ${p['target_service'] ? html`<span class="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">🔧 ${String(p['target_service'])}</span>` : ''}
    </div>
    <div class="flex items-center gap-2 mt-1 flex-wrap">
      ${fullText
        ? html`<button type="button" data-article-open="${String(a.id)}"
                  class="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-md transition-colors"
                  hx-on:click="event.stopPropagation()">
            ${icon('external')} Read article
          </button>`
        : (a.source_url
          ? html`<a href="${a.source_url}" target="_blank" rel="noopener"
                    class="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-md transition-colors"
                    hx-on:click="event.stopPropagation()">
              ${icon('external')} ${isBlog ? 'Read full post' : 'Visit page'}
            </a>`
          : '')}
      ${fullText && a.source_url
        ? html`<a href="${a.source_url}" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                  hx-on:click="event.stopPropagation()">
            ${icon('external')} Open original
          </a>`
        : ''}
    </div>
    ${fullText ? articleModal(a, p, fullText, domain, heroImage, topic) : ''}
  </div>`
}

// Render the article body as a clean reader modal. The body uses a tiny
// markup convention: lines starting with "## " become <h3>, blank lines
// separate paragraphs, everything else is a <p>. Modal is hidden by default
// — a global click handler in layout.ts toggles the [hidden] attribute.
function articleModal(a: ActivityRow, p: Record<string, unknown>, fullText: string, domain: string | null, heroImage: string | null, topic: string | null): Raw {
  const id = String(a.id)
  const wordCount = typeof p['word_count'] === 'number' ? Number(p['word_count']) : null
  const minutes = wordCount != null ? Math.max(1, Math.round(wordCount / 220)) : null
  const blocks: Raw[] = []
  for (const block of fullText.split(/\n\s*\n/)) {
    const trimmed = block.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('## ')) {
      blocks.push(html`<h3 class="text-lg sm:text-xl font-bold text-slate-900 mt-6 mb-2" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">${trimmed.slice(3).trim()}</h3>`)
    } else {
      blocks.push(html`<p class="text-[15px] text-slate-700 leading-7 mb-4">${trimmed}</p>`)
    }
  }
  return html`<div id="article-modal-${id}" class="fc-article-modal" hidden>
    <div class="fc-article-backdrop" data-article-close></div>
    <div class="fc-article-card" role="dialog" aria-modal="true" aria-labelledby="article-title-${id}">
      <button type="button" data-article-close
              class="fc-article-close" aria-label="Close article">×</button>
      <div class="fc-article-scroll">
        ${(heroImage != null || topic != null) ? blogHero(heroImage, topic, 'modal') : ''}
        <div class="px-6 sm:px-10 pt-8 sm:pt-12 pb-2">
          <div class="flex items-center gap-2 text-[11px] text-slate-500 mb-4">
            <span class="font-semibold uppercase tracking-wider text-slate-600">${domain}</span>
            ${minutes != null ? html`<span class="text-slate-300">·</span><span>${String(minutes)} min read</span>` : ''}
          </div>
          <h2 id="article-title-${id}" class="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight mb-6" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">${a.title}</h2>
          <hr class="border-slate-200 mb-6" />
        </div>
        <div class="px-6 sm:px-10 pb-10">
          ${blocks}
        </div>
        <div class="px-6 sm:px-10 pb-8 pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap bg-slate-50">
          <p class="text-[11px] text-slate-500">Stored copy from ${domain}. Open original to compare against the live page.</p>
          ${a.source_url
            ? html`<a href="${a.source_url}" target="_blank" rel="noopener"
                      class="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-white rounded-md transition-colors">
                ${icon('external')} Open original
              </a>`
            : ''}
        </div>
      </div>
    </div>
  </div>`
}

// Meta ad — Facebook-style card with page header, ad body text, media
// (video with inline playback or image creative), headline, and CTA.
function cardMetaAd(a: ActivityRow, p: Record<string, unknown>): Raw {
  const creative = String(p['creative_url'] ?? a.thumbnail_url ?? '')
  const rawVideoUrl = typeof p['video_url'] === 'string' && p['video_url'] ? String(p['video_url']) : null
  const videoUrl = rawVideoUrl ? `/proxy/media?url=${encodeURIComponent(rawVideoUrl)}` : null
  const headline = String(p['headline'] ?? a.title)
  const primaryText = String(p['primary_text'] ?? '')
  const displayFormat = String(p['display_format'] ?? '')
  const platforms = Array.isArray(p['platforms']) ? (p['platforms'] as string[]).join(' · ') : 'Facebook · Instagram'
  const pageName = String(p['page_name'] ?? a.signal_target)
  const stillActive = p['still_active'] === true
  const hasStatus = p['still_active'] !== undefined
  let landingHost = ''
  try { landingHost = new URL(String(p['landing_url'] ?? a.source_url ?? '')).hostname.replace(/^www\./, '') } catch { /* keep */ }
  const pageSearchUrl = `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=US&search_type=keyword_unordered&q=${encodeURIComponent(pageName)}`
  const isVideo = displayFormat === 'VIDEO' || !!videoUrl
  return html`<div class="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
    <div class="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
      <span class="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
        ${pageName.charAt(0).toUpperCase()}
      </span>
      <div class="flex-1 min-w-0 leading-tight">
        <p class="text-[13px] font-semibold text-slate-900 truncate">${pageName}</p>
        <p class="text-[10px] text-slate-500 inline-flex items-center gap-1">
          Sponsored · <span class="text-slate-400 truncate">${platforms}</span>
        </p>
      </div>
      ${hasStatus && stillActive
        ? html`<span class="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded inline-flex items-center gap-1">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> LIVE
          </span>`
        : hasStatus && !stillActive
          ? html`<span class="text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Ended</span>`
          : ''}
    </div>
    ${primaryText
      ? html`<div class="px-3 py-2.5 text-[13px] text-slate-700 leading-snug max-h-[120px] overflow-y-auto">${primaryText}</div>`
      : ''}
    ${isVideo && videoUrl
      ? html`<div class="w-full aspect-video bg-black relative" data-video-thumb data-video-src="${videoUrl}">
          ${creative
            ? html`<img src="${creative}" alt="" class="absolute inset-0 w-full h-full object-cover"
                        onerror="this.style.display='none'" />`
            : ''}
          <button type="button" data-play-video
                  class="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"
                  aria-label="Play video">
            <span class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white/90 shadow-lg">
              <span class="ml-1 w-0 h-0 border-l-[14px] border-l-blue-600 border-y-[10px] border-y-transparent"></span>
            </span>
          </button>
        </div>`
      : creative
        ? html`<div class="w-full aspect-[1.91/1] bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
            <img src="${creative}" alt="" class="absolute inset-0 w-full h-full object-cover"
                 onerror="this.style.display='none'" />
          </div>`
        : html`<div class="w-full aspect-[1.91/1] bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center text-blue-400">
            <span class="text-4xl mb-2">${icon('meta_ads')}</span>
            <span class="text-[11px] font-bold">${displayFormat || 'Ad'} creative</span>
          </div>`
    }
    <div class="px-3 py-2.5 bg-slate-50 border-t border-slate-100">
      ${landingHost ? html`<p class="text-[10px] uppercase tracking-wider text-slate-400">${landingHost}</p>` : ''}
      <p class="text-sm font-bold text-slate-900">${headline}</p>
      ${p['cta_text'] ? html`<p class="text-[11px] text-blue-600 font-semibold mt-1">${String(p['cta_text'])}</p>` : ''}
    </div>
    <a href="${pageSearchUrl}" target="_blank" rel="noopener"
       class="block bg-blue-600 hover:bg-blue-700 text-white text-center text-xs font-bold px-3 py-2.5 transition-colors">
      ${icon('external')} See all live ads from ${pageName}
    </a>
  </div>`
}

// Google ad — SERP-entry mock + an inline "Preview landing page" iframe slide
// + a "See all live ads" link to the advertiser's Google Ads Transparency
// Center page. Some sites send X-Frame-Options: SAMEORIGIN which makes the
// iframe blank; the "Open in new tab" anchor + "See all live ads" links are
// the always-works fallbacks.
function cardGoogleAd(a: ActivityRow, p: Record<string, unknown>): Raw {
  const id = String(a.id)
  const headline = String(p['headline'] ?? a.title)
  const description = String(p['description'] ?? '')
  const url = String(p['url'] ?? p['landing_page_url'] ?? a.source_url ?? '')
  const position = typeof p['position'] === 'number' ? Number(p['position']) : null
  let host = url
  try { host = new URL(url).hostname.replace(/^www\./, '') } catch { /* keep */ }
  const transparencyUrl = host
    ? `https://adstransparency.google.com/?region=US&domain=${encodeURIComponent(host)}`
    : 'https://adstransparency.google.com/?region=US'
  return html`<div class="flex flex-col gap-2">
    <p class="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Google ad ${position ? `· #${position}` : ''}</p>
    <a href="${url}" target="_blank" rel="noopener"
       class="block bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all"
       hx-on:click="event.stopPropagation()">
      <div class="flex items-center gap-1.5 mb-1.5 text-[11px]">
        <span class="font-semibold text-slate-900">Sponsored</span>
        <span class="text-slate-300">·</span>
        <span class="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-100 border border-slate-200 text-[8px] font-bold text-slate-500">i</span>
      </div>
      <p class="text-[12px] text-slate-600 truncate font-mono">${host}</p>
      <h3 class="text-lg font-medium text-blue-800 group-hover:underline leading-tight mt-0.5">${headline}</h3>
      ${description
        ? html`<p class="text-[13px] text-slate-700 mt-1 line-clamp-2 leading-snug">${description}</p>`
        : ''}
    </a>

    <!-- Inline iframe preview of the landing page (slides down on click).
         Some sites block embedding via X-Frame-Options — if so the iframe
         appears blank and the user falls back to the new-tab link above. -->
    ${url
      ? html`<div id="ad-preview-${id}" class="ad-preview-wrap" data-ad-preview data-preview-url="${url}">
          <button type="button" data-ad-preview-btn
                  class="w-full inline-flex items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-slate-700 transition-colors">
            <span>Preview landing page</span>
            <span class="text-base font-bold transition-transform duration-300" data-ad-preview-chevron>▾</span>
          </button>
          <div class="ad-preview-slide">
            <div class="overflow-hidden">
              <div class="pt-2">
                <div class="ad-preview-frame relative w-full aspect-[4/3] rounded-md border border-slate-200 bg-white overflow-hidden"></div>
                <p class="text-[10px] text-slate-400 mt-1.5">If the preview stays blank, this site blocks embedding — open it in a new tab instead.</p>
              </div>
            </div>
          </div>
        </div>`
      : ''}

    <a href="${transparencyUrl}" target="_blank" rel="noopener"
       class="inline-flex items-center justify-center gap-1 text-xs font-bold px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
       hx-on:click="event.stopPropagation()">
      ${icon('external')} See all live Google ads from ${host || 'advertiser'}
    </a>
  </div>`
}

// Instagram — IG post mockup: gradient-ringed avatar + handle, square image,
// IG action row (heart / comment / send) and "X likes" line. Supports reels,
// carousels (dot indicator), and hashtags.
function cardInstagramPost(a: ActivityRow, p: Record<string, unknown>): Raw {
  const image = String(p['image_url'] ?? a.thumbnail_url ?? '')
  const videoUrl = typeof p['video_url'] === 'string' && p['video_url'] ? String(p['video_url']) : null
  const handle = String(p['handle'] ?? a.signal_target)
  const caption = String(p['caption'] ?? a.title)
  const likes = Number(p['like_count'] ?? 0)
  const comments = Number(p['comment_count'] ?? 0)
  const videoViews = Number(p['video_views'] ?? 0)
  const isReel = p['product_type'] === 'clips'
  const isSidecar = p['post_type'] === 'Sidecar' || (Array.isArray(p['child_posts']) && (p['child_posts'] as unknown[]).length > 0)
  const hashtags = Array.isArray(p['hashtags']) ? (p['hashtags'] as string[]).slice(0, 3) : []
  return html`<div class="border border-slate-200 rounded-lg overflow-hidden bg-white">
    <div class="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
      <span class="inline-block p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
        <span class="block w-7 h-7 rounded-full bg-white p-[2px]">
          <span class="flex items-center justify-center w-full h-full rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
            ${handle.charAt(0).toUpperCase()}
          </span>
        </span>
      </span>
      <p class="text-[13px] font-semibold text-slate-900 flex-1 truncate">${handle}</p>
      ${isReel
        ? html`<span class="inline-flex items-center text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gradient-to-r from-pink-500 to-purple-500 text-white">Reel</span>`
        : isSidecar
          ? html`<span class="text-slate-400 text-sm leading-none" title="Carousel">▦</span>`
          : ''}
      <span class="text-slate-400 text-base leading-none">···</span>
    </div>
    <div class="aspect-square bg-gradient-to-br from-yellow-200 via-pink-200 to-purple-300 relative overflow-hidden"
         data-video-thumb ${videoUrl ? html`data-video-src="${videoUrl}"` : ''}>
      ${image
        ? html`<img src="${image}" alt="" class="absolute inset-0 w-full h-full object-cover"
                    onerror="this.style.display='none'" />`
        : html`<div class="absolute inset-0 flex items-center justify-center text-white/80 text-5xl pointer-events-none">${icon('instagram')}</div>`}
      ${videoUrl
        ? html`<button type="button" data-play-video
                       class="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors"
                       aria-label="Play video">
            <span class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-lg">
              <span class="ml-1 w-0 h-0 border-l-[14px] border-l-pink-600 border-y-[10px] border-y-transparent"></span>
            </span>
          </button>`
        : ''}
      ${isSidecar
        ? html`<span class="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-black/50 text-white text-xs">▦</span>`
        : ''}
    </div>
    <div class="px-3 pt-2 pb-1 flex items-center gap-3 text-slate-700">
      <span class="text-lg leading-none">♡</span>
      <span class="text-base leading-none">💬</span>
      <span class="text-base leading-none">↗</span>
    </div>
    <div class="px-3 pb-2">
      <p class="text-[13px] font-bold text-slate-900">
        ${fmtCount(likes)} likes${videoViews > 0 ? html` <span class="text-slate-400 mx-0.5">·</span> ▶ ${fmtCount(videoViews)}` : ''}
      </p>
      ${caption
        ? html`<p class="text-[13px] text-slate-700 line-clamp-2 mt-0.5"><span class="font-semibold">${handle}</span> ${caption}</p>`
        : ''}
      ${comments > 0
        ? html`<p class="text-[11px] text-slate-400 mt-1">View all ${fmtCount(comments)} comments</p>`
        : ''}
      ${hashtags.length > 0
        ? html`<div class="flex items-center gap-1 mt-1.5 flex-wrap">
            ${hashtags.map((tag) => html`<span class="text-[10px] font-semibold text-blue-500">#${tag}</span>`)}
          </div>`
        : ''}
    </div>
    <div class="px-3 pb-2 border-t border-slate-100 pt-2">
      ${externalLink(a.source_url, 'Open on Instagram')}
    </div>
  </div>`
}

// TikTok — vertical 9:16 video fills card width. Thumb above, caption +
// engagement row below. Card auto-sizes to its natural height in the grid.
function cardTikTok(a: ActivityRow, p: Record<string, unknown>): Raw {
  const thumb = String(p['cover_url'] ?? p['thumbnail_url'] ?? a.thumbnail_url ?? '')
  const videoUrl = typeof p['video_url'] === 'string' && p['video_url'] ? String(p['video_url']) : null
  const isViral = !!p['is_viral']
  const handle = String(p['handle'] ?? a.signal_target)
  const caption = String(p['caption'] ?? a.title)
  const views = Number(p['view_count'] ?? 0)
  const likes = Number(p['like_count'] ?? 0)
  const comments = Number(p['comment_count'] ?? 0)
  const shares = Number(p['share_count'] ?? 0)
  const duration = typeof p['duration_sec'] === 'number' ? Number(p['duration_sec']) : null
  return html`<div class="flex flex-col gap-3">
    <div class="relative w-full aspect-[9/16] rounded-xl overflow-hidden shadow-md ring-1 ring-black/10
                bg-gradient-to-br from-slate-900 via-fuchsia-900 to-pink-900"
         data-video-thumb ${videoUrl ? html`data-video-src="${videoUrl}"` : ''}>
      ${thumb ? html`<img src="${thumb}" alt="" class="absolute inset-0 w-full h-full object-cover"
                           onerror="this.style.display='none'" />` : ''}
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none"></div>
      <span class="absolute top-2 right-2 text-white pointer-events-none">${icon('tiktok')}</span>
      ${isViral
        ? html`<span class="absolute top-2 left-2 inline-flex items-center gap-0.5 text-[10px] font-black bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white px-2 py-0.5 rounded shadow-md pointer-events-none">🔥 VIRAL</span>`
        : ''}
      ${videoUrl
        ? html`<button type="button" data-play-video
                       class="absolute inset-0 flex items-center justify-center group/play"
                       aria-label="Play TikTok">
            <span class="w-14 h-14 rounded-full bg-white/20 backdrop-blur flex items-center justify-center group-hover/play:bg-white/35 group-hover/play:scale-110 transition-all">
              <span class="ml-1 w-0 h-0 border-l-[14px] border-l-white border-y-[10px] border-y-transparent"></span>
            </span>
          </button>`
        : ''}
      ${duration != null
        ? html`<span class="absolute bottom-12 right-2 text-[10px] font-mono bg-black/60 text-white px-1.5 py-0.5 rounded pointer-events-none">${String(duration)}s</span>`
        : ''}
      <div class="absolute inset-x-2 bottom-2 text-white drop-shadow leading-tight pointer-events-none">
        <p class="text-xs font-bold truncate">@${handle}</p>
        <p class="text-[11px] opacity-90 mt-0.5">▶ ${fmtCount(views)}</p>
      </div>
    </div>
    <div class="flex flex-col gap-1.5">
      <p class="text-[10px] font-bold uppercase tracking-wider text-pink-700">@${handle}</p>
      <p class="text-sm text-slate-800 leading-snug line-clamp-3">${caption}</p>
      <div class="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap pt-1">
        <span class="inline-flex items-center gap-1"><span class="text-pink-500">♥</span>${fmtCount(likes)}</span>
        ${comments > 0 ? html`<span class="inline-flex items-center gap-1"><span class="text-slate-400">💬</span>${fmtCount(comments)}</span>` : ''}
        ${shares > 0 ? html`<span class="inline-flex items-center gap-1"><span class="text-slate-400">↗</span>${fmtCount(shares)}</span>` : ''}
      </div>
      ${externalLink(a.source_url, 'Watch on TikTok')}
    </div>
  </div>`
}

// YouTube — 16:9 thumbnail with the iconic red play button overlay, channel
// chip, video title, then "X views · Y ago" line in the YouTube card style.
function cardYouTube(a: ActivityRow, p: Record<string, unknown>): Raw {
  const thumb = String(p['thumbnail_url'] ?? a.thumbnail_url ?? '')
  const channel = String(p['channel'] ?? a.signal_target)
  const title = String(p['title'] ?? a.title)
  const views = Number(p['view_count'] ?? 0)
  const likes = Number(p['like_count'] ?? 0)
  const duration = typeof p['duration_sec'] === 'number' ? Number(p['duration_sec']) : null
  const durLabel = duration != null
    ? duration >= 60 ? `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}` : `0:${String(duration).padStart(2, '0')}`
    : null
  const ytId = youtubeVideoId(a.source_url) ?? String(p['video_id'] ?? '')
  const embedUrl = ytId ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0` : ''
  return html`<div class="flex flex-col gap-3">
    <div class="relative w-full aspect-video rounded-lg overflow-hidden shadow-md ring-1 ring-black/10
                bg-gradient-to-br from-slate-800 to-slate-950"
         data-video-thumb data-embed-url="${embedUrl}">
      ${thumb ? html`<img src="${thumb}" alt="" class="absolute inset-0 w-full h-full object-cover"
                           onerror="this.style.display='none'" />` : ''}
      <div class="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
      ${embedUrl
        ? html`<button type="button" data-play-video
                       class="absolute inset-0 flex items-center justify-center group/play"
                       aria-label="Play video">
            <span class="inline-flex items-center justify-center w-16 h-11 rounded-lg bg-red-600 shadow-xl group-hover/play:bg-red-700 group-hover/play:scale-110 transition-all">
              <span class="ml-1 w-0 h-0 border-l-[15px] border-l-white border-y-[10px] border-y-transparent"></span>
            </span>
          </button>`
        : html`<div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span class="inline-flex items-center justify-center w-14 h-9 rounded-md bg-red-600 shadow-lg">
              <span class="ml-0.5 w-0 h-0 border-l-[13px] border-l-white border-y-[8px] border-y-transparent"></span>
            </span>
          </div>`}
      ${durLabel
        ? html`<span class="absolute bottom-2 right-2 text-[11px] font-mono font-semibold bg-black/85 text-white px-1.5 py-0.5 rounded pointer-events-none">${durLabel}</span>`
        : ''}
    </div>
    <div class="flex flex-col gap-1.5">
      <h3 class="text-sm font-semibold text-slate-900 leading-snug line-clamp-2">${title}</h3>
      <p class="text-xs text-slate-600 inline-flex items-center gap-1.5">
        <span class="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600">${icon('youtube_shorts')}</span>
        <span class="font-semibold truncate">${channel}</span>
      </p>
      <p class="text-[11px] text-slate-500">
        ${fmtCount(views)} views
        ${likes > 0 ? html` · ${fmtCount(likes)} likes` : ''}
      </p>
      ${externalLink(a.source_url, 'Watch on YouTube')}
    </div>
  </div>`
}

function cardSeoRank(a: ActivityRow, p: Record<string, unknown>): Raw {
  const prev = Number(p['prev_position'] ?? 0)
  const next = Number(p['new_position'] ?? 0)
  const delta = Number(p['delta'] ?? 0)
  const gain = delta > 0
  const cls = gain ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
  const sign = gain ? '+' : ''
  return html`<div class="flex flex-col gap-2">
    <div>
      <p class="text-[10px] font-bold uppercase tracking-wider text-purple-700">SEO rank change</p>
      <h3 class="text-base font-semibold text-slate-900 leading-snug font-mono">"${String(p['keyword'] ?? a.signal_target)}"</h3>
    </div>
    <div class="flex items-stretch gap-2">
      <div class="flex-1 bg-slate-50 rounded-md p-2.5 text-center">
        <p class="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Was</p>
        <p class="text-2xl font-bold text-slate-700 mt-0.5">#${String(prev)}</p>
      </div>
      <div class="flex items-center px-1 text-slate-300">→</div>
      <div class="flex-1 bg-slate-50 rounded-md p-2.5 text-center">
        <p class="text-[10px] uppercase tracking-wide text-slate-500 font-semibold">Now</p>
        <p class="text-2xl font-bold text-slate-900 mt-0.5">#${String(next)}</p>
      </div>
      <div class="flex-1 rounded-md p-2.5 text-center ${cls}">
        <p class="text-[10px] uppercase tracking-wide font-semibold opacity-80">Δ</p>
        <p class="text-2xl font-bold mt-0.5">${sign}${String(delta)}</p>
      </div>
    </div>
    ${externalLink(a.source_url, 'Search on Google')}
  </div>`
}

function cardBacklink(a: ActivityRow, p: Record<string, unknown>): Raw {
  const da = Number(p['source_da'] ?? 0)
  const daClass = da >= 80 ? 'bg-green-100 text-green-800' : da >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
  return html`<div class="flex flex-col gap-2">
    <p class="text-[10px] font-bold uppercase tracking-wider text-indigo-700">New backlink acquired</p>
    <div class="flex items-center gap-2 flex-wrap">
      <span class="font-semibold text-slate-900">${String(p['source_domain'] ?? '')}</span>
      <span class="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${daClass}">DA ${String(da)}</span>
    </div>
    <p class="text-xs text-slate-600">Anchor: <span class="italic">"${String(p['anchor_text'] ?? '')}"</span></p>
    <p class="text-[11px] text-slate-500 font-mono break-all">→ ${String(p['target_url'] ?? '')}</p>
    ${externalLink(a.source_url, 'Visit source domain')}
  </div>`
}

const CARD_BODIES: Record<string, (a: ActivityRow, p: Record<string, unknown>) => Raw> = {
  website:           cardWebsite,
  meta_ads:          cardMetaAd,
  google_ads:        cardGoogleAd,
  instagram_account: cardInstagramPost,
  tiktok_account:    cardTikTok,
  youtube_channel:   cardYouTube,
}

const SEO_ACTIVITY_TYPES = new Set(['keyword_rank_gain', 'keyword_rank_loss'])
const BACKLINK_ACTIVITY_TYPES = new Set(['backlink_acquired', 'backlink_lost', 'anchor_text_changed'])

// SEO and backlink activities are now tied to website signals but need their
// own visual style and card renderer. Route by activity_type when applicable.
function visualType(a: ActivityRow): string {
  if (SEO_ACTIVITY_TYPES.has(a.activity_type)) return 'seo_keyword'
  if (BACKLINK_ACTIVITY_TYPES.has(a.activity_type)) return 'backlink_profile'
  return a.signal_type ?? 'website'
}

function renderBody(a: ActivityRow, payload: Record<string, unknown>): Raw {
  if (SEO_ACTIVITY_TYPES.has(a.activity_type)) return cardSeoRank(a, payload)
  if (BACKLINK_ACTIVITY_TYPES.has(a.activity_type)) return cardBacklink(a, payload)
  const fn = CARD_BODIES[a.signal_type ?? 'website'] ?? CARD_BODIES['website']!
  return fn(a, payload)
}

// ────────────────── Public render ──────────────────

export interface RowOpts {
  /** 'board' = show Useful/Skip; 'saved' = show Unsave */
  context?: 'board' | 'saved'
}

export function activityRow(a: ActivityRow, opts: RowOpts = {}): Raw {
  const context = opts.context ?? 'board'
  const vt = visualType(a)
  const t = TYPE_STYLES[vt] ?? TYPE_STYLES['website']!
  const payload = safePayload(a)

  return html`<article id="activity-${String(a.id)}"
      class="activity-card bg-white border border-slate-200 ${t.stripeBorder} border-l-4 rounded-xl overflow-hidden shadow-sm break-inside-avoid mb-3 sm:mb-4">
    <div class="h-1 bg-gradient-to-r ${t.ribbon}"></div>
    <div class="p-3 sm:p-4">
      ${cardHeader(a)}
      ${renderBody(a, payload)}
      <!-- Footer: AI button + triage share a row when AI is compact. When AI
           expands to its full slide panel (w-full), triage wraps to the next
           line; ml-auto on triage keeps it pinned to the right. -->
      <div class="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-3 flex-wrap">
        ${summarySection(a)}
        <div class="ml-auto flex items-center">
          ${context === 'saved' ? unsaveButton(a) : triageButtons(a)}
        </div>
      </div>
    </div>
  </article>`
}
