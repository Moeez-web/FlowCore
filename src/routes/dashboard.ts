import { Hono } from 'hono'
import { parseFilter, type Filter, DEFAULT_FILTER, filterToQuery } from '../lib/filters.ts'
import {
  getActivities, getActivitiesAfterCursor, getSavedActivitiesAfterCursor,
  countActivities, listTagsWithCounts, INFINITE_SCROLL_BATCH_SIZE,
  encodeCursor, PAGE_SIZE,
} from '../db/queries.ts'
import { dashboardPage } from '../views/dashboard.ts'
import { activityList, infiniteScrollFragment } from '../views/activity-list.ts'
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
  const keys = Object.keys(query).filter((k) => k !== 'reset' && k !== 'page' && k !== 'cursor')
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

function statusCounts(filter: Filter): { all: number; new: number; useful: number } {
  return {
    all:    countActivities({ ...filter, status: 'all' }),
    new:    countActivities({ ...filter, status: 'new' }),
    useful: countActivities({ ...filter, status: 'useful' }),
  }
}

function buildInfiniteScroll(
  rows: ReturnType<typeof getActivitiesAfterCursor>,
  filter: Filter,
  total: number,
  baseUrl: string,
  scrollBaseUrl: string,
) {
  const nextCursor = rows.length >= INFINITE_SCROLL_BATCH_SIZE
    ? encodeCursor(rows[rows.length - 1]!)
    : null
  return { nextCursor, filter, baseUrl: scrollBaseUrl, total }
}

// ── Routes ──

dashboardRoutes.get('/', (c) => {
  const query = queriesObj(c)

  if (typeof query['reset'] === 'string') {
    clearSetting(LAST_FILTER_KEY)
    return c.redirect('/', 302)
  }

  let filter: Filter
  if (hasUserFilter(query)) {
    filter = parseFilter(query)
    setSetting(LAST_FILTER_KEY, { ...filter, page: 1, cursor: undefined })
  } else {
    const saved = getSetting<Filter>(LAST_FILTER_KEY)
    filter = { ...DEFAULT_FILTER, ...(saved ?? {}), page: 1, cursor: undefined }
  }

  const tagsWithCounts = listTagsWithCounts({ activeOnly: true })
  const rows = getActivitiesAfterCursor(filter, undefined)
  const total = countActivities(filter)
  const infiniteScroll = buildInfiniteScroll(rows, filter, total, '/activities', '/activities/scroll')

  return c.html(
    dashboardPage({
      filter, tagsWithCounts, rows, infiniteScroll,
      statusCounts: statusCounts(filter),
    }).value,
  )
})

dashboardRoutes.get('/useful', (c) => {
  const query = queriesObj(c)
  const filter: Filter = { ...parseFilter(query), status: 'useful', cursor: undefined }
  const rows = getSavedActivitiesAfterCursor({ cursor: undefined })
  const total = countActivities(filter)
  const isHtmx = c.req.header('HX-Request') === 'true'

  const infiniteScroll = buildInfiniteScroll(rows, filter, total, '/useful', '/useful/scroll')

  if (isHtmx) {
    return c.html(
      activityList(rows, {
        context: 'board',
        infiniteScroll,
      }).value,
    )
  }

  const tagsWithCounts = listTagsWithCounts({ activeOnly: true })
  return c.html(
    dashboardPage({
      filter, tagsWithCounts, rows, infiniteScroll,
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
  setSetting(LAST_FILTER_KEY, { ...filter, page: 1, cursor: undefined })
  const rows = getActivitiesAfterCursor(filter, undefined)
  const total = countActivities(filter)
  const isHtmx = c.req.header('HX-Request') === 'true'
  const infiniteScroll = buildInfiniteScroll(rows, filter, total, '/activities', '/activities/scroll')

  if (isHtmx) {
    return c.html(
      activityList(rows, {
        context: 'board',
        infiniteScroll,
      }).value,
    )
  }

  const tagsWithCounts = listTagsWithCounts({ activeOnly: true })
  return c.html(
    dashboardPage({
      filter, tagsWithCounts, rows, infiniteScroll,
      statusCounts: statusCounts(filter),
    }).value,
  )
})

// Infinite scroll endpoint — returns only card fragments that replace the sentinel.
dashboardRoutes.get('/activities/scroll', (c) => {
  const isHtmx = c.req.header('HX-Request') === 'true'
  if (!isHtmx) return c.redirect('/', 302)

  const filter = parseFilter(queriesObj(c))
  const cursor = c.req.query('cursor') || undefined
  const rows = getActivitiesAfterCursor(filter, cursor)
  const nextCursor = rows.length >= INFINITE_SCROLL_BATCH_SIZE
    ? encodeCursor(rows[rows.length - 1]!)
    : null

  return c.html(
    infiniteScrollFragment(rows, {
      context: 'board',
      nextCursor,
      filter,
      baseUrl: '/activities/scroll',
    }).value,
  )
})

dashboardRoutes.get('/useful/scroll', (c) => {
  const isHtmx = c.req.header('HX-Request') === 'true'
  if (!isHtmx) return c.redirect('/useful', 302)

  const filter: Filter = { ...parseFilter(queriesObj(c)), status: 'useful' }
  const cursor = c.req.query('cursor') || undefined
  const rows = getSavedActivitiesAfterCursor({ cursor })
  const nextCursor = rows.length >= INFINITE_SCROLL_BATCH_SIZE
    ? encodeCursor(rows[rows.length - 1]!)
    : null

  return c.html(
    infiniteScrollFragment(rows, {
      context: 'board',
      nextCursor,
      filter,
      baseUrl: '/useful/scroll',
    }).value,
  )
})
