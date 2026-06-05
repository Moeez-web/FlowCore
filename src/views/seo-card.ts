import { html, type Raw } from '../lib/html.ts'
import type { SeoKeywordEntry, BacklinkEntry, SeoBaselineEntry } from '../db/queries.ts'
import { icon } from '../lib/icons.ts'
import type { Filter } from '../lib/filters.ts'
import { filterToQuery } from '../lib/filters.ts'

// ────────────────── Keyword section helpers ──────────────────

function keywordBadge(entries: SeoKeywordEntry[]): { label: string; cls: string } {
  const gains = entries.filter((e) => e.delta > 0).length
  const losses = entries.filter((e) => e.delta < 0).length
  if (gains > losses) return { label: `${gains} gained`, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (losses > gains) return { label: `${losses} lost`, cls: 'bg-rose-50 text-rose-700 border-rose-200' }
  return { label: `${gains + losses} changes`, cls: 'bg-slate-50 text-slate-600 border-slate-200' }
}

function competitorRow(e: SeoKeywordEntry): Raw {
  const gain = e.delta > 0
  const arrow = gain ? '↑' : '↓'
  const color = gain ? 'text-emerald-600' : 'text-rose-600'
  const bg = gain ? 'bg-emerald-50' : 'bg-rose-50'
  const sign = gain ? '+' : ''
  return html`<div class="flex items-center gap-3 py-2 px-3 rounded-lg ${bg}">
    <span class="text-lg font-bold ${color}">${arrow}</span>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-slate-900 truncate">${e.competitor}</p>
      <p class="text-[11px] text-slate-500 font-mono truncate">${e.signalTarget}</p>
    </div>
    <div class="text-right shrink-0">
      <span class="text-sm font-bold ${color}">${sign}${String(e.delta)}</span>
      <span class="text-[10px] text-slate-400 ml-1">#${String(e.prevPosition)}→#${String(e.newPosition)}</span>
    </div>
  </div>`
}

function baselineRow(e: SeoBaselineEntry): Raw {
  return html`<div class="flex items-center gap-3 py-2 px-3 rounded-lg bg-slate-50">
    <span class="text-lg font-bold text-slate-400">●</span>
    <div class="flex-1 min-w-0">
      <p class="text-sm font-semibold text-slate-900 truncate">${e.competitor}</p>
      <p class="text-[11px] text-slate-500 font-mono truncate">${e.signalTarget}</p>
    </div>
    <div class="text-right shrink-0">
      <span class="text-sm font-bold text-slate-600">#${String(e.position)}</span>
      <span class="text-[10px] text-slate-400 ml-1">baseline</span>
    </div>
  </div>`
}

function keywordSection(keyword: string, entries: SeoKeywordEntry[], baseline?: SeoBaselineEntry[], idSuffix?: number): Raw {
  const badge = keywordBadge(entries)
  const gains = entries.filter((e) => e.delta > 0)
  const losses = entries.filter((e) => e.delta < 0)
  const dropped = losses.filter((e) => Math.abs(e.delta) >= 10)
  const hasChanges = entries.length > 0
  const hasGains = gains.length > 0
  const hasLosses = losses.length > 0
  const filterTag = hasGains && hasLosses ? 'both' : hasGains ? 'gained' : hasLosses ? 'lost' : 'neutral'

  // Baseline competitors not already shown in changes
  const changedTargets = new Set(entries.map((e) => e.signalTarget))
  const baselineOnly = (baseline ?? []).filter((b) => !changedTargets.has(b.signalTarget))
  const totalCompetitors = entries.length + baselineOnly.length

  const countLabel = hasChanges
    ? `${badge.label} · ${String(totalCompetitors)} tracked`
    : `${String(totalCompetitors)} tracked — awaiting next poll`

  return html`<details class="group/kw border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors" data-seo-filter="${filterTag}">
    <summary class="cursor-pointer flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors select-none list-none">
      <span class="text-slate-400 text-sm font-bold transition-transform group-open/kw:rotate-90">▸</span>
      <span class="text-sm font-semibold text-slate-900 flex-1 font-mono truncate">${keyword}</span>
      ${hasChanges
        ? html`<span class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.cls}">${badge.label}</span>`
        : html`<span class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200">baseline</span>`}
      <span class="text-[10px] text-slate-400 tabular-nums">${String(totalCompetitors)} competitor${totalCompetitors === 1 ? '' : 's'}</span>
    </summary>
    <div class="px-4 pb-3 space-y-1.5 border-t border-slate-100 pt-2">
      ${gains.length > 0 ? html`<p class="text-[10px] font-bold uppercase tracking-wider text-emerald-600 px-3 mb-1">Gaining rank</p>` : ''}
      ${gains.map((e) => competitorRow(e))}
      ${losses.length > 0 ? html`<p class="text-[10px] font-bold uppercase tracking-wider text-rose-600 px-3 ${gains.length > 0 ? 'mt-3' : ''} mb-1">Losing rank</p>` : ''}
      ${losses.map((e) => competitorRow(e))}
      ${dropped.length > 0 ? html`<div class="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
        <p class="text-[10px] font-bold uppercase tracking-wider text-amber-700">Dropped significantly (≥10 positions)</p>
        ${dropped.map((e) => html`<p class="text-xs text-amber-800 mt-1">${e.competitor}: #${String(e.prevPosition)}→#${String(e.newPosition)} (${String(e.delta)})</p>`)}
      </div>` : ''}
      ${baselineOnly.length > 0 ? html`
        <div class="${hasChanges ? 'mt-3' : ''}">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">${hasChanges ? 'No change (baseline)' : 'Current positions'}</p>
          ${baselineOnly.map((e) => baselineRow(e))}
        </div>` : ''}
    </div>
  </details>`
}

// ────────────────── Backlink section helpers ──────────────────

const ACTIVITY_LABELS: Record<string, { label: string; cls: string }> = {
  backlink_acquired:    { label: 'Acquired', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  backlink_lost:        { label: 'Lost', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  anchor_text_changed:  { label: 'Anchor changed', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
}

function backlinkRow(e: BacklinkEntry): Raw {
  const meta = ACTIVITY_LABELS[e.activityType] ?? { label: 'Update', cls: 'bg-slate-50 text-slate-600 border-slate-200' }
  const isLost = e.activityType === 'backlink_lost'
  const rowBg = isLost ? 'bg-rose-50/50' : 'bg-emerald-50/50'
  let sourcePath = ''
  try { sourcePath = e.sourcePage ? new URL(e.sourcePage).pathname : '' } catch { sourcePath = e.sourcePage }
  return html`<div class="flex items-center gap-3 py-2 px-3 rounded-lg ${rowBg}">
    <span class="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.cls}">${meta.label}</span>
    <div class="flex-1 min-w-0">
      <p class="text-xs text-slate-600 truncate">Anchor: <span class="italic">${e.anchorText || '(none)'}</span></p>
      ${sourcePath ? html`<p class="text-[10px] text-slate-400 truncate mt-0.5">From: ${sourcePath}</p>` : ''}
    </div>
  </div>`
}

interface DomainGroup {
  domain: string
  sdr: number
  entries: BacklinkEntry[]
  acquired: number
  lost: number
  changed: number
}

function backlinksSection(backlinks: BacklinkEntry[]): Raw {
  if (backlinks.length === 0) return html``

  // Group by source domain
  const groupMap = new Map<string, DomainGroup>()
  for (const bl of backlinks) {
    const key = bl.sourceDomain
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        domain: bl.sourceDomain,
        sdr: bl.sourceDa,
        entries: [],
        acquired: 0,
        lost: 0,
        changed: 0,
      })
    }
    const g = groupMap.get(key)!
    g.entries.push(bl)
    if (bl.activityType === 'backlink_acquired') g.acquired++
    else if (bl.activityType === 'backlink_lost') g.lost++
    else if (bl.activityType === 'anchor_text_changed') g.changed++
  }

  // Sort groups: highest SDR first, then by total entries
  const groups = Array.from(groupMap.values()).sort((a, b) => {
    if (b.sdr !== a.sdr) return b.sdr - a.sdr
    return b.entries.length - a.entries.length
  })

  return html`<div class="space-y-2">
    ${groups.map((g) => {
      const daClass = g.sdr >= 80 ? 'bg-green-100 text-green-800' : g.sdr >= 60 ? 'bg-amber-100 text-amber-800' : g.sdr >= 30 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
      const hasMixed = (g.acquired > 0 && g.lost > 0) || (g.acquired > 0 && g.changed > 0) || (g.lost > 0 && g.changed > 0)
      const overallBg = g.lost > 0 && g.acquired === 0 ? 'border-rose-200' : g.acquired > 0 && g.lost === 0 ? 'border-emerald-200' : 'border-slate-200'
      return html`<details class="group/bl border ${overallBg} rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
        <summary class="cursor-pointer flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors select-none list-none">
          <span class="text-slate-400 text-xs font-bold transition-transform group-open/bl:rotate-90">▸</span>
          <span class="text-sm font-semibold text-slate-900 truncate flex-1">${g.domain}</span>
          <span class="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded ${daClass}">SDR ${String(g.sdr)}</span>
          ${g.acquired > 0 ? html`<span class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">↑${String(g.acquired)}</span>` : ''}
          ${g.lost > 0 ? html`<span class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">↓${String(g.lost)}</span>` : ''}
          ${g.changed > 0 ? html`<span class="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">✎${String(g.changed)}</span>` : ''}
          <span class="text-[10px] text-slate-400 tabular-nums">${String(g.entries.length)}</span>
        </summary>
        <div class="px-3 pb-2 space-y-1 border-t border-slate-100 pt-2">
          ${g.entries.map((e) => backlinkRow(e))}
        </div>
      </details>`
    })}
  </div>`
}

// ────────────────── SEO Keyword card ──────────────────

function seoPillHref(filter: Filter, seoFilter: 'all' | 'gained' | 'lost'): string {
  const q = filterToQuery({ ...filter, seo_filter: seoFilter, page: 1, cursor: undefined })
  return `/keywords?${q.toString()}`
}

function seoPill(filter: Filter, value: 'all' | 'gained' | 'lost', label: string): Raw {
  const active = filter.seo_filter === value
  const cls = active
    ? 'bg-purple-700 text-white'
    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
  return html`<a href="${seoPillHref(filter, value)}"
     hx-get="${seoPillHref(filter, value)}"
     hx-target="#keywords-content"
     hx-swap="innerHTML"
     hx-push-url="true"
     class="text-[11px] font-semibold px-3 py-1 rounded-full transition-colors ${cls}">${label}</a>`
}

export function seoKeywordCard(
  summary: Map<string, SeoKeywordEntry[]>,
  days: number,
  filter: Filter,
  baseline?: Map<string, SeoBaselineEntry[]>,
): Raw {
  const filteredSummary = new Map<string, SeoKeywordEntry[]>()
  for (const [kw, entries] of summary) {
    const filtered = filter.seo_filter === 'gained'
      ? entries.filter((e) => e.delta > 0)
      : filter.seo_filter === 'lost'
        ? entries.filter((e) => e.delta < 0)
        : entries
    if (filtered.length > 0) filteredSummary.set(kw, filtered)
  }

  const allKeywordSet = new Set([...filteredSummary.keys(), ...(baseline?.keys() ?? [])])
  const totalKeywords = allKeywordSet.size

  if (totalKeywords === 0) {
    return html`<div class="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 sm:p-14 text-center">
      <div class="text-6xl mb-3">🔍</div>
      <p class="text-lg font-bold text-slate-800 mb-1">No SEO keyword data yet.</p>
      <p class="text-sm text-slate-500 max-w-md mx-auto">The Serper poller hasn't run yet or no competitors matched. Check back after the next poll cycle.</p>
    </div>`
  }

  const sorted = Array.from(allKeywordSet).sort((a, b) => {
    const aCount = (filteredSummary.get(a)?.length ?? 0) * 1000 + (baseline?.get(a)?.length ?? 0)
    const bCount = (filteredSummary.get(b)?.length ?? 0) * 1000 + (baseline?.get(b)?.length ?? 0)
    return bCount - aCount
  })

  return html`<div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
    <div class="h-1.5 bg-gradient-to-r from-purple-500 to-violet-600"></div>
    <div class="p-4 sm:p-5">
      <div class="flex items-center gap-3 mb-3">
        <span class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-100 text-purple-600">${icon('seo')}</span>
        <div>
          <h3 class="text-base font-bold text-slate-900">SEO Rank Tracker</h3>
          <p class="text-xs text-slate-500">${String(totalKeywords)} keyword${totalKeywords === 1 ? '' : 's'} · ${String(days)}d</p>
        </div>
      </div>
      <div class="inline-flex items-center bg-slate-100 border border-slate-200 rounded-full p-0.5 shadow-sm mb-3" role="group" aria-label="Keyword filter">
        ${seoPill(filter, 'all', 'All')}
        ${seoPill(filter, 'gained', '↑ Gained')}
        ${seoPill(filter, 'lost', '↓ Lost')}
      </div>
      <div class="space-y-2">${sorted.map((kw, i) => keywordSection(kw, filteredSummary.get(kw) ?? [], baseline?.get(kw), i))}</div>
    </div>
  </div>`
}

// ────────────────── Backlinks card ──────────────────

export function backlinksCard(backlinks: BacklinkEntry[], days: number): Raw {
  if (backlinks.length === 0) {
    return html`<div class="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 sm:p-14 text-center">
      <div class="text-6xl mb-3">🔗</div>
      <p class="text-lg font-bold text-slate-800 mb-1">No backlink data yet.</p>
      <p class="text-sm text-slate-500 max-w-md mx-auto">The SerpStat poller hasn't run yet or no backlink changes were detected. Check back after the next poll cycle.</p>
    </div>`
  }

  const acquired = backlinks.filter((b) => b.activityType === 'backlink_acquired').length
  const lost = backlinks.filter((b) => b.activityType === 'backlink_lost').length

  return html`<div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
    <div class="h-1.5 bg-gradient-to-r from-indigo-500 to-blue-600"></div>
    <div class="p-4 sm:p-5">
      <div class="flex items-center gap-3 mb-4">
        <span class="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600">${icon('seo')}</span>
        <div>
          <h3 class="text-base font-bold text-slate-900">Backlinks</h3>
          <p class="text-xs text-slate-500">${String(backlinks.length)} backlink${backlinks.length === 1 ? '' : 's'} · ${String(days)}d</p>
        </div>
      </div>
      ${backlinksSection(backlinks)}
    </div>
  </div>`
}
