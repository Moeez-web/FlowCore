import { html, type Raw } from '../lib/html.ts'
import { layout } from './layout.ts'
import { type SignalRow, SIGNAL_TYPES, SIGNAL_TYPE_LABELS } from '../db/queries.ts'
import { icon } from '../lib/icons.ts'
import { paginationBar, type PaginationOpts } from './pagination.ts'

const TYPE_ICON: Record<string, string> = {
  website: 'website', meta_ads: 'meta_ads', google_ads: 'google_ads',
  instagram_account: 'instagram', tiktok_account: 'tiktok',
  youtube_channel: 'youtube_shorts',
  seo_keyword: 'seo', backlink_profile: 'seo',
}

const TYPE_TINT: Record<string, string> = {
  website:           'text-slate-600',
  meta_ads:          'text-blue-600',
  google_ads:        'text-emerald-600',
  instagram_account: 'text-pink-600',
  tiktok_account:    'text-pink-600',
  youtube_channel:   'text-red-600',
  seo_keyword:       'text-purple-600',
  backlink_profile:  'text-indigo-600',
}

// ─────────────────────────── Signal row (flat list) ───────────────────────────
// Renders one signal as a single row inside a competitor group. Replaces the
// old table-row layout with a flex line: type icon + label · monospace target
// · tag chips · status dot · pause/delete actions. The element id matches the
// old `signal-${id}` so per-row htmx swaps (tag add/remove, toggle-active,
// delete) keep working without route changes.
export function signalRow(s: SignalRow): Raw {
  const typeColor = TYPE_TINT[s.type] ?? 'text-slate-500'
  return html`<div id="signal-${String(s.id)}"
       class="grid grid-cols-1 sm:grid-cols-[180px_minmax(0,1fr)_auto] gap-3 sm:gap-4 items-center px-3 py-3 -mx-3 border-b border-slate-100 hover:bg-slate-50/70 transition-colors last:border-b-0">

    <!-- Type column: icon + label, larger and clearly visible -->
    <a hx-get="/signals?type=${s.type}" hx-target="#signal-page-shell" hx-swap="innerHTML" hx-push-url="true"
       class="inline-flex items-center gap-2 text-sm font-semibold ${typeColor} hover:underline shrink-0"
       title="Filter by ${SIGNAL_TYPE_LABELS[s.type]}">
      <span class="inline-flex items-center justify-center w-8 h-8 rounded-md bg-slate-50 border border-slate-200">
        ${icon(TYPE_ICON[s.type] ?? 'website')}
      </span>
      <span class="truncate">${SIGNAL_TYPE_LABELS[s.type]}</span>
    </a>

    <!-- Target + tags + status — all always visible -->
    <div class="min-w-0 flex flex-col gap-1.5">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="font-mono text-sm text-slate-900 break-all" title="${s.target}">${s.target}</span>
        ${s.is_active === 1
          ? html`<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>active
            </span>`
          : html`<span class="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
              <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>paused
            </span>`}
      </div>
      <div class="flex items-center gap-1.5 flex-wrap">
        ${s.tags.map((tg) => html`<span class="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          <a hx-get="/signals?tag=${encodeURIComponent(tg)}" hx-target="#signal-page-shell" hx-swap="innerHTML" hx-push-url="true"
             class="hover:text-blue-700 cursor-pointer" title="Filter by tag">${tg}</a>
          <button type="button"
                  hx-delete="/signals/${String(s.id)}/tags/${encodeURIComponent(tg)}"
                  hx-target="#signal-${String(s.id)}"
                  hx-swap="outerHTML"
                  class="text-slate-400 hover:text-rose-600 leading-none -mr-0.5"
                  title="Remove tag">×</button>
        </span>`)}
        <form hx-post="/signals/${String(s.id)}/tags"
              hx-target="#signal-${String(s.id)}"
              hx-swap="outerHTML"
              hx-on::after-request="if(event.detail.successful) this.reset()"
              class="inline-flex">
          <input type="text" name="tag" placeholder="+ tag" maxlength="80"
                 class="text-xs border border-dashed border-slate-300 rounded-full px-2 py-0.5 w-20 focus:w-32 transition-all focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:border-solid bg-white" />
        </form>
      </div>
    </div>

    <!-- Actions: always visible, properly-sized buttons -->
    <div class="inline-flex items-center gap-1.5 shrink-0">
      ${s.is_active === 1
        ? html`<button type="button"
                hx-post="/signals/${String(s.id)}/toggle-active"
                hx-target="#signal-${String(s.id)}"
                hx-swap="outerHTML"
                title="Pause this signal"
                class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors">
            ${icon('pause')} <span class="hidden md:inline">Pause</span>
          </button>`
        : html`<button type="button"
                hx-post="/signals/${String(s.id)}/toggle-active"
                hx-target="#signal-${String(s.id)}"
                hx-swap="outerHTML"
                title="Resume this signal"
                class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-colors">
            ${icon('play')} <span class="hidden md:inline">Resume</span>
          </button>`}
      <button type="button"
              hx-delete="/signals/${String(s.id)}"
              hx-target="#signal-${String(s.id)}"
              hx-swap="outerHTML swap:300ms"
              hx-confirm="Delete this signal? Activity history will be removed."
              title="Delete this signal"
              class="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-colors">
        ${icon('trash')} <span class="hidden md:inline">Delete</span>
      </button>
    </div>
  </div>`
}

// ─────────────────────────── Add modals ───────────────────────────
// Two separate modals — one for adding a single signal, one for adding a
// competitor + all channels. Both reuse the article-modal infrastructure
// (relocates to body on open, Esc to close, click backdrop to dismiss).
function addCompetitorModal(): Raw {
  return html`<div id="add-competitor-modal" class="fc-article-modal" hidden>
    <div class="fc-article-backdrop" data-article-close></div>
    <div class="fc-article-card" role="dialog" aria-modal="true" aria-labelledby="add-competitor-title">
      <button type="button" data-article-close class="fc-article-close" aria-label="Close">×</button>
      <div class="fc-article-scroll">
        <div class="px-6 sm:px-8 pt-7 pb-6">
          <h2 id="add-competitor-title" class="text-xl sm:text-2xl font-bold text-slate-900 leading-tight" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">Add a competitor</h2>
          <p class="text-sm text-slate-500 mt-1">Track all of their channels in one shot. Empty fields are skipped.</p>

          <form hx-post="/signals/competitor" class="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1">Competitor name <span class="text-rose-500">*</span></label>
              <input type="text" name="name" required maxlength="80" placeholder="Baker Brothers Plumbing"
                     class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1">Website domain <span class="text-rose-500">*</span></label>
              <input type="text" name="website" required maxlength="200" placeholder="bakerbrothersplumbing.com"
                     class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1 inline-flex items-center gap-1">${icon('meta_ads')} Facebook page</label>
              <input type="text" name="facebook" maxlength="200" placeholder="facebook.com/BakerBrothersPlumbing"
                     class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1 inline-flex items-center gap-1">${icon('google_ads')} Google Ads ID</label>
              <input type="text" name="google_ads" maxlength="200" placeholder="AR-BakerBrothers"
                     class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1 inline-flex items-center gap-1">${icon('instagram')} Instagram handle</label>
              <input type="text" name="instagram" maxlength="200" placeholder="bakerbrothersdfw"
                     class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1 inline-flex items-center gap-1">${icon('tiktok')} TikTok handle</label>
              <input type="text" name="tiktok" maxlength="200" placeholder="bakerbrothersdfw"
                     class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-[11px] font-medium text-slate-500 mb-1 inline-flex items-center gap-1">${icon('youtube_shorts')} YouTube channel</label>
              <input type="text" name="youtube" maxlength="200" placeholder="@BakerBrothersPlumbing"
                     class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>
            <div class="sm:col-span-2 flex items-center justify-end gap-2 pt-1">
              <button type="button" data-article-close class="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2">Cancel</button>
              <button type="submit" class="fc-btn-primary text-sm font-semibold px-4 py-2 rounded-md whitespace-nowrap">+ Add competitor</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>`
}

function addSingleModal(): Raw {
  return html`<div id="add-single-modal" class="fc-article-modal" hidden>
    <div class="fc-article-backdrop" data-article-close></div>
    <div class="fc-article-card fc-summary-card" role="dialog" aria-modal="true" aria-labelledby="add-single-title">
      <button type="button" data-article-close class="fc-article-close" aria-label="Close">×</button>
      <div class="fc-article-scroll">
        <div class="px-6 sm:px-8 pt-7 pb-6">
          <h2 id="add-single-title" class="text-xl sm:text-2xl font-bold text-slate-900 leading-tight" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">Add a single signal</h2>
          <p class="text-sm text-slate-500 mt-1">One signal at a time — pick a type, give it a target, optionally tag it.</p>

          <form hx-post="/signals" class="mt-5 grid grid-cols-1 gap-3">
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1">Type</label>
              <select name="type" required class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors">
                ${SIGNAL_TYPES.map((t) => html`<option value="${t}">${SIGNAL_TYPE_LABELS[t]}</option>`)}
              </select>
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1">Target</label>
              <input type="text" name="target" required maxlength="200" placeholder="domain / handle / keyword"
                     class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>
            <div>
              <label class="block text-[11px] font-medium text-slate-500 mb-1">Tags <span class="text-slate-300 font-normal">(comma-separated, optional)</span></label>
              <input type="text" name="tags" maxlength="200" placeholder="Roto-Rooter, national"
                     class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
            </div>
            <div class="flex items-center justify-end gap-2 pt-1">
              <button type="button" data-article-close class="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2">Cancel</button>
              <button type="submit" class="fc-btn-primary text-sm font-semibold px-4 py-2 rounded-md whitespace-nowrap">+ Add signal</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>`
}

// Compact "+" icon-button with a dropdown menu — two add options. Uses
// native <details> so we don't need extra JS for open/close. Each menu item
// triggers its respective modal via data-modal-open and closes the menu via
// hx-on:click that flips the parent <details>.
function addMenu(): Raw {
  return html`<details class="fc-add-menu relative">
    <summary class="fc-btn-primary inline-flex items-center justify-center w-9 h-9 rounded-md cursor-pointer select-none list-none"
             title="Add a signal or competitor"
             aria-label="Add">
      <span class="text-xl leading-none font-bold">+</span>
    </summary>
    <div class="absolute right-0 top-full mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-20 overflow-hidden">
      <button type="button" data-modal-open="add-competitor-modal"
              hx-on:click="this.closest('details').open = false"
              class="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-100 text-blue-700 shrink-0 text-sm font-bold">★</span>
        <span class="flex-1 min-w-0">
          <span class="block text-sm font-semibold text-slate-900">Add competitor</span>
          <span class="block text-[11px] text-slate-500 leading-tight mt-0.5">Multi-channel: website, IG, TikTok, etc.</span>
        </span>
      </button>
      <div class="border-t border-slate-100"></div>
      <button type="button" data-modal-open="add-single-modal"
              hx-on:click="this.closest('details').open = false"
              class="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors">
        <span class="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-100 text-slate-700 shrink-0 text-sm font-bold">·</span>
        <span class="flex-1 min-w-0">
          <span class="block text-sm font-semibold text-slate-900">Add single signal</span>
          <span class="block text-[11px] text-slate-500 leading-tight mt-0.5">One channel — type + target.</span>
        </span>
      </button>
    </div>
  </details>`
}

// ─────────────────────────── Type-counts row ───────────────────────────
// Compact horizontal pill row — lives inside the unified filter card. Each
// chip is a live filter; the active chip is filled, the rest are subtle.
function typeCountsRow(signalsByType: Record<string, number>, totalCount: number, activeType: string | null): Raw {
  const allCls = activeType == null
    ? 'bg-[#2f5c85] text-white border-[#2f5c85] hover:bg-[#25496a] hover:border-[#25496a]'
    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
  return html`<div class="flex items-center gap-1.5 flex-wrap mt-3 pt-3 border-t border-slate-100">
    <a hx-get="/signals" hx-target="#signal-page-shell" hx-swap="innerHTML" hx-push-url="true"
       class="${allCls} inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors cursor-pointer">
      All <span class="font-mono opacity-80">${String(totalCount)}</span>
    </a>
    ${SIGNAL_TYPES.map((t) => {
      const n = signalsByType[t] ?? 0
      const active = activeType === t
      const cls = active
        ? 'bg-[#2f5c85] text-white border-[#2f5c85] hover:bg-[#25496a] hover:border-[#25496a]'
        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
      return html`<a hx-get="/signals?type=${t}" hx-target="#signal-page-shell" hx-swap="innerHTML" hx-push-url="true"
                     class="${cls} inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors cursor-pointer">
        <span class="${active ? 'text-white/90' : (TYPE_TINT[t] ?? 'text-slate-500')}">${icon(TYPE_ICON[t] ?? 'website')}</span>
        ${SIGNAL_TYPE_LABELS[t]} <span class="font-mono opacity-70">${String(n)}</span>
      </a>`
    })}
  </div>`
}

// ─────────────────────────── Grouped signal list ───────────────────────────
// Groups signals by their primary tag. Each group is a <details> open by
// default, with a subtle header and the signal rows inside.
function groupSignals(signals: SignalRow[]): Array<{ key: string; signals: SignalRow[]; isUntagged: boolean }> {
  const map = new Map<string, SignalRow[]>()
  for (const s of signals) {
    const key = s.tags.length > 0 ? (s.tags[0] ?? '') : ''
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(s)
  }
  const out: Array<{ key: string; signals: SignalRow[]; isUntagged: boolean }> = []
  // Sort tagged groups alphabetically; "untagged" goes last.
  const taggedKeys = Array.from(map.keys()).filter((k) => k.length > 0).sort((a, b) => a.localeCompare(b))
  for (const k of taggedKeys) out.push({ key: k, signals: map.get(k)!, isUntagged: false })
  if (map.has('')) out.push({ key: 'Untagged', signals: map.get('')!, isUntagged: true })
  return out
}

function groupedSignalList(signals: SignalRow[]): Raw {
  const groups = groupSignals(signals)
  return html`<div class="divide-y divide-slate-200">
    ${groups.map((g) => html`<details open class="py-2 group/grp">
      <summary class="cursor-pointer flex items-center gap-3 py-3 -mx-3 px-3 rounded-md hover:bg-slate-50 transition-colors select-none list-none">
        <span class="text-slate-400 text-base font-bold transition-transform group-open/grp:rotate-90">▸</span>
        ${g.isUntagged
          ? html`<span class="text-base font-semibold text-slate-500 italic">${g.key}</span>`
          : html`<span class="text-base font-bold text-slate-900"
                       style="font-family: 'Kumbh Sans', system-ui, sans-serif;">${g.key}</span>`}
        <span class="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">${String(g.signals.length)} channel${g.signals.length === 1 ? '' : 's'}</span>
      </summary>
      <div class="px-1 pb-1">
        ${g.signals.map(signalRow)}
      </div>
    </details>`)}
  </div>`
}

// ─────────────────────────── Filter / search toolbar ───────────────────────
function filterToolbar(opts: {
  filters: { type: string | null; tag: string | null; search: string | null }
  totalCount: number
  filteredCount: number
  signalsByType: Record<string, number>
}): Raw {
  const { filters, totalCount, filteredCount } = opts
  const hasFilter = !!(filters.type || filters.tag || (filters.search && filters.search.length > 0))
  const urlWithout = (drop: 'type' | 'tag' | 'q'): string => {
    const p = new URLSearchParams()
    if (filters.type && drop !== 'type') p.set('type', filters.type)
    if (filters.tag && drop !== 'tag') p.set('tag', filters.tag)
    if (filters.search && drop !== 'q') p.set('q', filters.search)
    const qs = p.toString()
    return qs ? `/signals?${qs}` : '/signals'
  }

  return html`<form id="signals-search-form"
        hx-get="/signals"
        hx-target="#signal-page-shell"
        hx-swap="innerHTML"
        hx-trigger="keyup changed delay:500ms from:input[name='q']:not([data-signal-search])"
        hx-push-url="true"
        class="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 mb-4">
    ${filters.type ? html`<input type="hidden" name="type" value="${filters.type}" />` : ''}
    ${filters.tag ? html`<input type="hidden" name="tag" value="${filters.tag}" />` : ''}

    <!-- Row 1: search + active filter chips + bulk-tag trigger + reset -->
    <div class="flex items-center gap-2 flex-wrap">
      <div class="relative flex-1 min-w-[240px] max-w-md">
        <input type="search" name="q" value="${filters.search ?? ''}"
               placeholder="Search target or tag…" maxlength="80" autocomplete="off"
               class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-1.5 pl-8 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
        <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">${icon('filter')}</span>
      </div>

      ${hasFilter
        ? html`<div class="flex items-center gap-1.5 flex-wrap">
            ${filters.type
              ? html`<a hx-get="${urlWithout('type')}" hx-target="#signal-page-shell" hx-swap="innerHTML" hx-push-url="true"
                         class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors">
                  type:${filters.type} <span class="text-slate-400">×</span>
                </a>` : ''}
            ${filters.tag
              ? html`<a hx-get="${urlWithout('tag')}" hx-target="#signal-page-shell" hx-swap="innerHTML" hx-push-url="true"
                         class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors">
                  tag:${filters.tag} <span class="text-slate-400">×</span>
                </a>` : ''}
            ${filters.search
              ? html`<a hx-get="${urlWithout('q')}" hx-target="#signal-page-shell" hx-swap="innerHTML" hx-push-url="true"
                         class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors">
                  "${filters.search}" <span class="text-slate-400">×</span>
                </a>` : ''}
            <span class="text-xs text-slate-400">${String(filteredCount)} / ${String(totalCount)}</span>
          </div>`
        : ''}

      ${hasFilter
        ? html`<a hx-get="/signals" hx-target="#signal-page-shell" hx-swap="innerHTML" hx-push-url="true"
                  class="ml-auto text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline cursor-pointer pl-1">
            Reset
          </a>`
        : ''}
    </div>

    <!-- Row 2: type-count pills (also live filters) -->
    ${typeCountsRow(opts.signalsByType, opts.totalCount, filters.type)}
  </form>`
}

// ─────────────────────────── Bulk-tag modal ───────────────────────
// Same form + handlers as before, just rendered in a modal instead of an
// inline collapsible. Trigger lives in the unified filter card.
function bulkTagModal(): Raw {
  return html`<div id="bulk-tag-modal" class="fc-article-modal" hidden>
    <div class="fc-article-backdrop" data-article-close></div>
    <div class="fc-article-card" role="dialog" aria-modal="true" aria-labelledby="bulk-tag-title">
      <button type="button" data-article-close class="fc-article-close" aria-label="Close">×</button>
      <div class="fc-article-scroll">
        <div class="px-6 sm:px-8 pt-7 pb-6">
          <h2 id="bulk-tag-title" class="text-xl sm:text-2xl font-bold text-slate-900 leading-tight" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">Tag signals</h2>
          <p class="text-sm text-slate-500 mt-1">Search and select signals, then apply or remove a tag across all of them.</p>

          <form id="bulk-tag-form"
                hx-post="/signals/bulk-tag"
                hx-target="#signal-page-shell"
                hx-swap="innerHTML"
                class="mt-5"
                onsubmit="return true">
            <span data-pill-count class="text-xs text-slate-500 block mb-2">— search and select signals, then apply a tag</span>
            <div data-selected-pills class="flex flex-wrap gap-1.5 mb-3 min-h-[32px] p-2 bg-slate-50 border border-slate-200 rounded-md"></div>

            <div class="grid grid-cols-1 gap-3">
              <div class="relative">
                <label class="block text-[11px] font-medium text-slate-500 mb-1">Find signals</label>
                <input type="search" name="q" data-signal-search
                       placeholder="Search by target or tag…" maxlength="80"
                       autocomplete="off"
                       hx-get="/signals/search"
                       hx-target="next [data-signal-results]"
                       hx-swap="innerHTML"
                       hx-trigger="keyup changed delay:200ms"
                       hx-include="this"
                       hx-on::after-swap="this.nextElementSibling.classList.remove('hidden')"
                       class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                       onkeydown="if(event.key === 'Enter'){event.preventDefault();}" />
                <div data-signal-results class="hidden absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-72 overflow-y-auto"></div>
              </div>

              <div>
                <label class="block text-[11px] font-medium text-slate-500 mb-1">Tag</label>
                <input type="text" name="tag" placeholder="Tag name" maxlength="80"
                       class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />
              </div>

              <div class="flex items-center justify-end gap-2 pt-2">
                <button type="button" data-article-close class="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2">Cancel</button>
                <button type="submit" name="op" value="remove" class="text-sm font-semibold px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap">– Remove tag</button>
                <button type="submit" name="op" value="add" class="fc-btn-primary text-sm font-semibold px-4 py-2 rounded-md whitespace-nowrap">+ Apply tag</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>`
}

// ─────────────────────────── Page entry ───────────────────────────
export function signalsPage(opts: {
  signals: SignalRow[]
  totalCount: number
  filteredCount: number
  signalsByType: Record<string, number>
  pagination: PaginationOpts
  filters: { type: string | null; tag: string | null; search: string | null }
}): Raw {
  const { signals, totalCount, filteredCount, signalsByType, pagination, filters } = opts
  const groups = groupSignals(signals)
  const competitorCount = groups.filter((g) => !g.isUntagged).length

  const body = html`
    <div class="max-w-6xl mx-auto pt-4">
      <!-- Header: title + primary action -->
      <div class="mb-5 flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 class="text-2xl font-bold text-slate-900" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">Signals</h2>
          <p class="text-sm text-slate-500 mt-1">
            <span class="font-mono">${String(totalCount)}</span> signals across
            <span class="font-mono">${String(competitorCount)}</span> competitor${competitorCount === 1 ? '' : 's'}.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" data-modal-open="bulk-tag-modal"
                  class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-slate-200 bg-white hover:bg-[#2f5c85]/10 hover:border-[#2f5c85] transition-colors"
                  style="color: var(--fc-blue-mid);"
                  title="Tag signals — apply or remove a tag across signals"
                  aria-label="Tag signals">
            ${icon('tag')}
          </button>
          ${addMenu()}
        </div>
      </div>

      <div id="signal-page-shell">
        ${signalPageShell({ signals, pagination, totalCount, filteredCount, filters, signalsByType })}
      </div>
    </div>
    ${addCompetitorModal()}
    ${addSingleModal()}
    ${bulkTagModal()}`

  return layout({ title: 'Signals', body, activeNav: 'signals' })
}

// Renders the inner contents of #signal-page-shell — the part that swaps on
// filter/search/page changes. Kept identical between full-page render and
// htmx fragment so the URL stays stable.
function signalPageShell(opts: {
  signals: SignalRow[]
  pagination: PaginationOpts
  totalCount: number
  filteredCount: number
  filters: { type: string | null; tag: string | null; search: string | null }
  signalsByType: Record<string, number>
}): Raw {
  const { signals, pagination, totalCount, filteredCount, filters, signalsByType } = opts
  const hasActiveFilter = !!(filters.type || filters.tag || (filters.search && filters.search.length > 0))
  return html`
    ${filterToolbar({ filters, totalCount, filteredCount, signalsByType })}
    ${signals.length === 0
      ? (hasActiveFilter
          ? html`<div class="bg-white border border-slate-200 rounded-2xl shadow-sm py-16 text-center">
              <p class="text-2xl mb-2">🔍</p>
              <p class="text-sm font-medium text-slate-700 mb-1">No signals match these filters.</p>
              <a hx-get="/signals" hx-target="#signal-page-shell" hx-swap="innerHTML" hx-push-url="true"
                 class="text-xs text-blue-600 hover:underline cursor-pointer font-semibold">Clear filters</a>
            </div>`
          : html`<div class="bg-white border border-slate-200 rounded-2xl shadow-sm py-16 text-center">
              <p class="text-sm text-slate-500">No signals yet. Add a competitor to get started.</p>
            </div>`)
      : html`<div class="bg-white border border-slate-200 rounded-2xl shadow-sm px-4 py-2">
          ${groupedSignalList(signals)}
        </div>`}
    ${paginationBar(pagination)}`
}

/** htmx-fragment entry — called from filter / search / page swaps. */
export function signalsTableFragment(opts: {
  signals: SignalRow[]
  pagination: PaginationOpts
  totalCount: number
  filteredCount: number
  filters: { type: string | null; tag: string | null; search: string | null }
  signalsByType: Record<string, number>
}): Raw {
  return signalPageShell(opts)
}
