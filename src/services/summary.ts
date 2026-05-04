import { config } from '../config.ts'
import { getActivityById, setActivitySummary, type ActivityRow } from '../db/queries.ts'
import { generateSummary, OpenRouterError } from './openrouter.ts'

const inflight = new Map<number, Promise<ActivityRow | null>>()

export interface SummaryResult {
  ok: boolean
  activity: ActivityRow | null
  error?: string
}

export async function getOrGenerateSummary(id: number): Promise<SummaryResult> {
  const existing = getActivityById(id)
  if (!existing) return { ok: false, activity: null, error: 'Activity not found' }
  if (existing.summary_text && existing.summary_text.length > 0) {
    return { ok: true, activity: existing }
  }

  const cached = inflight.get(id)
  if (cached) {
    const activity = await cached
    return activity?.summary_text
      ? { ok: true, activity }
      : { ok: false, activity, error: 'Generation failed' }
  }

  const work = (async () => {
    try {
      const text = await generateSummary(existing)
      return setActivitySummary(id, text, config.openRouter.sotaModel)
    } catch (err) {
      if (err instanceof OpenRouterError) {
        console.error(`[summary] activity ${id}: ${err.message}`)
      } else {
        console.error(`[summary] activity ${id}: unexpected error`, err)
      }
      return null
    } finally {
      inflight.delete(id)
    }
  })()

  inflight.set(id, work)
  const activity = await work
  if (!activity) {
    return { ok: false, activity: getActivityById(id), error: 'Could not reach the AI service. Try again.' }
  }
  return { ok: true, activity }
}
