import { html, type Raw } from '../lib/html.ts'
import { config } from '../config.ts'

// Standalone login page — does NOT use the main layout because it doesn't
// have/need the nav, filters, etc. Inherits the brand fonts + palette so it
// feels like the same app.
export function loginPage(opts: { error?: string } = {}): Raw {
  const { demoEmail, demoPassword } = config.auth
  const errorBlock = opts.error
    ? html`<div class="bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium px-3 py-2 rounded-md mb-4">
        ${opts.error}
      </div>`
    : ''

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
        --fc-text-body:   #4b5554;
      }
      body {
        font-family: "Inter", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
        background-color: var(--fc-bg);
        background-image:
          radial-gradient(at 0% 0%,   rgba(20, 47, 69, 0.06) 0px, transparent 55%),
          radial-gradient(at 100% 100%, rgba(23, 102, 217, 0.05) 0px, transparent 55%);
        background-attachment: fixed;
        color: var(--fc-text);
      }
      h1, h2 {
        font-family: "Kumbh Sans", "Inter", system-ui, sans-serif;
        letter-spacing: -0.01em;
      }
      input:focus,
      input:focus-visible {
        --tw-ring-color: var(--fc-blue-mid) !important;
        border-color: var(--fc-blue-mid) !important;
        outline-color: var(--fc-blue-mid) !important;
      }
      .fc-btn-primary {
        background-color: var(--fc-blue-mid);
        color: #fff;
        transition: background-color 140ms ease-out, transform 80ms ease-out, box-shadow 140ms ease-out;
        box-shadow: 0 1px 3px rgba(47, 92, 133, 0.25);
      }
      .fc-btn-primary:hover {
        background-color: #25496a;
        box-shadow: 0 2px 6px rgba(47, 92, 133, 0.35);
      }
      .fc-btn-primary:active { transform: scale(0.98); }
      .brand-strip {
        background: linear-gradient(90deg, var(--fc-navy) 0%, var(--fc-blue) 60%, var(--fc-orange) 100%);
        height: 4px;
      }
    </style>
  </head>
  <body class="min-h-screen antialiased">
    <div class="brand-strip"></div>
    <main class="flex items-center justify-center px-4 py-12 sm:py-20">
      <div class="bg-white rounded-2xl shadow-xl p-8 sm:p-10 w-full max-w-md border border-slate-200">
        <div class="flex items-center justify-center mb-5">
          <img src="https://framerusercontent.com/images/uQINMOmoogUSpSBaaZQG2jOWg8.png"
               alt="FlowCore Water"
               class="h-9 w-auto" />
        </div>
        <h1 class="text-xl font-bold text-center" style="color: var(--fc-navy);">Marketing Sensor</h1>
        <p class="text-sm text-slate-500 text-center mt-1 mb-6">Sign in to continue</p>

        ${errorBlock}

        <form method="POST" action="/login" class="space-y-4">
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
            <input type="email" name="email" required value="${demoEmail}" autocomplete="email"
                   class="w-full text-sm border-2 border-slate-200 rounded-md px-3 py-2.5 focus:ring-2 focus:border-slate-400 transition-colors" />
          </div>
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Password</label>
            <input type="password" name="password" required value="${demoPassword}" autocomplete="current-password"
                   class="w-full text-sm border-2 border-slate-200 rounded-md px-3 py-2.5 focus:ring-2 focus:border-slate-400 transition-colors" />
          </div>
          <button type="submit"
                  class="fc-btn-primary w-full text-sm font-semibold px-4 py-2.5 rounded-md mt-2">
            Sign in →
          </button>
        </form>

        <div class="mt-6 pt-5 border-t border-slate-200">
          <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Demo credentials</p>
          <div class="bg-slate-50 border border-slate-200 rounded-md p-3 font-mono text-xs space-y-1">
            <p>Email: <span class="font-semibold text-slate-900">${demoEmail}</span></p>
            <p>Password: <span class="font-semibold text-slate-900">${demoPassword}</span></p>
          </div>
          <p class="text-[10px] text-slate-400 mt-2">Pre-filled in the form — just click <strong>Sign in</strong>.</p>
        </div>

        <p class="text-[10px] text-center text-slate-400 mt-6">
          Prototype build · session token expires in 7 days
        </p>
      </div>
    </main>
  </body>
</html>`
}
