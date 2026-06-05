import { config } from '../config.ts'
import type { ActivityRow } from '../db/queries.ts'

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions'
const TIMEOUT_MS = 20_000

const SYSTEM_PROMPT = `Summarize what this content is about in ONE short sentence. Focus on the key takeaway — what happened, what changed, or what's new. Be specific with names, numbers, and locations. No marketing advice or strategy. Just the main point.`

export class OpenRouterError extends Error {
  constructor(message: string, public override readonly cause?: unknown) {
    super(message)
    this.name = 'OpenRouterError'
  }
}

function buildUserPrompt(a: ActivityRow): string {
  const lines: string[] = []
  const primary = a.signal_tags[0]
  const subject = primary ? `${primary} (${a.signal_target})` : a.signal_target
  const tierBits = [a.signal_tier, a.signal_vertical].filter(Boolean).join(', ')
  const allTags = a.signal_tags.length > 0 ? ` [tags: ${a.signal_tags.join(', ')}]` : ''
  lines.push(`Subject: ${subject}${tierBits ? ` — ${tierBits}` : ''}${allTags}`)
  lines.push(`Signal type: ${a.signal_type}`)
  lines.push(`Activity type: ${a.activity_type}`)
  lines.push(`Title: ${a.title}`)
  if (a.preview) lines.push(`Preview: ${a.preview}`)

  let payload: Record<string, unknown> = {}
  try {
    payload = JSON.parse(a.raw_payload_json) as Record<string, unknown>
  } catch {
    // ignore
  }

  switch (a.signal_type) {
    case 'meta_ads':
      if (payload['headline']) lines.push(`Headline: ${payload['headline']}`)
      if (payload['primary_text']) lines.push(`Primary text: ${payload['primary_text']}`)
      if (payload['cta']) lines.push(`CTA: ${payload['cta']}`)
      if (Array.isArray(payload['platforms'])) lines.push(`Platforms: ${(payload['platforms'] as string[]).join(', ')}`)
      break
    case 'google_ads':
      if (payload['headline']) lines.push(`Headline: ${payload['headline']}`)
      if (payload['description']) lines.push(`Description: ${payload['description']}`)
      if (payload['change_type']) lines.push(`Change type: ${payload['change_type']}`)
      break
    case 'instagram_account':
      if (payload['caption']) lines.push(`Caption: ${payload['caption']}`)
      if (typeof payload['like_count'] === 'number') lines.push(`Likes: ${payload['like_count']}`)
      if (typeof payload['comment_count'] === 'number') lines.push(`Comments: ${payload['comment_count']}`)
      break
    case 'tiktok_account':
      if (payload['caption']) lines.push(`Caption: ${payload['caption']}`)
      if (typeof payload['view_count'] === 'number') lines.push(`Views: ${payload['view_count']}`)
      if (typeof payload['like_count'] === 'number') lines.push(`Likes: ${payload['like_count']}`)
      if (payload['is_viral']) lines.push(`Status: viral`)
      break
    case 'youtube_channel':
      if (payload['title']) lines.push(`Video title: ${payload['title']}`)
      if (typeof payload['view_count'] === 'number') lines.push(`Views: ${payload['view_count']}`)
      if (typeof payload['duration_sec'] === 'number') lines.push(`Duration: ${payload['duration_sec']}s`)
      break
    case 'website':
      // Website signals can also produce SEO rank and backlink activities
      if (payload['keyword']) {
        lines.push(`Keyword: ${payload['keyword']}`)
        if (typeof payload['prev_position'] === 'number' && typeof payload['new_position'] === 'number') {
          lines.push(`Position change: ${payload['prev_position']} → ${payload['new_position']} (delta ${payload['delta']})`)
        }
      } else if (payload['source_domain']) {
        lines.push(`Backlink from: ${payload['source_domain']} (DA ${payload['source_da']})`)
        if (payload['anchor_text']) lines.push(`Anchor text: "${payload['anchor_text']}"`)
        if (payload['target_url']) lines.push(`Target URL: ${payload['target_url']}`)
      } else {
        if (payload['url']) lines.push(`URL: ${payload['url']}`)
        if (payload['target_service']) lines.push(`Target service: ${payload['target_service']}`)
        if (payload['target_city']) lines.push(`Target city: ${payload['target_city']}`)
        if (payload['first_paragraph']) lines.push(`First paragraph: ${payload['first_paragraph']}`)
        if (payload['word_count']) lines.push(`Word count: ${payload['word_count']}`)
      }
      break
  }

  return lines.join('\n')
}

export async function generateSummary(a: ActivityRow): Promise<string> {
  if (!config.openRouter.apiKey) {
    throw new OpenRouterError('OPENROUTER_API_KEY is not set')
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${config.openRouter.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'FlowCore Marketing Sensor',
      },
      body: JSON.stringify({
        model: config.openRouter.sotaModel,
        max_tokens: 80,
        temperature: 0.4,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(a) },
        ],
      }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new OpenRouterError(`OpenRouter HTTP ${res.status}: ${detail.slice(0, 300)}`)
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
    }
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) {
      throw new OpenRouterError('OpenRouter returned no completion content')
    }
    return text
  } catch (err) {
    if (err instanceof OpenRouterError) throw err
    if (err instanceof Error && err.name === 'AbortError') {
      throw new OpenRouterError('OpenRouter request timed out', err)
    }
    throw new OpenRouterError(`OpenRouter request failed: ${(err as Error).message}`, err)
  } finally {
    clearTimeout(timer)
  }
}
