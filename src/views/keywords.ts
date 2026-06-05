import { html, type Raw } from '../lib/html.ts'
import type { SeoKeywordEntry, SeoBaselineEntry } from '../db/queries.ts'
import { type Filter, DATE_PRESETS } from '../lib/filters.ts'
import { seoKeywordCard } from './seo-card.ts'
import { layout } from './layout.ts'
import { icon } from '../lib/icons.ts'

export function keywordCountLabel(count: number): string {
  return `${count} keyword${count === 1 ? '' : 's'}`
}

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

export function keywordPills(keywords: string[]): Raw {
  if (keywords.length === 0) {
    return html`<p class="text-xs text-slate-400 py-4 text-center">No keywords tracked. Add one above.</p>`
  }

  return html`<div class="flex flex-wrap gap-1.5">
    ${keywords.map((kw) => html`
      <span class="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-xs text-blue-700 font-medium pl-2.5 pr-1 py-1 rounded-full">
        <span class="truncate max-w-[160px]">${kw}</span>
        <button type="button"
                hx-delete="/keywords/remove"
                hx-vals='{"keyword":"${kw}"}'
                hx-target="#keywords-left-panel"
                hx-swap="innerHTML"
                class="inline-flex items-center justify-center w-4 h-4 rounded-full text-blue-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-[10px] font-bold leading-none"
                aria-label="Remove ${kw}">×</button>
      </span>`)}
  </div>`
}

export function keywordsPage(opts: {
  filter: Filter
  seoSummary: Map<string, SeoKeywordEntry[]>
  seoBaseline: Map<string, SeoBaselineEntry[]>
  keywords: string[]
  fragment?: boolean
}): Raw {
  const { filter, seoSummary, seoBaseline, keywords, fragment } = opts

  const seoCard = keywords.length === 0
    ? html`<div class="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 sm:p-14 text-center">
        <div class="text-6xl mb-3">🔍</div>
        <p class="text-lg font-bold text-slate-800 mb-1">No keywords tracked.</p>
        <p class="text-sm text-slate-500 max-w-md mx-auto">Add keywords on the left to start tracking SEO rankings.</p>
      </div>`
    : seoKeywordCard(seoSummary, filter.days, filter, seoBaseline)

  if (fragment) return seoCard

  const body = html`
    <div class="mt-4 md:mt-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-bold text-slate-900">Keywords</h3>
        <form id="keywords-filters-date"
              hx-get="/keywords"
              hx-target="#keywords-content"
              hx-swap="innerHTML"
              hx-trigger="change"
              hx-push-url="true"
              class="flex items-center">
          ${datePills(filter)}
        </form>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- Left: keyword management -->
        <div class="lg:col-span-5">
          <div class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
            <div class="flex items-center gap-2 mb-3">
              <span class="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-100 text-purple-600">${icon('seo')}</span>
              <div>
                <h4 class="text-sm font-bold text-slate-900">Tracked Keywords</h4>
                <p class="text-[10px] text-slate-500" id="keyword-count">${String(keywords.length)} keyword${keywords.length === 1 ? '' : 's'}</p>
              </div>
            </div>

            <form hx-post="/keywords/add"
                  hx-target="#keywords-left-panel"
                  hx-swap="innerHTML"
                  hx-on::after-request="if(event.detail.successful) this.querySelector('input').value=''"
                  class="flex items-center gap-2 mb-3">
              <input type="text"
                     name="keyword"
                     placeholder="Add a keyword…"
                     maxlength="120"
                     autocomplete="off"
                     required
                     class="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-shadow" />
              <button type="submit"
                      class="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-600 text-white text-lg font-bold hover:bg-purple-700 transition-colors shrink-0">
                +
              </button>
            </form>

            <div id="keywords-left-panel">
              ${keywordPills(keywords)}
            </div>
          </div>
        </div>

        <!-- Right: SEO rank tracker card -->
        <div class="lg:col-span-7" id="keywords-content">
          ${seoCard}
        </div>
      </div>
    </div>`

  return layout({ title: 'Keywords', body, activeNav: 'keywords' })
}
