import { Hono } from 'hono'
import { html } from '../lib/html.ts'
import { parseFilter, type Filter } from '../lib/filters.ts'
import { getSeoKeywordSummary, getSeoBaselinePositions, listKeywords, addKeyword, removeKeyword } from '../db/queries.ts'
import { keywordsPage, keywordPills, keywordCountLabel } from '../views/keywords.ts'
import { seoKeywordCard } from '../views/seo-card.ts'

export const keywordsRoutes = new Hono()

keywordsRoutes.get('/keywords', (c) => {
  const query: Record<string, string | string[]> = {}
  for (const [k, v] of Object.entries(c.req.queries())) {
    query[k] = v.length === 1 ? v[0]! : v
  }

  const filter: Filter = {
    ...parseFilter(query),
    page: 1,
    cursor: undefined,
  }

  const isHtmx = c.req.header('HX-Request') === 'true'
  const seoSummary = getSeoKeywordSummary(filter.days)
  const seoBaseline = getSeoBaselinePositions()
  const keywords = listKeywords()

  if (isHtmx) {
    return c.html(keywordsPage({
      filter, seoSummary, seoBaseline, keywords, fragment: true,
    }).value)
  }

  return c.html(keywordsPage({
    filter, seoSummary, seoBaseline, keywords,
  }).value)
})

function buildMutationResponse(keywords: string[], filter: Filter) {
  const seoSummary = getSeoKeywordSummary(filter.days)
  const seoBaseline = getSeoBaselinePositions()
  return html`${keywordPills(keywords)}
<div id="keywords-content" hx-swap-oob="innerHTML">${seoKeywordCard(seoSummary, filter.days, filter, seoBaseline)}</div>
<span id="keyword-count" hx-swap-oob="innerHTML">${keywordCountLabel(keywords.length)}</span>`.value
}

keywordsRoutes.post('/keywords/add', async (c) => {
  const form = await c.req.parseBody()
  const raw = String(form['keyword'] ?? '').trim().slice(0, 120)
  const filter: Filter = { signal_types: [], tags: [], days: 30, status: 'new', search: '', page: 1, seo_filter: 'all' }

  if (raw) addKeyword(raw)

  return c.html(buildMutationResponse(listKeywords(), filter))
})

keywordsRoutes.delete('/keywords/remove', async (c) => {
  const raw = c.req.query('keyword')?.trim() ?? String((await c.req.parseBody())['keyword'] ?? '').trim()
  const filter: Filter = { signal_types: [], tags: [], days: 30, status: 'new', search: '', page: 1, seo_filter: 'all' }

  if (raw) removeKeyword(raw)

  return c.html(buildMutationResponse(listKeywords(), filter))
})
