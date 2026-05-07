import { html, raw, type Raw } from '../lib/html.ts'
import { type ActivityRow, SIGNAL_TYPE_LABELS } from '../db/queries.ts'
import { icon } from '../lib/icons.ts'

const TYPE_TINT: Record<string, string> = {
  website:           'bg-slate-100 text-slate-700',
  meta_ads:          'bg-blue-100 text-blue-700',
  google_ads:        'bg-emerald-100 text-emerald-700',
  instagram_account: 'bg-pink-100 text-pink-700',
  tiktok_account:    'bg-pink-100 text-pink-700',
  youtube_channel:   'bg-red-100 text-red-700',
  seo_keyword:       'bg-purple-100 text-purple-700',
  backlink_profile:  'bg-indigo-100 text-indigo-700',
}

const TYPE_ICON: Record<string, string> = {
  website:           'website',
  meta_ads:          'meta_ads',
  google_ads:        'google_ads',
  instagram_account: 'instagram',
  tiktok_account:    'tiktok',
  youtube_channel:   'youtube_shorts',
  seo_keyword:       'seo',
  backlink_profile:  'seo',
}

const SEO_ACTIVITY_TYPES = new Set(['keyword_rank_gain', 'keyword_rank_loss'])
const BACKLINK_ACTIVITY_TYPES = new Set(['backlink_acquired', 'backlink_lost', 'anchor_text_changed'])

function visualType(a: ActivityRow): string {
  if (SEO_ACTIVITY_TYPES.has(a.activity_type)) return 'seo_keyword'
  if (BACKLINK_ACTIVITY_TYPES.has(a.activity_type)) return 'backlink_profile'
  return a.signal_type
}

// AI summary block.
//   Pre-fetch state: compact "AI Summarize" button → POSTs to /summary.
//   Generated state: a sparkle icon that shows a tooltip on click.
export function summarySection(a: ActivityRow, opts: { error?: string; autoOpen?: boolean } = {}): Raw {
  const id = String(a.id)
  if (a.summary_text && a.summary_text.length > 0) {
    return html`<div id="summary-section-${id}" class="inline-flex items-center">
      <button type="button"
              data-summary-toggle-btn
              data-summary-text="${a.summary_text.replace(/"/g, '&quot;').replace(/</g, '&lt;')}"
              class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-colors"
              aria-label="Show summary">
        ${icon('info')}
      </button>
    </div>`
  }

  const errorBlock = opts.error
    ? html`<p class="text-[11px] text-red-600 mt-1.5 px-2">${opts.error}</p>`
    : ''

  return html`<div id="summary-section-${id}" class="flex items-center gap-2"
       hx-on:click="event.stopPropagation()">
    <button type="button"
            hx-post="/activities/${id}/summary"
            hx-target="#summary-section-${id}"
            hx-swap="outerHTML"
            hx-disabled-elt="this"
            title="Generate a one-line content description via AI"
            class="ai-summarize-btn inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 border border-slate-200 bg-slate-50 text-slate-500 rounded-md hover:bg-slate-100 hover:text-slate-700 transition-colors disabled:cursor-wait disabled:opacity-90">
      <span class="ai-summarize-default inline-flex items-center gap-1.5">
        ${icon('sparkle')} Summarize
      </span>
      <span class="ai-summarize-loading inline-flex items-center gap-1.5">
        <span class="ai-spinner"></span>
        Generating…
      </span>
    </button>
    ${errorBlock}
  </div>`
}

function payloadDump(a: ActivityRow): Raw {
  let payload: unknown
  try { payload = JSON.parse(a.raw_payload_json) } catch { payload = a.raw_payload_json }
  const json = JSON.stringify(payload, null, 2)
  return html`<details class="bg-slate-50 border border-slate-200 rounded">
    <summary class="cursor-pointer px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Raw payload</summary>
    <pre class="px-3 pb-3 text-[11px] font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap">${json}</pre>
  </details>`
}

function triageActions(a: ActivityRow): Raw {
  const closeJs = "const d=document.getElementById('detail-drawer'); if(d)d.innerHTML=''"
  return html`<div class="flex gap-2">
    <button type="button"
            hx-post="/activities/${String(a.id)}/triage"
            hx-vals='{"action":"useful"}'
            hx-target="#activity-${String(a.id)}"
            hx-swap="outerHTML swap:200ms"
            hx-on::after-request="${closeJs}"
            class="text-sm font-semibold px-3 py-2 border border-green-300 bg-white text-green-700 rounded-md hover:bg-green-50 transition-colors flex-1">
      ✓ Mark Useful
    </button>
    <button type="button"
            hx-post="/activities/${String(a.id)}/triage"
            hx-vals='{"action":"skip"}'
            hx-target="#activity-${String(a.id)}"
            hx-swap="outerHTML swap:200ms"
            hx-on::after-request="${closeJs}"
            class="text-sm font-semibold px-3 py-2 border border-slate-300 bg-white text-slate-600 rounded-md hover:bg-slate-100 transition-colors flex-1">
      ✕ Skip
    </button>
  </div>`
}

function savedActions(a: ActivityRow): Raw {
  const closeJs = "const d=document.getElementById('detail-drawer'); if(d)d.innerHTML=''"
  return html`<div class="flex flex-col gap-2">
    <p class="text-xs text-emerald-700 font-medium flex items-center gap-1.5">
      <span class="text-base leading-none">✓</span> This is on your Saved list.
    </p>
    <div class="flex gap-2">
      <button type="button"
              hx-post="/activities/${String(a.id)}/triage"
              hx-vals='{"action":"unsave"}'
              hx-target="#activity-${String(a.id)}"
              hx-swap="outerHTML swap:200ms"
              hx-on::after-request="${closeJs}"
              class="text-sm font-semibold px-3 py-2 border border-slate-300 bg-white text-slate-600 rounded-md hover:bg-slate-100 transition-colors flex-1">
        ↩ Unsave
      </button>
      <button type="button"
              hx-post="/activities/${String(a.id)}/triage"
              hx-vals='{"action":"skip"}'
              hx-target="#activity-${String(a.id)}"
              hx-swap="outerHTML swap:200ms"
              hx-confirm="Permanently delete this saved activity?"
              hx-on::after-request="${closeJs}"
              class="text-sm font-semibold px-3 py-2 border border-rose-300 bg-white text-rose-600 rounded-md hover:bg-rose-50 transition-colors flex-1">
        ✕ Remove
      </button>
    </div>
  </div>`
}

export function activityDetail(a: ActivityRow): Raw {
  const vt = visualType(a)
  const tint = TYPE_TINT[vt] ?? 'bg-slate-100 text-slate-700'
  const iconKey = TYPE_ICON[vt] ?? 'website'
  const typeLabel = SIGNAL_TYPE_LABELS[a.signal_type] ?? a.signal_type
  const detected = new Date(a.detected_at).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  })
  const closeJs = "const d=document.getElementById('detail-drawer'); if(d)d.innerHTML=''"

  return html`<div data-drawer-backdrop
       class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
       hx-on:click="${closeJs}"></div>
  <aside data-drawer-panel
         class="fixed inset-y-0 right-0 w-full sm:w-[460px] md:w-[540px] bg-white shadow-2xl border-l border-slate-200 overflow-y-auto z-50">
    <div class="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-200 px-4 sm:px-5 py-3 flex items-center justify-between gap-3 z-10">
      <div class="flex items-center gap-3 min-w-0">
        <span class="inline-flex items-center justify-center w-9 h-9 rounded-lg ${tint} shrink-0">${icon(iconKey)}</span>
        <div class="min-w-0">
          <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">${typeLabel}</p>
          <p class="text-sm font-medium text-slate-800 truncate"><span class="font-mono text-xs">${a.signal_target}</span></p>
          ${a.signal_tags.length > 0
            ? html`<div class="flex items-center gap-1 mt-1 flex-wrap">
                ${a.signal_tags.map((tg) => html`<span class="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">${tg}</span>`)}
              </div>`
            : ''}
        </div>
      </div>
      <button type="button"
              hx-on:click="${closeJs}"
              class="text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded p-1.5 transition-colors shrink-0"
              aria-label="Close">${icon('close')}</button>
    </div>

    <div class="p-4 sm:p-5 space-y-5">
      <div>
        <h2 class="text-lg sm:text-xl font-bold text-slate-900 leading-snug">${a.title}</h2>
        ${a.preview ? html`<p class="text-sm text-slate-600 mt-2 leading-relaxed">${a.preview}</p>` : ''}
        <p class="text-xs text-slate-400 mt-2.5">Detected ${detected}</p>
      </div>

      ${summarySection(a)}

      ${a.source_url
        ? html`<a href="${a.source_url}" target="_blank" rel="noopener"
                  class="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline">
            ${icon('external')} Open source
          </a>`
        : ''}

      ${payloadDump(a)}

      <section class="pt-3 border-t border-slate-200">
        <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Triage</h3>
        ${a.status === 'new' ? triageActions(a) : savedActions(a)}
      </section>
    </div>
  </aside>`
}
