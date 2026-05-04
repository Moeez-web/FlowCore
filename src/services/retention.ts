import { pruneOldActivities } from '../db/queries.ts'

const DEFAULT_DAYS = Number(process.env.RETENTION_DAYS ?? 30)
const SIX_HOURS_MS = 6 * 60 * 60 * 1000

export function startRetentionJob(): void {
  // Run once at boot, then every 6 hours.
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

  run()
  setInterval(run, SIX_HOURS_MS).unref()
}
