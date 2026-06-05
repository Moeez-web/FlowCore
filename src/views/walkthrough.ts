import { html, type Raw } from '../lib/html.ts'
import { config } from '../config.ts'
import { icon } from '../lib/icons.ts'

// Single-page landing. Replaces the previous multi-slide walkthrough — too
// much fatigue when paired with the in-app tour. This page puts the hero +
// visual collage + login form all in one view; users see the pitch and sign
// in without clicking through anything. The deep walkthrough is the in-app
// tour that fires after login.

export function walkthroughPage(opts: { error?: string; startStep?: number } = {}): Raw {
  const { demoEmail, demoPassword } = config.auth
  const errorBlock = opts.error
    ? html`<div class="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-3 py-2 rounded-md mb-4">
        ${opts.error}
      </div>`
    : ''

  const channelChips: Array<{ key: string; label: string; tint: string }> = [
    { key: 'website',        label: 'Website',   tint: 'bg-slate-100 text-slate-700' },
    { key: 'meta_ads',       label: 'Meta',      tint: 'bg-blue-100 text-blue-700' },
    { key: 'google_ads',     label: 'Google',    tint: 'bg-emerald-100 text-emerald-700' },
    { key: 'instagram',      label: 'Instagram', tint: 'bg-pink-100 text-pink-700' },
    { key: 'tiktok',         label: 'TikTok',    tint: 'bg-pink-100 text-pink-700' },
    { key: 'youtube_shorts', label: 'YouTube',   tint: 'bg-red-100 text-red-700' },
    { key: 'seo',            label: 'SEO',       tint: 'bg-purple-100 text-purple-700' },
    { key: 'seo',            label: 'Backlinks', tint: 'bg-indigo-100 text-indigo-700' },
  ]

  const features: Array<{ ic: string; title: string; body: string }> = [
    { ic: 'broadcast', title: '8 channels, one feed', body: 'Website, Meta, Google ads, Instagram, TikTok, YouTube, SEO, backlinks.' },
    { ic: 'sparkle',   title: 'AI briefings',         body: 'One-click Claude Sonnet summary scoped to FlowCore.' },
    { ic: 'bookmark',  title: 'Useful queue',         body: 'Triage signals as you scroll — your weekly action list.' },
    { ic: 'website',   title: 'Real channel previews',body: 'Watch TikToks, read blogs, preview ads — all in-feed.' },
  ]

  return html`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Sign in · FlowCore Marketing Sensor</title>
    <link rel="icon" type="image/png" href="https://framerusercontent.com/images/zVeTtxOG2G9yQewZgbbVgHf7Ock.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Kumbh+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
      :root {
        --fc-navy:        #17242f;
        --fc-blue-mid:    #2f5c85;
        --fc-blue:        #1174d1;
        --fc-orange:      #ffa260;
        --fc-bg:          #f1f2fa;
        --fc-text:        #17242f;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        color: var(--fc-text);
        background: var(--fc-bg);
        background-image:
          radial-gradient(at 0% 0%,   rgba(20, 47, 69, 0.06) 0px, transparent 55%),
          radial-gradient(at 100% 100%, rgba(23, 102, 217, 0.06) 0px, transparent 55%);
        background-attachment: fixed;
        min-height: 100vh;
      }
      h1, h2, h3 { font-family: "Kumbh Sans", "Inter", system-ui, sans-serif; letter-spacing: -0.01em; }
      .brand-strip { background: linear-gradient(90deg, var(--fc-navy) 0%, var(--fc-blue) 60%, var(--fc-orange) 100%); height: 4px; }

      input:focus, input:focus-visible {
        --tw-ring-color: var(--fc-blue-mid) !important;
        border-color: var(--fc-blue-mid) !important;
        outline-color: var(--fc-blue-mid) !important;
      }
      .fc-btn-primary {
        background: var(--fc-blue-mid);
        color: #fff;
        transition: background-color 140ms, transform 80ms, box-shadow 140ms;
        box-shadow: 0 1px 3px rgba(47, 92, 133, 0.25);
        border: none; cursor: pointer;
      }
      .fc-btn-primary:hover { background: #25496a; box-shadow: 0 2px 6px rgba(47, 92, 133, 0.35); }
      .fc-btn-primary:active { transform: scale(0.98); }

      .fc-page { max-width: 1180px; margin: 0 auto; padding: 1.25rem 1.5rem 2rem; }
      .fc-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
      .fc-topbar img { height: 32px; }
      .fc-cobrand { display: inline-flex; align-items: center; gap: 0.875rem; }
      .fc-cobrand-x {
        font-size: 18px; color: #cbd5e1; font-weight: 300;
        user-select: none;
      }
      .fc-cobrand-fc { height: 32px; }
      .fc-cobrand-sagan { height: 24px; opacity: 0.85; }
      .fc-pill {
        display: inline-flex; align-items: center; gap: 0.4rem;
        font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em;
        color: var(--fc-blue-mid);
        background: rgba(47, 92, 133, 0.08);
        border: 1px solid rgba(47, 92, 133, 0.15);
        padding: 0.3rem 0.75rem; border-radius: 9999px;
      }

      /* Hero grid: copy left, login right, on desktop. Stacks on mobile. */
      .fc-hero { display: grid; grid-template-columns: 1fr; gap: 1.75rem; align-items: start; }
      @media (min-width: 900px) { .fc-hero { grid-template-columns: 1.15fr 1fr; gap: 3rem; } }

      .fc-eyebrow {
        font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.18em;
        color: var(--fc-blue-mid); margin: 1rem 0 0.5rem;
      }
      .fc-title {
        font-size: clamp(2rem, 4vw, 3rem); font-weight: 800;
        color: var(--fc-navy); margin: 0 0 0.875rem; line-height: 1.05;
      }
      .fc-subtitle { font-size: 16px; line-height: 1.55; color: #475569; margin: 0 0 1.5rem; max-width: 50ch; }

      /* Animated chip strip — subtle, decorative */
      .fc-chip-strip {
        display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.75rem;
      }
      .fc-chip-strip > span {
        display: inline-flex; align-items: center; gap: 0.4rem;
        padding: 0.3rem 0.75rem; border-radius: 9999px;
        font-size: 12px; font-weight: 600;
        animation: chipIn 600ms cubic-bezier(0.32, 0.72, 0, 1) backwards;
      }
      @keyframes chipIn { from { opacity: 0; transform: translateY(6px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }

      /* Feature row below hero */
      .fc-features {
        display: grid; grid-template-columns: 1fr; gap: 0.75rem;
        margin-top: 2.5rem;
      }
      @media (min-width: 700px) { .fc-features { grid-template-columns: repeat(2, 1fr); } }
      @media (min-width: 1000px) { .fc-features { grid-template-columns: repeat(4, 1fr); } }
      .fc-feature {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
        padding: 1rem; box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
      }
      .fc-feature-ic {
        display: inline-flex; align-items: center; justify-content: center;
        width: 32px; height: 32px; border-radius: 8px;
        background: rgba(47, 92, 133, 0.08); color: var(--fc-blue-mid);
        margin-bottom: 0.625rem;
      }
      .fc-feature h3 { font-size: 14px; font-weight: 700; color: var(--fc-navy); margin: 0 0 0.25rem; }
      .fc-feature p   { font-size: 12.5px; color: #64748b; margin: 0; line-height: 1.5; }

      /* Login card */
      .fc-login {
        background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
        padding: 1.75rem; box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
      }
      .fc-login-eyebrow { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: var(--fc-blue-mid); margin: 0 0 0.4rem; }
      .fc-login h2 { font-size: 22px; font-weight: 700; color: var(--fc-navy); margin: 0 0 0.4rem; }
      .fc-login-sub { font-size: 13px; color: #64748b; margin: 0 0 1.25rem; }
      .fc-login-form { display: flex; flex-direction: column; gap: 0.75rem; }
      .fc-login-form label { display: flex; flex-direction: column; gap: 0.3rem; }
      .fc-login-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; }
      .fc-login-form input {
        font-size: 13.5px; padding: 0.625rem 0.75rem;
        border: 2px solid #e2e8f0; border-radius: 8px;
        transition: border-color 140ms; font-family: inherit;
      }
      .fc-login-submit { padding: 0.7rem; border-radius: 8px; font-size: 14px; font-weight: 700; margin-top: 0.5rem; }
      .fc-login-creds {
        background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
        padding: 0.75rem 0.875rem; margin-top: 1rem;
        font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11.5px; color: #334155;
      }
      .fc-login-creds-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #64748b; margin: 0 0 0.4rem; font-family: "Inter", system-ui, sans-serif; }
      .fc-login-creds p { margin: 1px 0; }
      .fc-login-foot { font-size: 11px; color: #94a3b8; text-align: center; margin: 1rem 0 0; }
    </style>
  </head>
  <body>
    <div class="brand-strip"></div>
    <div class="fc-page">
      <div class="fc-topbar">
        <div class="fc-cobrand">
          <img src="https://framerusercontent.com/images/uQINMOmoogUSpSBaaZQG2jOWg8.png" alt="FlowCore Water" class="fc-cobrand-fc" />
          <span class="fc-cobrand-x" aria-hidden="true">×</span>
          <img src="https://saganrecruitment.com/wp-content/uploads/2025/10/Sagan-Logo-2-e1759568299542.png" alt="Sagan" class="fc-cobrand-sagan" />
        </div>
        <span class="fc-pill">Marketing Sensor</span>
      </div>

      <div class="fc-hero">
        <!-- Left: pitch + animated chip strip -->
        <div>
          <p class="fc-eyebrow">FlowCore Marketing Sensor</p>
          <h1 class="fc-title">See every move your competitors make.</h1>
          <p class="fc-subtitle">Track 8 channels in one feed — websites, ads, social, SEO. Triage with one click. AI tells you what each move means for FlowCore.</p>
          <div class="fc-chip-strip">
            ${channelChips.map((c, i) => html`<span class="${c.tint}" style="animation-delay: ${String(i * 60)}ms">${icon(c.key)}${c.label}</span>`)}
          </div>
        </div>

        <!-- Right: login -->
        <div class="fc-login">
          <p class="fc-login-eyebrow">Sign in</p>
          <h2>Welcome back.</h2>
          <p class="fc-login-sub">Enter your credentials to access the dashboard.</p>
          ${errorBlock}
          <form method="POST" action="/login" class="fc-login-form">
            <label>
              <span class="fc-login-label">Email</span>
              <input type="email" name="email" required placeholder="you@company.com" autocomplete="email" />
            </label>
            <label>
              <span class="fc-login-label">Password</span>
              <input type="password" name="password" required autocomplete="current-password" />
            </label>
            <button type="submit" class="fc-btn-primary fc-login-submit">Sign in →</button>
          </form>
          <p class="fc-login-foot">Session valid 7 days · Guided tour fires after sign in</p>
        </div>
      </div>

      <div class="fc-features">
        ${features.map((f) => html`<div class="fc-feature">
          <span class="fc-feature-ic">${icon(f.ic)}</span>
          <h3>${f.title}</h3>
          <p>${f.body}</p>
        </div>`)}
      </div>
    </div>
  </body>
</html>`
}
