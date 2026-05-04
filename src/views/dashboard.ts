import { html, type Raw } from '../lib/html.ts'
import { type ActivityRow, SIGNAL_TYPE_LABELS } from '../db/queries.ts'
import { ALL_SIGNAL_TYPES, type Filter, ALL_STATUSES, DATE_PRESETS } from '../lib/filters.ts'
import { activityList, type InfiniteScrollOpts } from './activity-list.ts'
import { layout } from './layout.ts'
import { icon } from '../lib/icons.ts'

const STATUS_LABELS: Record<string, string> = {
  all: 'All',
  new: 'New',
  useful: 'Useful',
}

const TYPE_ICON: Record<string, string> = {
  website: 'website', meta_ads: 'meta_ads', google_ads: 'google_ads',
  instagram_account: 'instagram', tiktok_account: 'tiktok',
  youtube_channel: 'youtube_shorts',
  seo_keyword: 'seo', backlink_profile: 'seo',
}

// Inline search input — full width on mobile, flexes to fill remaining space on desktop.
function searchInput(filter: Filter): Raw {
  return html`<div class="relative flex-1 min-w-[240px]">
    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">${icon('filter')}</span>
    <input type="search" name="q" value="${filter.search}"
           placeholder="Search title, preview, or target…" maxlength="80" autocomplete="off"
           class="w-full text-sm bg-white border border-slate-300 rounded-full pl-9 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow shadow-sm" />
  </div>`
}

// Segmented-control date pills (Today / 3d / 7d / 30d). Active pill uses
// FlowCore brand mid-blue (#2f5c85, same as the top-nav active tab).
function datePills(filter: Filter): Raw {
  return html`<div class="inline-flex items-center bg-slate-100 border border-slate-200 rounded-full p-0.5 shadow-sm" role="group" aria-label="Date range">
    ${DATE_PRESETS.map((d) => html`<label class="cursor-pointer">
      <input type="radio" name="days" value="${String(d)}" ${filter.days === d ? 'checked' : ''} class="sr-only peer" />
      <span class="fc-pill-radio">
        ${d === 1 ? 'Today' : `${d}d`}
      </span>
    </label>`)}
  </div>`
}

function statusPills(filter: Filter, counts?: { all: number; new: number; useful: number }): Raw {
  return html`<div class="inline-flex items-center bg-slate-100 border border-slate-200 rounded-full p-0.5 shadow-sm" role="group" aria-label="Status">
    ${ALL_STATUSES.map((s) => {
      const checked = filter.status === s
      const count = counts ? counts[s] : null
      return html`<label class="cursor-pointer">
        <input type="radio" name="status" value="${s}" ${checked ? 'checked' : ''} class="sr-only peer" />
        <span class="fc-pill-radio inline-flex items-center gap-1">
          ${STATUS_LABELS[s] ?? s}
          ${count != null ? html`<span id="status-count-${s}" class="text-[10px] font-bold tabular-nums opacity-80">${String(count)}</span>` : ''}
        </span>
      </label>`
    })}
  </div>`
}

// Signal-types as inline pills. "All" is a sentinel pill — it's active when no
// individual types are selected (which the server treats as "show everything").
// Clicking "All" un-checks every individual type pill in one go.
function typePills(filter: Filter): Raw {
  const allSelected = filter.signal_types.length === ALL_SIGNAL_TYPES.length
  // Server-side: rawTypes.length === 0 falls back to ALL_SIGNAL_TYPES (no filter).
  // The active/inactive style of the All button is now driven by CSS :has()
  // so it updates in real time as the user toggles individual type checkboxes
  // without needing a server round-trip.
  // Toggle every type checkbox + fire one change event (htmx hits server once).
  const clearAllJs =
    `const f=this.closest('form');Array.from(f.elements).forEach(function(c){if(c.name==='type')c.checked=false});f.dispatchEvent(new Event('change',{bubbles:true}))`

  return html`<div class="fc-types-row flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
    <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mr-1">Types</span>
    <button type="button" onclick="${clearAllJs}" class="fc-types-all">All</button>
    ${ALL_SIGNAL_TYPES.map((t) => {
      const checked = !allSelected && filter.signal_types.includes(t)
      return html`<label class="cursor-pointer">
        <input type="checkbox" name="type" value="${t}"
               ${checked ? 'checked' : ''}
               class="sr-only peer" />
        <span class="fc-pill-checkbox">
          <span class="fc-type-icon">${icon(TYPE_ICON[t] ?? 'website')}</span>
          ${SIGNAL_TYPE_LABELS[t]}
        </span>
      </label>`
    })}
  </div>`
}

function tagFiltersDropdown(filter: Filter, tagsWithCounts: Array<{ name: string; count: number }>): Raw {
  const selectedCount = filter.tags.length
  const triggerLabel = selectedCount === 0
    ? 'All tags'
    : selectedCount === 1 ? filter.tags[0]! : `${selectedCount} tags`

  return html`<div class="dropdown">
    <button type="button"
            id="tag-trigger"
            data-bs-toggle="dropdown"
            data-bs-auto-close="outside"
            aria-expanded="false"
            class="inline-flex items-center gap-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-full px-3 py-1.5 hover:bg-slate-50 hover:border-slate-400 transition-colors shadow-sm">
      ${selectedCount > 0
        ? html`<span class="inline-flex items-center justify-center min-w-[18px] h-4 px-1 bg-blue-600 text-white text-[10px] font-bold rounded-full">${String(selectedCount)}</span>`
        : html`<span class="text-slate-400">#</span>`}
      <span class="text-slate-700">${triggerLabel}</span>
      <span class="text-slate-400">▾</span>
    </button>
    <div id="tag-menu"
         data-dropdown-menu
         class="dropdown-menu bg-white border border-slate-200 rounded-lg shadow-2xl z-[60] flex-col p-0"
         style="max-height: min(70vh, 500px); width: 280px;">
      <div class="p-2 border-b border-slate-100 shrink-0">
        <input type="search" placeholder="Search tags…" data-tag-search
               class="w-full text-sm border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
      </div>
      <div class="p-2 overflow-y-auto flex-1 min-h-0">
        ${tagsWithCounts.length === 0
          ? html`<p class="text-xs text-slate-400 px-2 py-3 text-center">No tags yet. Tag signals on the Signals page.</p>`
          : tagsWithCounts.map((t) => html`
            <label data-tn="${t.name.toLowerCase()}"
                   class="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-50 rounded px-2 py-1.5">
              <input type="checkbox" name="tag" value="${t.name}"
                     ${filter.tags.includes(t.name) ? 'checked' : ''}
                     class="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
              <span class="truncate flex-1">${t.name}</span>
              <span class="text-[10px] font-bold text-slate-400 tabular-nums">${String(t.count)}</span>
            </label>`)}
      </div>
    </div>
  </div>`
}

export function dashboardPage(opts: {
  filter: Filter
  tagsWithCounts: Array<{ name: string; count: number }>
  rows: ActivityRow[]
  infiniteScroll?: InfiniteScrollOpts
  statusCounts?: { all: number; new: number; useful: number }
  activeNav?: 'board' | 'useful'
  title?: string
  heading?: string
  /** URL the filter form pushes/fetches against — '/activities' on Board,
   *  '/useful' on the Useful page so filters stay scoped. */
  feedUrl?: string
  /** Reset link target — '/' clears Board's saved filter; '/useful' just
   *  drops query params on the Useful page. */
  resetUrl?: string
}): Raw {
  const { filter, tagsWithCounts, rows, infiniteScroll, statusCounts } = opts
  const activeNav = opts.activeNav ?? 'board'
  const title = opts.title ?? 'Board'
  const heading = opts.heading ?? 'Activity feed'
  const feedUrl = opts.feedUrl ?? '/activities'
  const resetUrl = opts.resetUrl ?? '/?reset=1'
  const showStatusPills = activeNav !== 'useful'

  const filterBar = html`<form id="filters" data-tour="filters"
        hx-get="${feedUrl}"
        hx-target="#feed"
        hx-swap="innerHTML"
        hx-trigger="change, keyup changed delay:500ms from:input[type='search']"
        hx-push-url="true"
        hx-indicator="#feed-loading"
        class="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 mb-4">
    <div class="flex items-center gap-2 flex-wrap">
      ${searchInput(filter)}
      ${datePills(filter)}
      ${showStatusPills ? statusPills(filter, statusCounts) : ''}
      ${tagFiltersDropdown(filter, tagsWithCounts)}
      <a href="${resetUrl}"
         class="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline ml-auto pl-2">
        Reset
      </a>
    </div>
    ${typePills(filter)}
  </form>`

  const body = html`
    <div class="mt-4 md:mt-6">
      ${filterBar}

      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-bold text-slate-900">${heading}</h3>
        <span id="feed-loading" class="htmx-indicator items-center gap-1.5 text-xs text-blue-600 font-medium">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
          Loading more
        </span>
      </div>
      <div id="feed">
        ${activityList(rows, { context: 'board', infiniteScroll })}
      </div>
    </div>`

  return layout({ title, body, activeNav })
}
