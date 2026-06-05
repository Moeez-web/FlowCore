import { html, raw, type Raw } from '../lib/html.ts'
import { layout } from './layout.ts'
import { icon } from '../lib/icons.ts'

export interface PollerStatus {
  name: string
  label: string
  iconName: string
  intervalLabel: string
  intervalMs: number
  description: string
  paused: boolean
  running: boolean
  lastRun: string | null
  nextRun: string | null
  lastResult: {
    fetched: number
    inserted: number
    skipped: number
    baseline?: number
    completedAt?: string
    error?: string
  } | null
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.round(days / 7)}w ago`
}

function relativeTimeFromNow(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return 'Overdue'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `in ${hours}h`
  const days = Math.floor(hours / 24)
  return `in ${days}d`
}

export function settingsPage(statuses: PollerStatus[]): Raw {
  const body = html`
    <style>
      .fc-info-tip {
        position: relative;
        display: inline-flex;
        cursor: help;
      }
      .fc-info-tip svg { display: block; }
      .fc-info-tip:hover { color: var(--fc-blue-mid); }
      .fc-info-tip .fc-info-tooltip {
        display: none;
        position: absolute;
        bottom: calc(100% + 6px);
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        background: var(--fc-navy);
        color: #fff;
        font-size: 11px;
        font-weight: 500;
        font-family: 'Inter', system-ui, sans-serif;
        padding: 5px 10px;
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 50;
        pointer-events: none;
      }
      .fc-info-tip .fc-info-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: var(--fc-navy);
      }
      .fc-info-tip:hover .fc-info-tooltip { display: block; }
      /* When Run button is in-flight, hide pause/resume */
      div:has(> .fc-run-btn.htmx-request) .fc-pause-resume-btn { visibility: hidden; }
    </style>
    <div class="mt-4 md:mt-6">
      <div class="mb-5">
        <h2 class="text-lg font-bold text-slate-900" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">Scraper Settings</h2>
        <p class="text-sm text-slate-500 mt-0.5">Monitor and control data pollers across all channels.</p>
      </div>
      <div class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100 bg-slate-50/60">
              <th class="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Source</th>
              <th class="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Status</th>
              <th class="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Last Run</th>
              <th class="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Last Result</th>
              <th class="text-left px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Next Schedule</th>
              <th class="text-right px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${statuses.map(s => pollerRowHtml(s))}
          </tbody>
        </table>
      </div>
    </div>`

  return layout({ title: 'Settings', body, activeNav: 'settings' })
}

export function pollerRowHtml(s: PollerStatus): Raw {
  const { name, label, iconName, intervalLabel, description, paused, lastRun, nextRun, lastResult } = s

  const hasError = !!lastResult?.error
  const neverRun = !lastRun
  const lastRunDisplay = neverRun ? 'Never' : relativeTime(lastRun!)
  const nextRunDisplay = paused ? 'Paused' : (!nextRun ? '--' : relativeTimeFromNow(nextRun))

  let statusDot: Raw
  if (s.running) {
    statusDot = html`<span class="flex items-center gap-1.5 text-xs font-semibold text-blue-600"><svg class="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/><path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>Running</span>`
  } else if (paused) {
    statusDot = html`<span class="flex items-center gap-1.5 text-xs font-semibold text-amber-600"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Paused</span>`
  } else if (hasError) {
    statusDot = html`<span class="flex items-center gap-1.5 text-xs font-semibold text-red-600"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>Error</span>`
  } else if (neverRun) {
    statusDot = html`<span class="flex items-center gap-1.5 text-xs font-semibold text-slate-400"><span class="w-1.5 h-1.5 rounded-full bg-slate-300"></span>Pending</span>`
  } else {
    statusDot = html`<span class="flex items-center gap-1.5 text-xs font-semibold text-emerald-600"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Active</span>`
  }

  const lastResultHtml: Raw = s.running
    ? html`<span class="text-xs text-blue-500 animate-pulse">In progress...</span>`
    : neverRun || !lastResult
      ? html`<span class="text-xs text-slate-400">--</span>`
      : hasError
        ? html`<span class="text-xs text-red-500 break-all" title="${lastResult.error!}">${lastResult.error!.length > 50 ? lastResult.error!.slice(0, 50) + '...' : lastResult.error}</span>`
        : html`<div class="flex items-center gap-2 text-[11px] font-medium">
            <span class="text-blue-600" title="Fetched">${String(lastResult.fetched)} <span class="text-blue-300">fetched</span></span>
            <span class="text-slate-300">|</span>
            <span class="text-emerald-600" title="Inserted">${String(lastResult.inserted)} <span class="text-emerald-300">new</span></span>
            <span class="text-slate-300">|</span>
            <span class="text-slate-400" title="Skipped duplicates">${String(lastResult.skipped)} <span class="text-slate-300">dupes</span></span>
          </div>`

  return html`
    <tr id="poller-row-${name}" class="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors group">
      <td class="px-4 py-3">
        <div class="flex items-center gap-2.5">
          <span class="inline-flex items-center justify-center w-7 h-7 rounded-lg" style="background: rgba(47,92,133,0.08); color: var(--fc-blue-mid);">
            ${icon(iconName)}
          </span>
          <div class="flex items-center gap-1.5">
            <span class="font-semibold text-slate-900 text-[13px]">${label}</span>
            ${description ? html`<span class="fc-info-tip text-slate-300 transition-colors">${icon('info')}<span class="fc-info-tooltip">${description}</span></span>` : ''}
          </div>
          <span class="text-[10px] text-slate-400 font-medium hidden lg:inline">Every ${intervalLabel}</span>
        </div>
      </td>
      <td class="px-4 py-3">${statusDot}</td>
      <td class="px-4 py-3">
        <span class="text-xs text-slate-600 ${neverRun ? 'text-slate-400' : ''}">${lastRunDisplay}</span>
      </td>
      <td class="px-4 py-3">${lastResultHtml}</td>
      <td class="px-4 py-3">
        <span class="text-xs ${paused ? 'text-amber-500 font-medium' : 'text-slate-600'}">${nextRunDisplay}</span>
      </td>
      <td class="px-4 py-3 text-right">
        <div class="inline-flex items-center gap-1">
          <span class="fc-pause-resume-btn">
            ${paused
              ? html`<button type="button"
                      hx-post="/settings/resume/${name}"
                      hx-target="#poller-row-${name}"
                      hx-swap="outerHTML"
                      title="Resume auto-scheduling"
                      class="inline-flex items-center justify-center w-7 h-7 rounded-md text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors">
                    ${icon('play')}
                  </button>`
              : html`<button type="button"
                      hx-post="/settings/pause/${name}"
                      hx-target="#poller-row-${name}"
                      hx-swap="outerHTML"
                      title="Pause auto-scheduling"
                      class="inline-flex items-center justify-center w-7 h-7 rounded-md text-amber-500 hover:bg-amber-50 border border-transparent hover:border-amber-200 transition-colors">
                    ${icon('pause')}
                  </button>`
            }
          </span>
          <button type="button"
                  hx-post="/settings/run/${name}"
                  hx-target="#poller-row-${name}"
                  hx-swap="outerHTML"
                  hx-disabled-elt="this"
                  title="${s.running ? 'Running...' : hasError ? 'Retry now' : 'Run now'}"
                  ${s.running ? 'disabled' : ''}
                  class="fc-run-btn inline-flex items-center justify-center w-7 h-7 rounded-md ${s.running ? 'text-slate-300 cursor-not-allowed' : hasError ? 'text-red-500 hover:bg-red-50 hover:border-red-200' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'} border border-transparent transition-colors ${paused ? 'hidden' : ''}">
            <span class="htmx-indicator">
              <svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" opacity="0.25"/>
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
              </svg>
            </span>
            <span class="poller-run-label">${icon('refresh')}</span>
          </button>
        </div>
      </td>
    </tr>`
}
