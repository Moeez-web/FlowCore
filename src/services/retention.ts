import { pruneOldActivities } from '../db/queries.ts'

const DEFAULT_DAYS = Number(process.env.RETENTION_DAYS ?? 30)
const SIX_HOURS_MS = 6 * 60 * 60 * 1000

export function startRetentionJob(): void {
  // Only run on the interval — skip at boot so poller backfill data isn't
  // immediately pruned before the user has a chance to triage it.
  const run = () => {
    try {
      const deleted = pruneOldActivities(DEFAULT_DAYS)
      if (deleted > 0) {
        console.log(`[retention] pruned ${deleted} activities older than ${DEFAULT_DAYS} days (kept Useful)`)
      }
    } catch (err) {
      console.error('[retention] error pruning:', err)
    }
  }

  // First run after 6 hours, then every 6 hours
  setTimeout(() => {
    run()
    setInterval(run, SIX_HOURS_MS).unref()
  }, SIX_HOURS_MS)
}
