import { html, raw, type Raw } from '../lib/html.ts'

export interface PaginationOpts {
  page: number
  pageSize: number
  total: number
  baseUrl: string                  // e.g. '/activities', '/saved', '/signals'
  query: URLSearchParams           // current filter params (without 'page')
  hxTarget: string                 // CSS selector to swap, e.g. '#feed' or '#signal-table'
  hxSwap?: string                  // default 'innerHTML'
  pushUrl?: boolean                // default true
}

function buildUrl(opts: PaginationOpts, page: number): string {
  const p = new URLSearchParams(opts.query)
  if (page > 1) p.set('page', String(page))
  else p.delete('page')
  const qs = p.toString()
  return qs ? `${opts.baseUrl}?${qs}` : opts.baseUrl
}

/** Build a list of page numbers with '...' for gaps. */
function pageList(current: number, total: number): Array<number | '...'> {
  if (total <= 7) {
    const out: number[] = []
    for (let i = 1; i <= total; i++) out.push(i)
    return out
  }
  const out: Array<number | '...'> = [1]
  if (current > 3) out.push('...')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) out.push(i)
  if (current < total - 2) out.push('...')
  out.push(total)
  return out
}

function btnClasses(active: boolean, disabled: boolean): string {
  if (disabled) return 'inline-flex items-center justify-center min-w-[36px] h-9 px-3 text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-300 rounded-md cursor-not-allowed'
  if (active) return 'inline-flex items-center justify-center min-w-[36px] h-9 px-3 text-xs font-bold border-2 border-blue-600 bg-blue-600 text-white rounded-md shadow-sm'
  return 'inline-flex items-center justify-center min-w-[36px] h-9 px-3 text-xs font-semibold border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors'
}

export function paginationBar(opts: PaginationOpts): Raw {
  const totalPages = Math.max(1, Math.ceil(opts.total / opts.pageSize))
  if (totalPages <= 1) return html``

  const swap = opts.hxSwap ?? 'innerHTML'
  const pushUrl = opts.pushUrl !== false

  const linkAttrs = (page: number) => {
    const u = buildUrl(opts, page)
    return raw(
      `hx-get="${u}" hx-target="${opts.hxTarget}" hx-swap="${swap}"` +
      (pushUrl ? ` hx-push-url="${u}"` : '') +
      ` hx-on:click="window.scrollTo({top: 0, behavior: 'smooth'})"`,
    )
  }

  const prevDisabled = opts.page <= 1
  const nextDisabled = opts.page >= totalPages
  const list = pageList(opts.page, totalPages)
  const fromRow = (opts.page - 1) * opts.pageSize + 1
  const toRow = Math.min(opts.page * opts.pageSize, opts.total)

  return html`<nav class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5 pt-4 border-t border-slate-200" aria-label="Pagination">
    <p class="text-xs text-slate-500 font-medium">
      Showing <span class="font-bold text-slate-700">${String(fromRow)}–${String(toRow)}</span> of <span class="font-bold text-slate-700">${String(opts.total)}</span>
    </p>
    <div class="flex items-center gap-1.5 flex-wrap">
      ${prevDisabled
        ? html`<span class="${btnClasses(false, true)}">‹ Prev</span>`
        : html`<button type="button" ${linkAttrs(opts.page - 1)} class="${btnClasses(false, false)}">‹ Prev</button>`}
      ${list.map((it) => {
        if (it === '...') return html`<span class="text-slate-400 px-1 text-xs">…</span>`
        if (it === opts.page) return html`<span class="${btnClasses(true, false)}" aria-current="page">${String(it)}</span>`
        return html`<button type="button" ${linkAttrs(it)} class="${btnClasses(false, false)}">${String(it)}</button>`
      })}
      ${nextDisabled
        ? html`<span class="${btnClasses(false, true)}">Next ›</span>`
        : html`<button type="button" ${linkAttrs(opts.page + 1)} class="${btnClasses(false, false)}">Next ›</button>`}
    </div>
  </nav>`
}
