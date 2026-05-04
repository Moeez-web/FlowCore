# FlowCore Marketing Sensor (Prototype)

Competitor intelligence dashboard for FlowCore Water — tracks ~22 competitors across six channels (websites, Meta ads, Google ads, TikTok, YouTube Shorts, SEO) and surfaces activity in one filterable feed with "useful / skip" tagging that feeds the future Phase 2 content agent.

This is the **prototype build with synthetic data**. Schema, routes, and UI are all production-shaped — only the data source is simulated. After Robert approves, real free-tier API pollers replace the seed script with no schema or UI changes.

---

## Setup

```bash
npm install
cp .env.example .env
# add your OPENROUTER_API_KEY to .env
npm run dev
```

Open <http://localhost:3000>.

The database file is created at `data/flowcore.db` on first boot, and seeded with 22 competitors and ~100 activities across the six channels spread across the last 30 days.

### Required: OpenRouter API key

The only live integration in the prototype is OpenRouter, used for the "Why this matters" AI summaries on activity detail pages. Get a key from <https://openrouter.ai> and put it in `.env`:

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_SOTA_MODEL=anthropic/claude-sonnet-4.5
```

Without a key, every other feature still works — only the "Why this matters" button will fail.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Hot-reload server via `tsx watch` |
| `npm run start` | Run server without watch |
| `npm run seed` | Seed if the DB is empty (auto-runs on first boot) |
| `npm run db:reset` | Drop the DB and reseed from scratch |

---

## Stack

- **Hono** + TypeScript on Node
- **better-sqlite3** for storage (single file at `data/flowcore.db`)
- **htmx** + **Tailwind** loaded from CDNs (no bundler in the prototype)
- **OpenRouter** for AI summaries (lazy / cached)
- **`tsx`** for direct TS execution (no build step)

See `project-doc/PRD-flowcore-water.md` and `project-doc/phases.md` for the original scope and the build phase plan.

---

## Routes

### Dashboard

| Method | Path | Returns |
|---|---|---|
| `GET` | `/` | Full dashboard page (uses last saved filter when no query params) |
| `GET` | `/activities` | htmx fragment of filtered list, OR full page on direct browser hit |
| `GET` | `/activities/:id` | Detail drawer fragment |
| `POST` | `/activities/:id/status` | Toggle status (`new` / `useful` / `skip`); returns updated row |
| `POST` | `/activities/:id/summary` | Generate or fetch cached AI summary |

### Settings

| Method | Path | Returns |
|---|---|---|
| `GET` | `/competitors` | Page with full competitor table |
| `POST` | `/competitors` | Create new competitor; returns row fragment |
| `DELETE` | `/competitors/:id` | Delete competitor (cascade removes channels and activities) |
| `POST` | `/competitors/:id/channels/:channel/toggle` | Flip channel enabled flag; returns updated toggle button |
| `GET` | `/keywords` | Page with keyword list |
| `POST` | `/keywords` | Add keyword |
| `DELETE` | `/keywords/:id` | Remove keyword |

### Misc

| Method | Path | Returns |
|---|---|---|
| `GET` | `/healthz` | `ok` |
| `GET` | `/?reset=1` | Clear saved filter and redirect to defaults |

---

## Data model

Five tables in SQLite:

- `competitors` — name, domain, tier (`local` / `mondo` / `national` / `inspiration`), vertical (`well` / `plumbing`), logo emoji
- `competitor_channels` — per-competitor channel toggle (6 rows per competitor)
- `keywords` — SEO terms tracked
- `activities` — the intelligence-board feed; `dedup_key` UNIQUE per (competitor, channel) so live pollers can swap in safely; `summary_text` populated lazily by OpenRouter; `status` is `new` / `useful` / `skip` and is what the Phase 2 content agent will read
- `settings` — key/value (currently just `last_filter`)

See `src/db/schema.sql` for the authoritative DDL.

---

## Project layout

```
src/
├── index.ts                 # Hono boot
├── config.ts                # env loading
├── db/
│   ├── schema.sql           # all DDL
│   ├── client.ts            # SQLite connection
│   ├── migrate.ts           # idempotent run of schema.sql
│   ├── queries.ts           # typed read/write helpers
│   └── settings.ts          # key/value helpers
├── seed/
│   ├── seed.ts              # idempotent boot-time seeder
│   ├── competitors.ts       # 22 hand-authored DFW + national companies
│   ├── activities.ts        # deterministic Mulberry32 generator
│   └── lorem.ts             # per-channel content templates
├── lib/
│   ├── html.ts              # tagged-template helper with auto-escape
│   └── filters.ts           # query-string parser + SQL WHERE builder
├── views/
│   ├── layout.ts            # base shell (Tailwind + htmx via CDN)
│   ├── dashboard.ts         # /
│   ├── activity-row.ts
│   ├── activity-list.ts
│   ├── activity-detail.ts   # drawer (Phase D) + summarySection (Phase E)
│   ├── competitors.ts
│   └── keywords.ts
├── routes/
│   ├── dashboard.ts
│   ├── activity.ts
│   ├── competitors.ts
│   └── keywords.ts
└── services/
    ├── openrouter.ts        # only live external integration
    └── summary.ts           # cache-aware "Why this matters"
```

---

## Going live (post-approval)

After Robert approves the prototype, the next chunk of work is:

1. Add `src/pollers/{website,meta-ads,google-ads,tiktok,youtube-shorts,backlinks,serp}.ts` — each one calls its API and writes to the existing `activities` table using the existing `dedup_key` UNIQUE constraint
2. Add Railway cron entries (daily for fast channels, weekly for SEO/backlinks)
3. Plug real keys: Apify, ZenRows, YouTube Data API v3, Serper, DataForSEO
4. Add per-channel rate-limit handling and a simple `poll_failures` log
5. Replace the synthetic competitor seed list with Robert's confirmed ~22

Schema and dashboard do not change. The handoff seam is the `activities` table.
