import { Hono } from 'hono'
import { parseFilter, type Filter, DEFAULT_FILTER, filterToQuery } from '../lib/filters.ts'
import {
  getActivities, countActivities, listTagsWithCounts, PAGE_SIZE,
} from '../db/queries.ts'
import { dashboardPage } from '../views/dashboard.ts'
import { activityList } from '../views/activity-list.ts'
import { getSetting, setSetting, clearSetting } from '../db/settings.ts'

export const dashboardRoutes = new Hono()

const LAST_FILTER_KEY = 'last_filter'

function queriesObj(c: { req: { queries: () => Record<string, string[]> } }): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}
  for (const [k, v] of Object.entries(c.req.queries())) {
    out[k] = v.length === 1 ? v[0]! : v
  }
  return out
}

function hasUserFilter(query: Record<string, string | string[]>): boolean {
  const keys = Object.keys(query).filter((k) => k !== 'reset' && k !== 'page')
  return keys.length > 0
}

function buildPagination(filter: Filter, total: number, baseUrl: string) {
  return {
    page: filter.page,
    pageSize: PAGE_SIZE,
    total,
    baseUrl,
    query: filterToQuery(filter),
    hxTarget: '#feed',
    hxSwap: 'innerHTML',
  }
}

// Counts per status — same filter as the user picked, just status-overridden.
// Drives the count badges on the status segmented control.
function statusCounts(filter: Filter): { all: number; new: number; useful: number } {
  return {
    all:    countActivities({ ...filter, status: 'all' }),
    new:    countActivities({ ...filter, status: 'new' }),
    useful: countActivities({ ...filter, status: 'useful' }),
  }
}

dashboardRoutes.get('/', (c) => {
  const query = queriesObj(c)

  if (typeof query['reset'] === 'string') {
    clearSetting(LAST_FILTER_KEY)
    return c.redirect('/', 302)
  }

  let filter: Filter
  if (hasUserFilter(query)) {
    filter = parseFilter(query)
    setSetting(LAST_FILTER_KEY, { ...filter, page: 1 })  // don't persist page
  } else {
    const saved = getSetting<Filter>(LAST_FILTER_KEY)
    filter = { ...DEFAULT_FILTER, ...(saved ?? {}), page: parseFilter(query).page }
  }

  const tagsWithCounts = listTagsWithCounts({ activeOnly: true })
  const rows = getActivities(filter)
  const total = countActivities(filter)
  return c.html(
    dashboardPage({
      filter, tagsWithCounts, rows,
      pagination: buildPagination(filter, total, '/activities'),
      statusCounts: statusCounts(filter),
    }).value,
  )
})

// Dedicated Useful list — always status=useful, doesn't persist filters back
// to LAST_FILTER_KEY (so navigating to / restores the user's normal Board
// view). Other filter dimensions (search, date, types, tags) still work via
// query params. Handles both full-page renders and htmx feed swaps.
dashboardRoutes.get('/useful', (c) => {
  const query = queriesObj(c)
  const filter: Filter = { ...parseFilter(query), status: 'useful' }
  const rows = getActivities(filter)
  const total = countActivities(filter)
  const isHtmx = c.req.header('HX-Request') === 'true'

  if (isHtmx) {
    return c.html(
      activityList(rows, {
        context: 'board',
        pagination: buildPagination(filter, total, '/useful'),
      }).value,
    )
  }

  const tagsWithCounts = listTagsWithCounts({ activeOnly: true })
  return c.html(
    dashboardPage({
      filter, tagsWithCounts, rows,
      pagination: buildPagination(filter, total, '/useful'),
      statusCounts: statusCounts(filter),
      activeNav: 'useful',
      title: 'Useful',
      heading: 'Useful signals',
      feedUrl: '/useful',
      resetUrl: '/useful',
    }).value,
  )
})

dashboardRoutes.get('/activities', (c) => {
  const filter = parseFilter(queriesObj(c))
  setSetting(LAST_FILTER_KEY, { ...filter, page: 1 })
  const rows = getActivities(filter)
  const total = countActivities(filter)
  const isHtmx = c.req.header('HX-Request') === 'true'

  if (isHtmx) {
    return c.html(
      activityList(rows, {
        context: 'board',
        pagination: buildPagination(filter, total, '/activities'),
      }).value,
    )
  }

  // Direct browser hit — full page
  const tagsWithCounts = listTagsWithCounts({ activeOnly: true })
  return c.html(
    dashboardPage({
      filter, tagsWithCounts, rows,
      pagination: buildPagination(filter, total, '/activities'),
      statusCounts: statusCounts(filter),
    }).value,
  )
})
