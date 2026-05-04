import { Hono } from 'hono'
import { setSetting } from '../db/settings.ts'
import { config } from '../config.ts'

export const adminRoutes = new Hono()

const FIELD_LABELS: Record<string, string> = {
  // 01 — Competitor channels (comma-separated lists)
  competitor_websites:     'Competitor websites',
  competitor_instagram:    'Competitor Instagram handles',
  competitor_tiktok:       'Competitor TikTok handles',
  competitor_youtube:      'Competitor YouTube channels',
  competitor_facebook:     'Competitor Facebook pages',
  competitor_google_ads:   'Competitor Google Ads IDs',
  // 02 — SEO
  keywords:                'SEO keywords to track',
}
const FIELD_KEYS = Object.keys(FIELD_LABELS)

// Group submitted fields into the same 3 sections the form uses, so the
// email reads like a clean intake summary rather than a flat dump.
const EMAIL_SECTIONS: Array<{ title: string; eyebrow: string; keys: string[] }> = [
  { eyebrow: 'Competitors',  title: 'Channels to track',
    keys: ['competitor_websites', 'competitor_instagram', 'competitor_tiktok', 'competitor_youtube', 'competitor_facebook', 'competitor_google_ads'] },
  { eyebrow: 'SEO',          title: 'Keywords to rank-track',
    keys: ['keywords'] },
]

function buildEmailBody(payload: Record<string, string>): { html: string; text: string } {
  const submittedAt = new Date()
  const niceDate = submittedAt.toLocaleString('en-US', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })

  const sectionsHtml: string[] = []
  const sectionsText: string[] = []
  for (const sec of EMAIL_SECTIONS) {
    const rows: string[] = []
    const lines: string[] = []
    for (const k of sec.keys) {
      const v = payload[k]
      if (!v) continue
      const label = FIELD_LABELS[k] ?? k
      rows.push(
        `<tr>
          <td style="padding:10px 0;font-size:12px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;vertical-align:top;width:180px;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;font-size:13.5px;color:#1e293b;font-family:ui-monospace,SFMono-Regular,monospace;white-space:pre-wrap;word-break:break-all;line-height:1.55;">${escapeHtml(v)}</td>
        </tr>`
      )
      lines.push(`  ${label}\n  ${v.split('\n').join('\n  ')}\n`)
    }
    if (rows.length === 0) continue
    sectionsHtml.push(
      `<div style="margin-top:24px;padding-top:18px;border-top:1px solid #e2e8f0;">
        <p style="margin:0 0 2px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#2f5c85;">${escapeHtml(sec.eyebrow)}</p>
        <h3 style="margin:0 0 10px;font-size:15px;color:#17242f;font-weight:700;">${escapeHtml(sec.title)}</h3>
        <table style="width:100%;border-collapse:collapse;">${rows.join('')}</table>
      </div>`
    )
    sectionsText.push(`\n=== ${sec.title.toUpperCase()} ===\n${lines.join('\n')}`)
  }

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f1f2fa;font-family:Inter,-apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#1e293b;line-height:1.5;">
    <div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(15,23,42,0.05);">
      <div style="height:4px;background:linear-gradient(90deg,#17242f 0%,#1174d1 60%,#ffa260 100%);"></div>
      <div style="padding:28px 32px;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#2f5c85;">FlowCore Marketing Sensor</p>
        <h1 style="margin:0 0 14px;font-size:22px;color:#17242f;font-weight:800;line-height:1.2;">A new setup intake just landed.</h1>
        <p style="margin:0 0 6px;font-size:14px;color:#475569;">A customer submitted the in-app Setup form — everything they sent is below, organised by section.</p>
        <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">${escapeHtml(niceDate)}</p>

        ${sectionsHtml.join('')}

        <div style="margin-top:28px;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#2f5c85;">Next steps</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#334155;line-height:1.65;">
            <li>Map competitor handles into <code style="background:#fff;border:1px solid #e2e8f0;padding:1px 5px;border-radius:4px;font-size:11.5px;">seedSignals</code> or run an import script.</li>
            <li>Add the SEO keywords to the rank-tracking job.</li>
            <li>Schedule the next ingestion run and confirm new cards appear on the Board.</li>
          </ul>
        </div>

        <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.55;">Submission is also stored locally on the deployment for reference.</p>
        <p style="margin:18px 0 0;font-size:13px;color:#475569;">— FlowCore Sensor</p>
      </div>
    </div>
  </body>
</html>`

  const text = `FlowCore Marketing Sensor — Setup intake\n${niceDate}\n\nA customer submitted the in-app Setup form. Below is everything they sent, organised by section.\n${sectionsText.join('\n')}\n\nNext steps:\n  · Map competitor handles into seedSignals or run an import script\n  · Add the SEO keywords to the rank-tracking job\n  · Schedule the next ingestion run and confirm new cards appear on the Board\n\n— FlowCore Sensor`

  return { html, text }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch))
}

// Fire-and-forget — we don't await this so the user doesn't wait on Resend.
// Failures get logged but don't fail the form submission, since the data is
// already saved to the settings table.
async function sendSetupEmail(payload: Record<string, string>): Promise<void> {
  const { apiKey, notifyEmail, fromAddress } = config.resend
  if (!apiKey || !notifyEmail) {
    console.log('[setup] email skipped — RESEND_API_KEY or SETUP_NOTIFY_EMAIL missing')
    return
  }
  const { html, text } = buildEmailBody(payload)
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [notifyEmail],
        subject: 'New FlowCore Sensor setup intake — let\'s wire it up',
        html,
        text,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[setup] Resend ${res.status}: ${body.slice(0, 300)}`)
      return
    }
    console.log(`[setup] emailed to ${notifyEmail}`)
  } catch (err) {
    console.error('[setup] Resend send failed:', (err as Error).message)
  }
}

adminRoutes.post('/admin/setup', async (c) => {
  const form = await c.req.parseBody()
  const payload: Record<string, string> = {}
  for (const k of FIELD_KEYS) {
    const v = String(form[k] ?? '').trim()
    if (v.length > 0) payload[k] = v.slice(0, 4000)
  }
  if (Object.keys(payload).length === 0) {
    return c.text('Nothing to save — every field was empty.', 400)
  }
  // Always save first; email is best-effort.
  const ts = new Date().toISOString()
  setSetting(`setup_${ts}`, payload)
  setSetting('setup_current', { saved_at: ts, ...payload })
  console.log(`[setup] ${ts} keys=${Object.keys(payload).join(',')}`)

  // Fire-and-forget email (no await — user gets a fast response).
  void sendSetupEmail(payload)

  return c.body('', 200)
})
