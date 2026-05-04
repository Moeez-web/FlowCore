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

// AI summary block.
//   Pre-fetch state: compact "AI Summarize" button → POSTs to /summary.
//   Generated state: a "View AI summary" button + a hidden popup modal
//     containing the summary text. Click → modal pops up. After htmx
//     finishes generating a fresh summary, the new section auto-opens
//     the modal once via [data-modal-auto-open].
export function summarySection(a: ActivityRow, opts: { error?: string; autoOpen?: boolean } = {}): Raw {
  const id = String(a.id)
  if (a.summary_text && a.summary_text.length > 0) {
    const modalId = `summary-modal-${id}`
    const autoOpenAttr = opts.autoOpen ? raw(`data-modal-auto-open="${modalId}"`) : raw('')
    return html`<div id="summary-section-${id}" class="inline-flex items-center" hx-on:click="event.stopPropagation()" ${autoOpenAttr}>
      <button type="button"
              data-modal-open="${modalId}"
              title="Show the AI summary"
              class="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 rounded-lg hover:from-blue-500 hover:to-indigo-600 hover:text-white hover:border-blue-600 active:scale-95 transition-all">
        ${icon('eye')} View AI summary
      </button>
      <div id="${modalId}" class="fc-article-modal" hidden hx-on:click="event.stopPropagation()">
        <div class="fc-article-backdrop" data-article-close></div>
        <div class="fc-article-card fc-summary-card" role="dialog" aria-modal="true" aria-labelledby="summary-title-${id}">
          <button type="button" data-article-close class="fc-article-close" aria-label="Close summary">×</button>
          <div class="fc-article-scroll">
            <div class="px-6 sm:px-8 pt-7 sm:pt-9 pb-6">
              <div class="flex items-center gap-2 text-[11px] text-blue-600 font-bold uppercase tracking-[0.18em] mb-3">
                ${icon('sparkle')} <span>AI Summary</span>
              </div>
              <h2 id="summary-title-${id}" class="text-lg sm:text-xl font-bold text-slate-900 leading-snug mb-4" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">${a.title}</h2>
              <p class="text-[15px] text-slate-800 leading-7 whitespace-pre-line">${a.summary_text}</p>
              <p class="text-[10px] text-blue-700 font-semibold mt-5 uppercase tracking-wide">${a.summary_model ?? 'OpenRouter'}</p>
            </div>
          </div>
        </div>
      </div>
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
            title="Generate a 2–3 sentence FlowCore-specific briefing via OpenRouter"
            class="ai-summarize-btn inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 rounded-lg hover:from-blue-500 hover:to-indigo-600 hover:text-white hover:border-blue-600 active:scale-95 transition-all disabled:cursor-wait disabled:opacity-90 disabled:hover:from-blue-50 disabled:hover:to-indigo-50 disabled:hover:text-blue-700 disabled:hover:border-blue-300">
      <span class="ai-summarize-default inline-flex items-center gap-1.5">
        ${icon('sparkle')} AI Summarize
      </span>
      <span class="ai-summarize-loading inline-flex items-center gap-1.5">
        <span class="ai-spinner"></span>
        Asking AI…
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
  const tint = TYPE_TINT[a.signal_type] ?? 'bg-slate-100 text-slate-700'
  const iconKey = TYPE_ICON[a.signal_type] ?? 'website'
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
