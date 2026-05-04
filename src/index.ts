import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { config } from './config.ts'
import { migrate } from './db/migrate.ts'
import { seed } from './seed/seed.ts'
import { dashboardRoutes } from './routes/dashboard.ts'
import { activityRoutes } from './routes/activity.ts'
import { signalRoutes } from './routes/signals.ts'
import { adminRoutes } from './routes/admin.ts'
import { authRoutes } from './routes/auth.ts'
import { authMiddleware } from './middleware/auth.ts'
import { startRetentionJob } from './services/retention.ts'

migrate()

// FORCE_RESEED=1 — wipes existing rows and reseeds. Useful on Railway where
// the volume persists between deploys; without this, the seed's isEmpty()
// guard skips re-running and new seed anchors never appear in production.
// Drop the env var (or set it to anything else) after one successful deploy.
if (process.env.FORCE_RESEED === '1') {
  const { db } = await import('./db/client.ts')
  db.exec(`
    DELETE FROM signal_tags;
    DELETE FROM tags;
    DELETE FROM activities;
    DELETE FROM signals;
  `)
  // sqlite_sequence only exists once an AUTOINCREMENT column has been used —
  // it's missing on a fresh DB, so guard the reset.
  const hasSeq = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence'`).get()
  if (hasSeq) {
    db.exec(`DELETE FROM sqlite_sequence WHERE name IN ('signals', 'activities', 'tags');`)
  }
  console.log('[FORCE_RESEED] cleared signals/activities/tags — reseeding…')
}

const seedResult = seed({ force: false })
if (seedResult.signals > 0) {
  console.log(`seeded ${seedResult.signals} signals, ${seedResult.activities} activities`)
}

startRetentionJob()

const app = new Hono()

app.get('/healthz', (c) => c.text('ok'))

// Auth routes (login, logout) are public — middleware allow-lists them.
app.route('/', authRoutes)

// Everything below this line requires a valid JWT cookie.
app.use('*', authMiddleware)
app.route('/', dashboardRoutes)
app.route('/', activityRoutes)
app.route('/', signalRoutes)
app.route('/', adminRoutes)
// /saved removed — use the Board's status=useful filter instead.

serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`flowcore-water listening on http://localhost:${info.port}`)
})
