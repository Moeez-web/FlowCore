import 'dotenv/config'
import { resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dbPath: resolve(repoRoot, process.env.DB_PATH ?? './data/flowcore.db'),
  schemaPath: resolve(repoRoot, 'src/db/schema.sql'),
  openRouter: {
    apiKey: process.env.OPENROUTER_API_KEY ?? '',
    sotaModel: process.env.OPENROUTER_SOTA_MODEL ?? 'google/gemini-2.5-flash',
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
  zenrows: {
    apiKey: process.env.ZENROWS_API_KEY ?? '',
    timeoutMs: 45_000,
  },
  serper: {
    apiKey: process.env.SERP_API_KEY ?? '',
    timeoutMs: 15_000,
  },
  serpstat: {
    apiToken: process.env.SERPSTAT_API_TOKEN ?? '',
    timeoutMs: 15_000,
  },
  apify: {
    apiToken: process.env.APIFY_API_TOKEN ?? '',
    timeoutMs: 180_000,
  },
  pollers: {
    enabled: process.env.POLLERS_ENABLED !== '0',
    zenrowsIntervalMs: Number(process.env.ZENROWS_INTERVAL_MS ?? 7 * 24 * 60 * 60 * 1000),
    serperIntervalMs: Number(process.env.SERPER_INTERVAL_MS ?? 24 * 60 * 60 * 1000),
    serpstatIntervalMs: Number(process.env.SERPSTAT_INTERVAL_MS ?? 24 * 60 * 60 * 1000),
    youtubeIntervalMs: Number(process.env.YOUTUBE_INTERVAL_MS ?? 7 * 24 * 60 * 60 * 1000),
    tiktokIntervalMs: Number(process.env.TIKTOK_INTERVAL_MS ?? 7 * 24 * 60 * 60 * 1000),
    googleAdsIntervalMs: Number(process.env.GOOGLE_ADS_INTERVAL_MS ?? 3 * 24 * 60 * 60 * 1000),
    metaAdsIntervalMs: Number(process.env.META_ADS_INTERVAL_MS ?? 3 * 24 * 60 * 60 * 1000),
    instagramIntervalMs: Number(process.env.INSTAGRAM_INTERVAL_MS ?? 7 * 24 * 60 * 60 * 1000),
  },
} as const
