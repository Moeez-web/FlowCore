import 'dotenv/config'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dbPath: resolve(repoRoot, process.env.DB_PATH ?? './data/flowcore.db'),
  schemaPath: resolve(repoRoot, 'src/db/schema.sql'),
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    sotaModel: process.env.OPENROUTER_SOTA_MODEL ?? 'anthropic/claude-sonnet-4.5',
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET ?? 'dev-only-change-me-in-production-please',
    demoEmail: process.env.AUTH_DEMO_EMAIL ?? 'demo@flowcorewater.com',
    demoPassword: process.env.AUTH_DEMO_PASSWORD ?? 'flowcore2026',
    cookieSecure: process.env.NODE_ENV === 'production',
  },
  // Resend: when both keys are set, /admin/setup submissions get emailed
  // to notifyEmail. Without them, submissions are still saved to the
  // settings table and logged to stderr — same as before.
  resend: {
    apiKey: process.env.RESEND_API_KEY ?? '',
    notifyEmail: process.env.SETUP_NOTIFY_EMAIL ?? '',
    fromAddress: process.env.SETUP_FROM_EMAIL ?? 'FlowCore Sensor <onboarding@resend.dev>',
  },
} as const
