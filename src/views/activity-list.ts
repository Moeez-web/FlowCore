import { html, type Raw } from '../lib/html.ts'
import type { ActivityRow } from '../db/queries.ts'
import { activityRow, type RowOpts } from './activity-row.ts'
import { paginationBar, type PaginationOpts } from './pagination.ts'

export interface ListOpts extends RowOpts {
  pagination?: PaginationOpts
}

function emptyState(opts: RowOpts): Raw {
  if (opts.context === 'saved') {
    return html`<div class="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-dashed border-emerald-200 rounded-2xl p-10 sm:p-14 text-center">
      <div class="text-6xl mb-3">📌</div>
      <p class="text-lg font-bold text-emerald-900 mb-1">Nothing saved yet.</p>
      <p class="text-sm text-emerald-700 max-w-md mx-auto">Open the dashboard, mark anything you'd want to copy or counter, and it lands here. Your shortlist for the content agent.</p>
      <a href="/" class="inline-block mt-5 text-sm font-semibold px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
        Go to dashboard →
      </a>
    </div>`
  }
  return html`<div class="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 sm:p-14 text-center">
    <div class="text-6xl mb-3">🌊</div>
    <p class="text-lg font-bold text-slate-800 mb-1">All clear.</p>
    <p class="text-sm text-slate-500 max-w-md mx-auto">Nothing in this view yet. Try widening the date range, dropping a filter, or check back tomorrow when the daily polls run.</p>
    <a href="/?reset=1" class="inline-block mt-5 text-sm font-semibold px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
      Reset filters
    </a>
  </div>`
}

export function activityList(rows: ActivityRow[], opts: ListOpts = {}): Raw {
  if (rows.length === 0) {
    return emptyState(opts)
  }

  return html`<div class="space-y-3">
    <div class="flex items-center gap-2 px-1">
      <p class="text-xs text-slate-500 font-medium">${String(opts.pagination?.total ?? rows.length)} ${(opts.pagination?.total ?? rows.length) === 1 ? 'item' : 'items'}</p>
    </div>
    <!-- CSS-columns masonry: cards pack by height instead of aligning to the
         tallest card in each row (which used to leave dead space under
         shorter cards). Reading order becomes column-major. -->
    <div id="feed-rows" class="columns-1 sm:columns-2 xl:columns-3 gap-3 sm:gap-4">
      ${rows.map((a) => activityRow(a, opts))}
    </div>
    ${opts.pagination ? paginationBar(opts.pagination) : ''}
  </div>`
}
