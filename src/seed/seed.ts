import { db } from '../db/client.ts'
import { migrate } from '../db/migrate.ts'
import { seedSignals } from './signals.ts'
import { generateActivities } from './activities.ts'

function isEmpty(): boolean {
  const row = db.prepare('SELECT COUNT(*) AS n FROM signals').get() as { n: number }
  return row.n === 0
}

export function seed(opts: { force?: boolean } = {}): { signals: number; activities: number; tags: number } {
  migrate()

  if (!opts.force && !isEmpty()) {
    return { signals: 0, activities: 0, tags: 0 }
  }

  const insertSignal = db.prepare(`
    INSERT OR IGNORE INTO signals (type, target, vertical, tier)
    VALUES (@type, @target, @vertical, @tier)
  `)

  const upsertTag = db.prepare(`INSERT OR IGNORE INTO tags (name) VALUES (?)`)
  const getTagId = db.prepare(`SELECT id FROM tags WHERE name = ?`)
  const insertSignalTag = db.prepare(`INSERT OR IGNORE INTO signal_tags (signal_id, tag_id) VALUES (?, ?)`)

  const insertActivity = db.prepare(`
    INSERT OR IGNORE INTO activities (
      signal_id, activity_type, title, preview,
      source_url, thumbnail_url, detected_at, raw_payload_json,
      summary_text, summary_model, summary_generated_at,
      status, status_changed_at, dedup_key
    ) VALUES (
      @signal_id, @activity_type, @title, @preview,
      @source_url, @thumbnail_url, @detected_at, @raw_payload_json,
      @summary_text, @summary_model, @summary_generated_at,
      @status, @status_changed_at, @dedup_key
    )
  `)

  const tx = db.transaction(() => {
    const signalIds: number[] = []
    for (const s of seedSignals) {
      const info = insertSignal.run({
        type: s.type,
        target: s.target,
        vertical: s.vertical ?? null,
        tier: s.tier ?? null,
      })
      const id = info.lastInsertRowid
        ? Number(info.lastInsertRowid)
        : (db.prepare(`SELECT id FROM signals WHERE type = ? AND target = ?`).get(s.type, s.target) as { id: number }).id
      signalIds.push(id)

      // Apply tags
      for (const t of (s.tags ?? [])) {
        const trimmed = t.trim()
        if (!trimmed) continue
        upsertTag.run(trimmed)
        const tagRow = getTagId.get(trimmed) as { id: number } | undefined
        if (tagRow) insertSignalTag.run(id, tagRow.id)
      }
    }

    const activities = generateActivities(seedSignals)
    for (const a of activities) {
      const signal_id = signalIds[a.signal_index]
      if (signal_id === undefined) continue
      const now = new Date().toISOString()
      insertActivity.run({
        signal_id,
        activity_type: a.activity_type,
        title: a.title,
        preview: a.preview,
        source_url: a.source_url,
        thumbnail_url: a.thumbnail_url,
        detected_at: a.detected_at,
        raw_payload_json: JSON.stringify(a.raw_payload),
        summary_text: a.summary_text,
        summary_model: a.summary_model,
        summary_generated_at: a.summary_text ? now : null,
        status: a.status,
        status_changed_at: a.status === 'new' ? null : now,
        dedup_key: a.dedup_key,
      })
    }
  })

  tx()

  const counts = {
    signals: (db.prepare('SELECT COUNT(*) AS n FROM signals').get() as { n: number }).n,
    activities: (db.prepare('SELECT COUNT(*) AS n FROM activities').get() as { n: number }).n,
    tags: (db.prepare('SELECT COUNT(*) AS n FROM tags').get() as { n: number }).n,
  }
  return counts
}

const isMain = import.meta.url === `file://${process.argv[1]}`
if (isMain) {
  const result = seed({ force: false })
  if (result.signals === 0) {
    console.log('Database already seeded — skipping. Use `npm run db:reset` to reseed.')
  } else {
    console.log(`Seeded: ${result.signals} signals, ${result.tags} tags, ${result.activities} activities.`)
  }
  process.exit(0)
}
