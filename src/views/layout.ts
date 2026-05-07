import { html, raw, type Raw } from '../lib/html.ts'
import { icon } from '../lib/icons.ts'

// Modal for collecting API keys + setup info from the customer. Submits to
// POST /admin/setup which stores values in the settings table for the dev
// team to pick up + emails them via Resend. Every field is optional —
// partial submissions welcome.
interface SetupField { name: string; label: string; hint: string; type?: 'password' | 'textarea' | 'email' | 'text'; placeholder?: string }
interface SetupGroup { title: string; eyebrow: string; fields: SetupField[] }

function setupModal(): Raw {
  const groups: SetupGroup[] = [
    {
      eyebrow: '01 · Competitors',
      title: 'Channels to track',
      fields: [
        { name: 'competitor_websites',   label: 'Websites',          hint: 'Comma-separated list of domains.',                          type: 'textarea', placeholder: 'bakerbrothersplumbing.com, berkeys.com, strittmatters.com' },
        { name: 'competitor_instagram',  label: 'Instagram handles', hint: 'Comma-separated handles (no @).',                           type: 'textarea', placeholder: 'bakerbrothersdfw, therogerwakefield, beaplumbertheysaid' },
        { name: 'competitor_tiktok',     label: 'TikTok handles',    hint: 'Comma-separated handles (no @).',                           type: 'textarea', placeholder: 'therogerwakefield, beaplumbertheysaid' },
        { name: 'competitor_youtube',    label: 'YouTube channels',  hint: 'Comma-separated handles or channel URLs.',                  type: 'textarea', placeholder: '@RogerWakefield, @thisoldhouse, BBPlumbing' },
        { name: 'competitor_facebook',   label: 'Facebook pages',    hint: 'Comma-separated Meta page URLs — drives Ad Library lookups.', type: 'textarea', placeholder: 'facebook.com/BakerBrothersPlumbing, facebook.com/Berkeys' },
        { name: 'competitor_google_ads', label: 'Google Ads IDs',    hint: 'Comma-separated Transparency Center advertiser IDs (AR-prefix).', type: 'textarea', placeholder: 'AR-BakerBrothers, AR-Berkeys, AR-MrRooter' },
      ],
    },
    {
      eyebrow: '02 · SEO',
      title: 'Keywords to rank-track',
      fields: [
        { name: 'keywords', label: 'Search keywords', hint: 'Comma-separated. Local-intent phrases work best.', type: 'textarea', placeholder: 'water well drilling fort worth, well pump repair saginaw tx, water filtration system dfw' },
      ],
    },
  ]
  return html`<div id="setup-modal" class="fc-article-modal" hidden>
    <div class="fc-article-backdrop" data-article-close></div>
    <div class="fc-article-card" role="dialog" aria-modal="true" aria-labelledby="setup-title">
      <button type="button" data-article-close class="fc-article-close" aria-label="Close">×</button>
      <div class="fc-article-scroll">
        <div class="px-6 sm:px-8 pt-7 pb-6">
          <div class="flex items-center gap-2 mb-1">
            <span style="color: var(--fc-blue-mid);">${icon('key')}</span>
            <p class="text-[11px] font-bold uppercase tracking-[0.18em]" style="color: var(--fc-blue-mid);">Setup</p>
          </div>
          <h2 id="setup-title" class="text-xl sm:text-2xl font-bold text-slate-900 leading-tight" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">Help us wire your sensor to live data.</h2>
          <p class="text-sm text-slate-500 mt-1">Tell us which competitors and keywords to track. Every field is optional — paste what you have and we'll handle the rest.</p>

          <form hx-post="/admin/setup" hx-swap="none"
                hx-on::after-request="if(event.detail.successful){window.fcToast('Sent to FlowCore team — we\\'ll wire it up.', 'success');document.querySelectorAll('[data-article-close]')[0]?.click();this.reset()}"
                class="mt-5 flex flex-col gap-5">
            ${groups.map((g) => html`<section class="flex flex-col gap-3">
              <div class="border-l-2 pl-3" style="border-color: var(--fc-blue-mid);">
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">${g.eyebrow}</p>
                <h3 class="text-base font-bold text-slate-900" style="font-family: 'Kumbh Sans', system-ui, sans-serif;">${g.title}</h3>
              </div>
              ${g.fields.map((f) => html`<div>
                <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  ${f.label}
                </label>
                ${f.type === 'textarea'
                  ? html`<textarea name="${f.name}" rows="3" maxlength="4000"
                            placeholder="${f.placeholder ?? ''}"
                            class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 font-mono leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"></textarea>`
                  : html`<input type="${f.type ?? 'text'}" name="${f.name}" maxlength="500"
                            placeholder="${f.placeholder ?? ''}"
                            autocomplete="off"
                            class="w-full text-sm border border-slate-200 hover:border-slate-300 rounded-md px-3 py-2 ${f.type === 'password' ? 'font-mono' : ''} focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors" />`}
                <p class="text-[11px] text-slate-500 mt-1 leading-snug">${f.hint}</p>
              </div>`)}
            </section>`)}

            <div class="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 mt-1">
              <p class="text-[10px] text-slate-400">Stored locally; team retrieves on demand. Use Reset on the next deploy to wipe.</p>
              <div class="flex items-center gap-2">
                <button type="button" data-article-close class="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2">Cancel</button>
                <button type="submit" class="fc-btn-primary text-sm font-semibold px-4 py-2 rounded-md">Send </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>`
}

export function layout(opts: { title: string; body: Raw; activeNav?: 'board' | 'useful' | 'signals' | 'keywords' }): Raw {
  const { title, body, activeNav = 'board' } = opts

  const navItem = (href: string, label: string, key: string, iconName: string) => {
    const active = key === activeNav
    const cls = active
      ? 'fc-tab fc-tab-active'
      : 'fc-tab fc-tab-inactive'
    return html`<a href="${href}" class="${cls}">${icon(iconName)}<span>${label}</span></a>`
  }

  return html`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title} · FlowCore Marketing Sensor</title>
    <link rel="icon" type="image/png" href="https://framerusercontent.com/images/zVeTtxOG2G9yQewZgbbVgHf7Ock.png" />
    <link rel="apple-touch-icon" href="https://framerusercontent.com/images/mjFrX2Aq1bpZ5aVsjYL7OHtMXoY.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Kumbh+Sans:wght@600;700;800&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.8/dist/umd/popper.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.min.js"></script>
    <style>
      :root {
        color-scheme: light;
        /* ── FlowCore brand palette (official, from project-doc/colors) ── */
        --fc-navy:        #17242f;  /* primary dark — headings, brand */
        --fc-blue-mid:    #2f5c85;  /* secondary — section dividers, sub-actions */
        --fc-blue:        #1174d1;  /* bright blue — links, primary CTAs */
        --fc-blue-hover:  #0d5fa8;
        --fc-orange:      #ffa260;  /* accent — softer, friendly "act now" */
        --fc-orange-hover:#f08c40;
        --fc-bg:          #f1f2fa;  /* page background — cool off-white */
        --fc-text:        #17242f;  /* heading text */
        --fc-text-body:   #4b5554;  /* body copy */
        --fc-text-muted:  #767676;  /* meta / labels */
      }
      body {
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        color: var(--fc-text);
      }
      h1, h2, h3, .fc-display {
        font-family: "Kumbh Sans", "Inter", system-ui, sans-serif;
        letter-spacing: -0.01em;
      }

      [hidden] { display: none !important; }
      .htmx-indicator { display: none; }
      .htmx-request .htmx-indicator { display: inline-flex; }
      .htmx-request.htmx-request-target { opacity: 0.6; }

      /* ── FlowCore branded body background ── */
      body {
        background-color: var(--fc-bg);
        background-image:
          radial-gradient(at 0% 0%, rgba(20, 47, 69, 0.05) 0px, transparent 55%),
          radial-gradient(at 100% 0%, rgba(23, 102, 217, 0.04) 0px, transparent 55%);
        background-attachment: fixed;
      }

      /* ── Map generic Tailwind blue to FlowCore brand blue (light retint) ── */
      .fc-brand-link  { color: var(--fc-blue); }
      .fc-brand-link:hover { color: var(--fc-blue-hover); }

      /* ── Drawer slide-in ── */
      @keyframes slideInRight {
        from { transform: translateX(100%); }
        to   { transform: translateX(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to   { opacity: 1; }
      }
      [data-drawer-panel] {
        animation: slideInRight 220ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      [data-drawer-backdrop] {
        animation: fadeIn 220ms ease-out;
      }

      /* ── Activity card fade-in on initial render ── */
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .activity-card {
        transition: transform 150ms ease-out, box-shadow 150ms ease-out, border-color 150ms ease-out;
      }
      /* cardIn animation only on initial page load, not htmx partial swaps */
      body.fc-initial-load #feed-rows > .activity-card {
        animation: cardIn 280ms ease-out backwards;
      }
      .activity-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px -8px rgb(15 23 42 / 0.12), 0 4px 8px -4px rgb(15 23 42 / 0.06);
      }
      /* Stagger first 12 cards on initial load only */
      body.fc-initial-load #feed-rows > .activity-card:nth-child(1)  { animation-delay: 0ms;   }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(2)  { animation-delay: 30ms;  }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(3)  { animation-delay: 60ms;  }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(4)  { animation-delay: 90ms;  }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(5)  { animation-delay: 120ms; }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(6)  { animation-delay: 150ms; }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(7)  { animation-delay: 180ms; }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(8)  { animation-delay: 210ms; }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(9)  { animation-delay: 240ms; }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(10) { animation-delay: 270ms; }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(11) { animation-delay: 300ms; }
      body.fc-initial-load #feed-rows > .activity-card:nth-child(12) { animation-delay: 330ms; }

      .htmx-swapping { }

      /* Load-more button — dim while htmx is in flight */
      .load-more-btn.htmx-request {
        opacity: 0.5;
        cursor: wait;
        pointer-events: none;
      }
      .load-more-btn.htmx-request::after {
        content: '…';
        margin-left: 0.5rem;
      }

      /* ── Hero signal: subtle shimmer on hover ── */
      @keyframes heroShimmer {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      /* ── AI Summarize button: loading state ──
         The button has two inner spans — default shows the label + sparkle,
         loading shows a spinner + "Asking AI…". htmx adds .htmx-request to
         the button for the duration of the POST, swapping which span is
         visible. The disabled attribute (hx-disabled-elt="this") also
         prevents repeat clicks while the request is in flight. */
      .ai-summarize-btn .ai-summarize-loading { display: none; }
      .ai-summarize-btn.htmx-request .ai-summarize-default { display: none; }
      .ai-summarize-btn.htmx-request .ai-summarize-loading { display: inline-flex; }
      .ai-spinner {
        width: 0.875rem;
        height: 0.875rem;
        border: 2px solid rgba(59, 130, 246, 0.3);
        border-top-color: rgb(59, 130, 246);
        border-radius: 9999px;
        animation: aiSpin 0.7s linear infinite;
      }
      @keyframes aiSpin {
        to { transform: rotate(360deg); }
      }

      /* ── AI Summary popup ── */
      .fc-summary-popup {
        position: fixed;
        inset: 0;
        z-index: 80;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .fc-summary-popup-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(2px);
        animation: fadeIn 180ms ease-out;
      }
      .fc-summary-popup-card {
        position: relative;
        max-width: 480px;
        width: 100%;
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
        padding: 1.25rem 1.5rem;
        animation: articleIn 220ms cubic-bezier(0.32, 0.72, 0, 1);
      }

      /* ── Google ad iframe preview slide ──
         Same grid-template-rows trick as the AI summary slide. Default
         collapsed; data-ad-preview-open expands. The iframe is only created
         on first open (lazy-loaded by the click handler). */
      [data-ad-preview] .ad-preview-slide {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 280ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      [data-ad-preview][data-ad-preview-open] .ad-preview-slide {
        grid-template-rows: 1fr;
      }
      [data-ad-preview]:not([data-ad-preview-open]) [data-ad-preview-chevron] {
        transform: rotate(-90deg);
      }

      /* ── Article reader modal ──
         Stored blog content opens in an overlay. Backdrop fades in, card
         slides up. Pointer-events: auto only when the modal is visible
         (the [hidden] attribute fully removes it from layout). */
      .fc-article-modal {
        position: fixed;
        inset: 0;
        z-index: 80;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .fc-article-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(15, 23, 42, 0.55);
        backdrop-filter: blur(2px);
        animation: fadeIn 180ms ease-out;
      }
      .fc-article-card {
        position: relative;
        width: 100%;
        max-width: 760px;
        max-height: calc(100vh - 2rem);
        background: #fff;
        border-radius: 14px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
        overflow: hidden;
        animation: articleIn 220ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      /* Summary modals — narrower than article reader since copy is short. */
      .fc-summary-card { max-width: 520px; }

      /* Bulk-tag modal needs the search-results dropdown to extend BELOW the
         dialog. Override the card's overflow:hidden + the scroll container's
         clipping so absolute children render outside the modal. The modal
         content is short enough to fit on screen so we don't need scroll. */
      #bulk-tag-modal .fc-article-card { overflow: visible; }
      #bulk-tag-modal .fc-article-scroll { overflow: visible; max-height: none; }

      /* Selected-signal pills inside the bulk-tag form — same FlowCore brand
         mid-blue as the active dashboard filter pills. */
      .fc-bulk-pill {
        background: var(--fc-blue-mid);
        border: 1px solid var(--fc-blue-mid);
      }
      .fc-bulk-pill:hover { background: #25496a; border-color: #25496a; }
      @keyframes articleIn {
        from { opacity: 0; transform: translateY(12px) scale(0.98); }
        to   { opacity: 1; transform: translateY(0)    scale(1);    }
      }
      .fc-article-scroll {
        max-height: calc(100vh - 2rem);
        overflow-y: auto;
      }
      .fc-article-close {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        width: 2rem;
        height: 2rem;
        line-height: 1.6rem;
        font-size: 1.5rem;
        font-weight: 600;
        color: #475569;
        background: rgba(241, 245, 249, 0.9);
        border: 1px solid #e2e8f0;
        border-radius: 9999px;
        z-index: 1;
        transition: background-color 140ms ease-out, color 140ms ease-out;
      }
      .fc-article-close:hover {
        background: #1f2937;
        color: #fff;
      }
      body.fc-article-locked { overflow: hidden; }

      /* Hide native disclosure triangle on the +-menu summary */
      .fc-add-menu > summary::-webkit-details-marker { display: none; }
      .fc-add-menu > summary { list-style: none; }

      /* ── Triage button success flash ── */
      @keyframes successFlash {
        0%   { background-color: white; }
        50%  { background-color: rgb(187 247 208); }
        100% { background-color: white; }
      }

      /* ── Row highlight after add (afterbegin swap) ── */
      @keyframes rowAddedGlow {
        0%   { background-color: rgb(187 247 208); }
        100% { background-color: transparent; }
      }
      .row-just-added { animation: rowAddedGlow 1500ms ease-out; }

      /* ── Toast slide-in ── */
      @keyframes toastIn {
        from { transform: translateY(20px); opacity: 0; }
        to   { transform: translateY(0);    opacity: 1; }
      }
      @keyframes toastOut {
        from { transform: translateY(0);    opacity: 1; }
        to   { transform: translateY(20px); opacity: 0; }
      }
      #fc-toast-stack {
        position: fixed;
        bottom: 1.5rem;
        right: 1.5rem;
        z-index: 100;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        pointer-events: none;
      }
      .fc-toast {
        animation: toastIn 220ms ease-out;
        pointer-events: auto;
        max-width: 360px;
      }
      .fc-toast.leaving { animation: toastOut 220ms ease-in forwards; }

      .peer:focus-visible + span { outline: 2px solid #2563eb; outline-offset: 2px; }

      /* ── Mobile filter drawer ── */
      details > summary { list-style: none; cursor: pointer; }
      details > summary::-webkit-details-marker { display: none; }
      details[open] > summary [data-chevron] { transform: rotate(180deg); }
      [data-chevron] { transition: transform 200ms ease-out; }
      @media (min-width: 768px) {
        details[data-mobile-only] > summary { display: none; }
        details[data-mobile-only][open] > .filter-body,
        details[data-mobile-only] > .filter-body { display: block !important; }
      }

      /* ── FlowCore brand gradient strip ── */
      .brand-strip {
        background: linear-gradient(90deg, var(--fc-navy) 0%, var(--fc-blue) 60%, var(--fc-orange) 100%);
        height: 4px;
      }
      .fc-brand-title { color: var(--fc-navy); }

      /* ── Global input / textarea / select focus styling ──
         Override the default blue-500 focus ring with FlowCore mid-blue
         (#2f5c85, --fc-blue-mid). Applies to every form control across the
         app, so search boxes, tag pickers, signal-add forms, etc. all share
         a single brand-tied focus accent. */
      input:focus,
      textarea:focus,
      select:focus,
      input:focus-visible,
      textarea:focus-visible,
      select:focus-visible {
        --tw-ring-color: var(--fc-blue-mid) !important;
        --tw-ring-shadow: 0 0 0 2px var(--fc-blue-mid) !important;
        border-color: var(--fc-blue-mid) !important;
        outline-color: var(--fc-blue-mid) !important;
      }

      /* ── FlowCore primary action button ──
         Solid mid-blue with hover/active states. Apply the fc-btn-primary
         class on any Add / Create / Apply CTA to inherit the brand look. */
      .fc-btn-primary {
        background-color: var(--fc-blue-mid);
        color: #fff;
        transition: background-color 140ms ease-out, transform 80ms ease-out, box-shadow 140ms ease-out;
        box-shadow: 0 1px 3px rgba(47, 92, 133, 0.25);
      }
      .fc-btn-primary:hover {
        background-color: #25496a; /* darker mid-blue */
        box-shadow: 0 2px 6px rgba(47, 92, 133, 0.35);
      }
      .fc-btn-primary:active { transform: scale(0.96); }

      /* ── FlowCore filter pills — radio (date / status) ──
         Active background is brand mid-blue (#2f5c85, --fc-blue-mid). Used
         on the segmented date / status toggles in the filter bar. */
      .fc-pill-radio {
        display: inline-block;
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--fc-text-body);
        border-radius: 9999px;
        transition: background-color 160ms ease-out, color 160ms ease-out, box-shadow 160ms ease-out;
      }
      .fc-pill-radio:hover { color: var(--fc-blue-mid); }
      .peer:checked ~ .fc-pill-radio {
        background: var(--fc-blue-mid);
        color: #fff;
        box-shadow: 0 1px 3px rgba(47, 92, 133, 0.25);
      }
      .peer:checked ~ .fc-pill-radio:hover { color: #fff; }

      /* ── Type-checkbox pills (Types row) ──
         Same brand-blue active state. Hover lifts the pill. */
      .fc-pill-checkbox {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.625rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--fc-text-body);
        background: #fff;
        border: 1px solid #e2e8f0;
        border-radius: 9999px;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        transition: background-color 140ms ease-out, color 140ms ease-out, border-color 140ms ease-out;
      }
      .fc-pill-checkbox .fc-type-icon { color: #94a3b8; }
      .fc-pill-checkbox:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }
      .peer:checked ~ .fc-pill-checkbox {
        background: var(--fc-blue-mid);
        color: #fff;
        border-color: var(--fc-blue-mid);
      }
      .peer:checked ~ .fc-pill-checkbox .fc-type-icon { color: #fff; }

      /* ── "All" types button — active when no individual type is checked ──
         Uses :has() to detect whether any sibling type checkbox in the row
         is checked. No JS needed; updates in real time. */
      .fc-types-all {
        display: inline-flex;
        align-items: center;
        padding: 0.25rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 9999px;
        transition: background-color 140ms ease-out, color 140ms ease-out, border-color 140ms ease-out;
        /* Default = active (no individual types checked → All is "on") */
        background: var(--fc-blue-mid);
        color: #fff;
        border: 1px solid var(--fc-blue-mid);
        box-shadow: 0 1px 3px rgba(47, 92, 133, 0.25);
      }
      .fc-types-row:has(input[name="type"]:checked) .fc-types-all {
        /* Inactive when at least one specific type is checked */
        background: #fff;
        color: var(--fc-text-body);
        border-color: #e2e8f0;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      .fc-types-row:has(input[name="type"]:checked) .fc-types-all:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }

      /* ── FlowCore tabset (Board / Signals nav) ──
         Uses #2f5c85 (--fc-blue-mid, the actual nav color from
         flowcorewater.com) for the active state. Container is bare —
         tabs sit directly under the wordmark with a thin bottom rule. */
      .fc-tabset {
        display: inline-flex;
        gap: 4px;
      }
      .fc-tab {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        font-size: 0.8125rem;
        font-weight: 600;
        border-radius: 8px;
        transition: background-color 160ms ease-out, color 160ms ease-out;
        white-space: nowrap;
      }
      .fc-tab-active {
        background: var(--fc-blue-mid);
        color: #fff;
      }
      .fc-tab-active:hover { color: #fff; }
      .fc-tab-inactive {
        color: var(--fc-text-body);
      }
      .fc-tab-inactive:hover {
        background: rgba(47, 92, 133, 0.08);
        color: var(--fc-blue-mid);
      }

      /* ── Bootstrap dropdown bare CSS ── */
      .dropdown-menu { display: none; }
      .dropdown-menu.show { display: flex; }

      /* ── Skeleton loader for htmx-targeted areas ── */
      @keyframes skeletonShimmer {
        0%   { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .skeleton {
        background: linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%);
        background-size: 200% 100%;
        animation: skeletonShimmer 1.4s ease-in-out infinite;
      }

      /* Custom scrollbar (subtle) */
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgb(203 213 225); border-radius: 6px; }
      ::-webkit-scrollbar-thumb:hover { background: rgb(148 163 184); }

      /* ── Guided in-app tour ─────────────────────────────────────────────
         A spotlight + tooltip overlay that highlights real elements on the
         page. The "hole" is a fixed-position div sized to the target's
         bounding rect with a giant inset box-shadow, which darkens
         everything around it without touching the target's own styles. */
      #fc-tour-root { position: fixed; inset: 0; z-index: 200; pointer-events: none; }
      #fc-tour-root.is-visible { pointer-events: auto; }
      .fc-tour-hole {
        position: fixed; pointer-events: none;
        border-radius: 12px;
        box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.6),
                    0 0 0 4px rgba(47, 92, 133, 0.5),
                    0 8px 30px rgba(0, 0, 0, 0.25);
        transition: top 320ms cubic-bezier(0.32, 0.72, 0, 1),
                    left 320ms cubic-bezier(0.32, 0.72, 0, 1),
                    width 320ms cubic-bezier(0.32, 0.72, 0, 1),
                    height 320ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      .fc-tour-hole.is-center {
        box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.6);
        border-radius: 0;
      }
      .fc-tour-tip {
        position: fixed;
        background: #fff; border-radius: 14px;
        box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.45);
        padding: 1.1rem 1.25rem;
        max-width: 360px; min-width: 280px;
        pointer-events: auto;
        animation: fcTipIn 320ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      @keyframes fcTipIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .fc-tour-tip-eyebrow {
        font-size: 10px; font-weight: 800; text-transform: uppercase;
        letter-spacing: 0.14em;
        background: linear-gradient(120deg, var(--fc-blue-mid) 0%, var(--fc-blue) 55%, #ff9050 100%);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        margin: 0 0 0.4rem;
      }
      .fc-tour-tip-title {
        font-family: "Kumbh Sans", system-ui, sans-serif;
        font-size: 16px; font-weight: 700; color: var(--fc-navy);
        margin: 0 0 0.4rem;
      }
      .fc-tour-tip-body {
        font-size: 13px; color: #475569; line-height: 1.5; margin: 0 0 0.875rem;
      }
      .fc-tour-tip-foot {
        display: flex; align-items: center; justify-content: space-between; gap: 0.625rem;
      }
      .fc-tour-tip-progress { font-size: 10px; font-weight: 600; color: #94a3b8; font-family: ui-monospace, monospace; }
      .fc-tour-tip-actions { display: flex; gap: 0.4rem; }
      .fc-tour-btn {
        font-size: 12px; font-weight: 600; padding: 0.45rem 0.875rem;
        border-radius: 8px; border: 1px solid; cursor: pointer;
        transition: background-color 140ms, color 140ms, border-color 140ms;
      }
      .fc-tour-btn-skip { background: #fff; border-color: #e2e8f0; color: #64748b; }
      .fc-tour-btn-skip:hover { background: #f8fafc; color: #334155; }
      .fc-tour-btn-prev { background: #fff; border-color: #e2e8f0; color: #475569; }
      .fc-tour-btn-prev:hover { background: #f8fafc; }
      .fc-tour-btn-prev:disabled { opacity: 0.4; cursor: not-allowed; }
      .fc-tour-btn-next {
        background: var(--fc-blue-mid); border-color: var(--fc-blue-mid); color: #fff;
        box-shadow: 0 1px 3px rgba(47, 92, 133, 0.25);
      }
      .fc-tour-btn-next:hover { background: #25496a; border-color: #25496a; }

      /* Wrapper that anchors the post-tour Setup hint callout */
      .fc-setup-wrap { position: relative; display: inline-flex; }

      /* Header "Take a tour" trigger */
      .fc-tour-trigger {
        display: inline-flex; align-items: center; gap: 0.4rem;
        font-size: 12px; font-weight: 600; color: #64748b;
        padding: 0.4rem 0.625rem; border-radius: 6px;
        background: none; border: none; cursor: pointer;
        transition: background-color 140ms, color 140ms;
        position: relative;  /* so the post-tour callout can anchor to it */
      }
      .fc-tour-trigger:hover { background: rgba(47, 92, 133, 0.08); color: var(--fc-blue-mid); }

      /* Post-tour Setup hint callout — shown after the in-app tour ends so
         the user knows where to drop their competitor list. Dismisses on
         Setup click or via the close button. State lives in localStorage. */
      .fc-setup-hint {
        position: absolute; top: calc(100% + 10px); right: 0;
        background: linear-gradient(120deg, var(--fc-blue-mid) 0%, var(--fc-blue) 55%, #ff9050 100%);
        color: #fff;
        padding: 0.55rem 0.875rem 0.55rem 0.75rem; border-radius: 10px;
        font-size: 12.5px; font-weight: 600;
        white-space: nowrap;
        box-shadow: 0 8px 22px -4px rgba(47, 92, 133, 0.45), 0 4px 12px -2px rgba(255, 144, 80, 0.25);
        z-index: 35;
        display: inline-flex; align-items: center; gap: 0.5rem;
        animation: fcHintIn 320ms cubic-bezier(0.32, 0.72, 0, 1);
      }
      .fc-setup-hint::before {
        content: '';
        position: absolute; top: -5px; right: 18px;
        width: 10px; height: 10px;
        background: var(--fc-blue-mid);
        transform: rotate(45deg);
      }
      .fc-setup-hint-emoji { font-size: 13px; line-height: 1; }
      .fc-setup-hint-text  { letter-spacing: 0.01em; }
      .fc-setup-hint-close {
        background: rgba(255, 255, 255, 0.18);
        border: none; color: #fff; cursor: pointer;
        width: 18px; height: 18px; border-radius: 9999px;
        display: inline-flex; align-items: center; justify-content: center;
        font-size: 13px; font-weight: 700; line-height: 1;
        transition: background-color 140ms;
        margin-left: 0.25rem;
      }
      .fc-setup-hint-close:hover { background: rgba(255, 255, 255, 0.32); }
      @keyframes fcHintIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

      /* Setup button blink while the hint is active — a real gradient
         halo around the button (blue → orange) using a pseudo-element
         with blur, so the glow itself fades through both brand colours.
         The button content stays on top via z-index. */
      /* Setup button while the hint is active — steady brand gradient
         (blue → orange) with white text. No pulse, no blink. */
      [data-hint-active] {
        background: linear-gradient(120deg, var(--fc-blue-mid) 0%, var(--fc-blue) 55%, #ff9050 100%) !important;
        color: #fff !important;
        font-weight: 700 !important;
        border-radius: 8px;
        box-shadow: 0 4px 12px -2px rgba(47, 92, 133, 0.35);
      }
      [data-hint-active] svg { color: #fff; }
    </style>
  </head>
  <body class="text-slate-900 min-h-screen antialiased fc-initial-load">
    <div class="brand-strip"></div>
    <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        <div class="flex items-center justify-between mb-3 gap-2">
          <a href="/" class="flex items-center gap-3 group">
            <img src="https://framerusercontent.com/images/uQINMOmoogUSpSBaaZQG2jOWg8.png"
                 srcset="https://framerusercontent.com/images/uQINMOmoogUSpSBaaZQG2jOWg8.png?scale-down-to=512&width=550&height=166 512w, https://framerusercontent.com/images/uQINMOmoogUSpSBaaZQG2jOWg8.png?width=550&height=166 550w"
                 sizes="(max-width: 640px) 130px, 170px"
                 alt="FlowCore Water"
                 class="h-8 sm:h-9 w-auto" />
            <span class="hidden sm:inline-flex items-center gap-2 pl-3 ml-1 border-l border-slate-200">
              <span class="text-sm font-bold fc-brand-title leading-tight">Marketing Sensor</span>
              <span class="text-[10px] uppercase tracking-wider font-semibold text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">Beta</span>
            </span>
          </a>
          <div class="flex items-center gap-1">
          <div class="fc-setup-wrap">
            <button type="button" data-modal-open="setup-modal" class="fc-tour-trigger" id="fc-setup-trigger" title="Send your competitor list to the FlowCore team">
              ${icon('key')}
              <span class="hidden sm:inline">Setup</span>
            </button>
            <span id="fc-setup-hint" class="fc-setup-hint" hidden>
              <span class="fc-setup-hint-emoji">✨</span>
              <span class="fc-setup-hint-text">Last step — drop your competitor list here</span>
              <button type="button" id="fc-setup-hint-close" class="fc-setup-hint-close" aria-label="Dismiss" title="Dismiss">×</button>
            </span>
          </div>
          <button type="button" data-tour-trigger class="fc-tour-trigger" title="Re-launch the guided tour">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            <span class="hidden sm:inline">Tour</span>
          </button>
          <a href="/logout"
             class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 px-2.5 py-1.5 rounded-md transition-colors"
             title="Sign out">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span class="hidden sm:inline">Logout</span>
          </a>
          </div>
        </div>
        <nav class="overflow-x-auto -mx-1 px-1 pb-3" data-tour="nav">
          <div class="fc-tabset">
            ${navItem('/', 'Board', 'board', 'dashboard')}
            ${navItem('/useful', 'Useful', 'useful', 'bookmark')}
            ${navItem('/keywords', 'Keywords', 'keywords', 'seo')}
            ${navItem('/signals', 'Signals', 'signals', 'broadcast')}
          </div>
        </nav>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-4 sm:px-6 pb-4 sm:pb-6">
      ${body}
    </main>
    <div id="fc-toast-stack" aria-live="polite" aria-atomic="true"></div>
    <div id="fc-tour-root" aria-hidden="true"></div>
    ${setupModal()}
    <script>
      // Bootstrap handles dropdown open/close/positioning via data-bs-toggle.
      // We re-init the competitor dropdown with Popper strategy: 'fixed' so the
      // menu uses position:fixed and escapes clipping parents (sticky sidebar etc.).
      document.addEventListener('DOMContentLoaded', function() {
        const trig = document.getElementById('competitor-trigger')
        if (trig && window.bootstrap && window.bootstrap.Dropdown) {
          // Dispose Bootstrap's auto-initialized instance and create one with strategy:fixed
          const existing = window.bootstrap.Dropdown.getInstance(trig)
          if (existing) existing.dispose()
          new window.bootstrap.Dropdown(trig, {
            popperConfig: function(defaultBsPopperConfig) {
              return Object.assign({}, defaultBsPopperConfig, { strategy: 'fixed' })
            },
          })
        }
      })

      // ── Tag dropdown: search + trigger label sync ──

      document.addEventListener('input', function(e) {
        if (e.target.matches?.('[data-tag-search]')) {
          const q = e.target.value.trim().toLowerCase()
          const scope = e.target.closest('[data-dropdown-menu]')
          if (!scope) return
          scope.querySelectorAll('label[data-tn]').forEach(function(l) {
            l.hidden = q.length > 0 && !l.dataset.tn.includes(q)
          })
        }
      })

      function updateTagTrigger(form) {
        if (!form) return
        const checked = Array.from(form.querySelectorAll('input[name="tag"]:checked'))
        const trigger = form.querySelector('button[data-bs-toggle="dropdown"]')
        if (!trigger) return
        const labelSpan = trigger.querySelector('[data-tag-trigger-label]')
        if (!labelSpan) return
        let badge = trigger.querySelector('span.bg-blue-600')
        if (checked.length === 0) {
          labelSpan.textContent = 'All tags'
          if (badge) badge.remove()
        } else if (checked.length === 1) {
          labelSpan.textContent = checked[0].value
          if (badge) badge.remove()
        } else {
          labelSpan.textContent = checked.length + ' tags'
          if (!badge) {
            badge = document.createElement('span')
            badge.className = 'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-full'
            labelSpan.parentElement.insertBefore(badge, labelSpan)
          }
          badge.textContent = String(checked.length)
        }
      }

      document.addEventListener('change', function(e) {
        if (e.target && e.target.name === 'tag' && e.target.type === 'checkbox') {
          updateTagTrigger(e.target.closest('form'))
        }
      })

      // ── Bulk-tag picker (search → pills → apply) ──

      function bulkTagPillsContainer() {
        return document.querySelector('[data-selected-pills]')
      }

      function updatePillCount() {
        const c = bulkTagPillsContainer()
        if (!c) return
        const n = c.querySelectorAll('[data-pill]').length
        const counter = document.querySelector('[data-pill-count]')
        if (counter) {
          counter.textContent = n === 0
            ? '— search and select signals, then apply a tag'
            : n + ' signal' + (n === 1 ? '' : 's') + ' selected'
        }
      }

      function addPill(id, displayText) {
        const c = bulkTagPillsContainer()
        if (!c) return
        // Skip duplicates
        if (c.querySelector('[data-pill][data-signal-id="' + id + '"]')) return
        const pill = document.createElement('span')
        pill.setAttribute('data-pill', '')
        pill.setAttribute('data-signal-id', id)
        pill.className = 'fc-bulk-pill inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full text-white shadow-sm'
        pill.innerHTML = '<span></span>' +
          '<input type="hidden" name="signal_id" value="' + id + '">' +
          '<button type="button" data-pill-remove class="text-white/80 hover:text-white leading-none font-bold">×</button>'
        pill.querySelector('span').textContent = displayText
        c.appendChild(pill)
        updatePillCount()
      }

      // ── Google ad iframe preview toggle ──
      // Click button to expand/collapse; the iframe is created lazily on
      // first open so off-screen cards don't all hammer the network.
      document.addEventListener('click', function(e) {
        const btn = e.target.closest && e.target.closest('[data-ad-preview-btn]')
        if (!btn) return
        e.preventDefault()
        e.stopPropagation()
        const wrap = btn.closest('[data-ad-preview]')
        if (!wrap) return
        const isOpen = wrap.hasAttribute('data-ad-preview-open')
        if (isOpen) {
          wrap.removeAttribute('data-ad-preview-open')
          return
        }
        wrap.setAttribute('data-ad-preview-open', '')
        // Lazy-create the iframe on first open
        const frameWrap = wrap.querySelector('.ad-preview-frame')
        if (frameWrap && !frameWrap.querySelector('iframe')) {
          const url = wrap.getAttribute('data-preview-url') || ''
          if (!url) return
          const iframe = document.createElement('iframe')
          iframe.src = url
          iframe.setAttribute('loading', 'lazy')
          iframe.setAttribute('referrerpolicy', 'no-referrer')
          iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-forms')
          iframe.className = 'absolute inset-0 w-full h-full'
          frameWrap.appendChild(iframe)
        }
      })

      // ── Generic modal opener: any [data-modal-open="<element-id>"] click
      //    reveals the matching hidden element (.fc-article-modal-styled).
      //    Used by AI Summary popup and any future popups.
      function fcOpenModal(modal) {
        if (!modal) return
        // Close any currently-open modal first.
        document.querySelectorAll('.fc-article-modal').forEach(function(m) {
          if (m !== modal && !m.hasAttribute('hidden')) m.setAttribute('hidden', '')
        })
        // Close any open dropdown menus (capture-phase stopPropagation in the
        // click handler means the trigger button's own hx-on:click never
        // fires, so we close menus here instead).
        document.querySelectorAll('details.fc-add-menu[open]').forEach(function(d) {
          d.open = false
        })
        if (modal.parentElement !== document.body) {
          document.body.appendChild(modal)
        }
        modal.removeAttribute('hidden')
        document.body.classList.add('fc-article-locked')
        const scroll = modal.querySelector('.fc-article-scroll')
        if (scroll) scroll.scrollTop = 0
      }
      document.addEventListener('click', function(e) {
        const opener = e.target.closest && e.target.closest('[data-modal-open]')
        if (!opener) return
        e.preventDefault()
        e.stopPropagation()
        const id = opener.getAttribute('data-modal-open')
        fcOpenModal(document.getElementById(id))
      }, true)

      // After htmx swaps in a [data-modal-auto-open] element (e.g. the
      // freshly-generated AI Summary), pop the modal open immediately so the
      // user doesn't have to click again.
      document.addEventListener('htmx:afterSwap', function(e) {
        const root = e.target
        if (!root) return
        const auto = root.matches?.('[data-modal-auto-open]')
          ? root
          : root.querySelector?.('[data-modal-auto-open]')
        if (auto) {
          const id = auto.getAttribute('data-modal-auto-open')
          fcOpenModal(document.getElementById(id))
        }
      })

      // ── Add-menu (the +-icon dropdown on /signals): click outside closes it.
      //    The menu itself is a native <details>; we just listen for clicks
      //    that fall outside any open .fc-add-menu and toggle them shut.
      document.addEventListener('click', function(e) {
        document.querySelectorAll('details.fc-add-menu[open]').forEach(function(d) {
          if (!d.contains(e.target)) d.open = false
        })
      })

      // ── Article reader modal: open / close + Escape key ──
      // Each website card with stored full_text renders a hidden modal as a
      // sibling. Buttons with [data-article-open=ID] reveal the matching
      // modal; clicks on the backdrop or close button hide it.
      //
      // Listener runs in CAPTURE phase so it fires before any inline
      // hx-on:click="event.stopPropagation()" on the trigger button (those
      // run in bubble phase and would otherwise eat the event before it
      // reaches the document).
      function fcCloseArticleModals() {
        document.querySelectorAll('.fc-article-modal').forEach(function(m) {
          if (!m.hasAttribute('hidden')) m.setAttribute('hidden', '')
        })
        document.body.classList.remove('fc-article-locked')
      }
      document.addEventListener('click', function(e) {
        const opener = e.target.closest && e.target.closest('[data-article-open]')
        if (opener) {
          e.preventDefault()
          e.stopPropagation()
          const id = opener.getAttribute('data-article-open')
          const modal = document.getElementById('article-modal-' + id)
          if (modal) {
            fcCloseArticleModals()
            // Move the modal to document.body so it escapes any ancestor with
            // a CSS transform (the activity card uses transform on :hover,
            // which creates a containing block and traps position:fixed).
            if (modal.parentElement !== document.body) {
              document.body.appendChild(modal)
            }
            modal.removeAttribute('hidden')
            document.body.classList.add('fc-article-locked')
            const scroll = modal.querySelector('.fc-article-scroll')
            if (scroll) scroll.scrollTop = 0
          }
          return
        }
        const closer = e.target.closest && e.target.closest('[data-article-close]')
        if (closer) {
          e.preventDefault()
          e.stopPropagation()
          fcCloseArticleModals()
        }
      }, true)
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') fcCloseArticleModals()
      })

      // ── AI Summary popup ──
      function fcCloseSummaryPopups() {
        document.querySelectorAll('.fc-summary-popup').forEach(function(p) { p.remove() })
      }
      document.addEventListener('click', function(e) {
        var btn = e.target.closest && e.target.closest('[data-summary-toggle-btn]')
        if (btn) {
          e.preventDefault()
          e.stopPropagation()
          fcCloseSummaryPopups()
          var text = btn.getAttribute('data-summary-text') || ''
          var popup = document.createElement('div')
          popup.className = 'fc-summary-popup'
          popup.innerHTML = '<div class="fc-summary-popup-backdrop"></div>'
            + '<div class="fc-summary-popup-card">'
            + '<div class="flex items-center gap-2 text-[11px] text-blue-600 font-bold uppercase tracking-[0.18em] mb-3">'
            + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>'
            + '<span>AI Summary</span>'
            + '</div>'
            + '<p class="text-[15px] text-slate-800 leading-7">' + text + '</p>'
            + '</div>'
          document.body.appendChild(popup)
          return
        }
        // Click backdrop → close
        var backdrop = e.target.closest && e.target.closest('.fc-summary-popup-backdrop')
        if (backdrop) {
          fcCloseSummaryPopups()
        }
      })
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') fcCloseSummaryPopups()
      })

      // ── Inline video / post playback: click [data-play-video] inside a
      // thumbnail wrapped in [data-video-thumb] → swap the thumb with either
      // a native <video> element (when data-video-src is set — Instagram/TikTok
      // direct media URLs) or an autoplaying iframe (YouTube embeds).
      // stopPropagation so the activity card's outer click (which opens the
      // detail drawer) doesn't fire.
      document.addEventListener('click', function(e) {
        const btn = e.target.closest && e.target.closest('[data-play-video]')
        if (!btn) return
        e.preventDefault()
        e.stopPropagation()
        const wrap = btn.closest('[data-video-thumb]')
        if (!wrap) return

        // Direct video URL → native <video> element (no social chrome)
        const videoSrc = wrap.getAttribute('data-video-src')
        if (videoSrc) {
          const video = document.createElement('video')
          video.src = videoSrc
          video.autoplay = true
          video.controls = true
          video.playsInline = true
          video.muted = false
          video.className = 'absolute inset-0 w-full h-full object-contain bg-black'
          wrap.replaceChildren(video)
          return
        }

        // Fallback: iframe embed (YouTube etc.)
        const url = wrap.getAttribute('data-embed-url')
        if (!url) return
        const iframe = document.createElement('iframe')
        iframe.src = url
        iframe.setAttribute('frameborder', '0')
        iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen')
        iframe.setAttribute('allowfullscreen', '')
        iframe.className = 'absolute inset-0 w-full h-full bg-black'
        wrap.replaceChildren(iframe)
      })

      // Click on a search result → add as pill, clear search input + results
      document.addEventListener('click', function(e) {
        const result = e.target.closest('[data-search-result]')
        if (result) {
          e.preventDefault()
          addPill(result.dataset.signalId, result.dataset.signalDisplay)
          const searchInput = document.querySelector('[data-signal-search]')
          if (searchInput) searchInput.value = ''
          const results = document.querySelector('[data-signal-results]')
          if (results) {
            results.innerHTML = ''
            results.classList.add('hidden')
          }
          return
        }
        // Click × on a pill → remove
        const x = e.target.closest('[data-pill-remove]')
        if (x) {
          x.closest('[data-pill]').remove()
          updatePillCount()
          return
        }
        // Click outside the search widget → close results
        if (!e.target.closest('[data-signal-search], [data-signal-results]')) {
          const results = document.querySelector('[data-signal-results]')
          if (results) results.classList.add('hidden')
        }
      })

      // After htmx loads search results, show the dropdown
      document.addEventListener('htmx:afterSwap', function(e) {
        if (e.target && e.target.matches?.('[data-signal-results]')) {
          if (e.target.children.length > 0 || e.target.textContent.trim().length > 0) {
            e.target.classList.remove('hidden')
          }
        }
      })

      // After the bulk-tag form successfully submits (NOT after the search
      // input's child htmx request), clear pills + search + results.
      document.addEventListener('htmx:afterRequest', function(e) {
        const t = e.detail && e.detail.elt
        if (t && t.id === 'bulk-tag-form' && e.detail.successful) {
          const pillCount = document.querySelectorAll('[data-pill]').length
          const tagInp = document.querySelector('#bulk-tag-form input[name="tag"]')
          const tagName = tagInp ? tagInp.value.trim() : ''
          const op = (e.detail.requestConfig && e.detail.requestConfig.parameters && e.detail.requestConfig.parameters.op) || 'add'
          const c = document.querySelector('[data-selected-pills]'); if (c) c.innerHTML = ''
          const s = document.querySelector('[data-signal-search]'); if (s) s.value = ''
          const r = document.querySelector('[data-signal-results]'); if (r) { r.innerHTML = ''; r.classList.add('hidden') }
          if (tagInp) tagInp.value = ''
          updatePillCount()
          fcToast(
            (op === 'remove' ? 'Removed tag ' : 'Tagged ') +
            (tagName ? '"' + tagName + '" ' : '') +
            (op === 'remove' ? 'from ' : 'on ') + pillCount + ' signal' + (pillCount === 1 ? '' : 's'),
            'success',
          )
        }
      })

      // ── Toast that survives a page reload ──
      // The /signals/competitor route sends HX-Refresh: true to reload the
      // page (so type counts update too). HX-Trigger fires fc:toast-after-
      // refresh BEFORE the reload — we stash the message in sessionStorage,
      // then the bottom of this script reads + flushes it on next load.
      document.body.addEventListener('fc:toast-after-refresh', function(e) {
        try {
          const detail = (e && e.detail) || {}
          sessionStorage.setItem('fcPendingToast', JSON.stringify(detail))
        } catch (_) { /* ignore quota errors */ }
      })
      function fcFlushPendingToast() {
        try {
          const raw = sessionStorage.getItem('fcPendingToast')
          if (!raw) return
          sessionStorage.removeItem('fcPendingToast')
          const t = JSON.parse(raw)
          if (t && t.msg) {
            // fcToast is defined below; defer until it's available.
            const tryShow = function() {
              if (typeof window.fcToast === 'function') {
                window.fcToast(t.msg, t.type || 'success')
              } else {
                setTimeout(tryShow, 30)
              }
            }
            tryShow()
          }
        } catch (_) { /* ignore parse errors */ }
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fcFlushPendingToast)
      } else {
        fcFlushPendingToast()
      }

      // ── Toast notifications ──
      window.fcToast = function(message, type) {
        const stack = document.getElementById('fc-toast-stack')
        if (!stack) return
        const tone = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-800'
        const t = document.createElement('div')
        t.className = 'fc-toast ' + tone + ' text-white text-sm font-medium px-4 py-3 rounded-lg shadow-2xl flex items-center gap-2'
        const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : '·'
        t.innerHTML = '<span class="font-bold">' + icon + '</span><span></span>'
        t.lastElementChild.textContent = message
        stack.appendChild(t)
        setTimeout(function() {
          t.classList.add('leaving')
          t.addEventListener('animationend', function() { t.remove() }, { once: true })
        }, 2600)
      }

      // Toast on common form submissions (single-add signal, single-add tag, delete)
      document.addEventListener('htmx:afterRequest', function(e) {
        const cfg = e.detail && e.detail.requestConfig
        if (!cfg || !e.detail.successful) return
        const path = cfg.path || ''
        const verb = cfg.verb || ''

        if (verb === 'post' && path === '/signals') fcToast('Signal added', 'success')
        else if (verb === 'post' && path === '/signals/batch') fcToast('Signals added', 'success')
        else if (verb === 'post' && new RegExp('^/signals/[0-9]+/tags$').test(path)) fcToast('Tag added', 'success')
        else if (verb === 'delete' && new RegExp('^/signals/[0-9]+/tags/').test(path)) fcToast('Tag removed', 'success')
        else if (verb === 'delete' && new RegExp('^/signals/[0-9]+$').test(path)) fcToast('Signal deleted', 'success')
      })

      // Remove initial-load animation class after first htmx swap.
      document.addEventListener('htmx:afterSwap', function() {
        document.body.classList.remove('fc-initial-load');
      }, { once: true });

      // Pause all playing videos and iframes before HTMX swaps anything
      // so audio doesn't leak from removed cards.
      document.addEventListener('htmx:beforeSwap', function() {
        document.querySelectorAll('video').forEach(function(v) {
          if (!v.paused) { v.pause(); v.removeAttribute('src'); v.load(); }
        });
        document.querySelectorAll('iframe').forEach(function(f) {
          if (f.src && (f.src.includes('youtube') || f.src.includes('tiktok'))) f.src = f.src;
        });
      });

      // ── Update status pill counts after triage without server round-trip ──
      // Count updates are handled server-side via htmx out-of-band swaps (hx-swap-oob).

      // ── Preserve input focus + cursor position across htmx swaps ──
      // When a swap replaces the DOM element a user is typing into, re-focus
      // the new input with the same name and restore the cursor position.
      // We also remember a unique data-attribute on the focused input
      // ([data-signal-search] for the bulk-tag search) so we don't pick the
      // wrong input when multiple inputs on the page share the same name.
      let _fcFocusName = null
      let _fcFocusUnique = null
      let _fcFocusSel = null
      const FC_FOCUS_DATA_KEYS = ['signalSearch', 'tagSearch']
      document.addEventListener('htmx:beforeSwap', function() {
        const a = document.activeElement
        if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && a.name) {
          _fcFocusName = a.name
          _fcFocusUnique = null
          for (const k of FC_FOCUS_DATA_KEYS) {
            if (a.dataset[k] !== undefined) { _fcFocusUnique = k; break }
          }
          if (typeof a.selectionStart === 'number') {
            _fcFocusSel = [a.selectionStart, a.selectionEnd]
          } else {
            _fcFocusSel = null
          }
        } else {
          _fcFocusName = null
          _fcFocusUnique = null
          _fcFocusSel = null
        }
      })
      document.addEventListener('htmx:afterSwap', function() {
        if (!_fcFocusName) return
        // Prefer the input that carries the same unique data-attribute we
        // recorded in beforeSwap. That avoids picking the page filter input
        // when the user was actually typing into the bulk-tag search.
        let next = null
        if (_fcFocusUnique) {
          const camelToKebab = function(s) { return s.replace(/[A-Z]/g, function(c) { return '-' + c.toLowerCase() }) }
          next = document.querySelector('input[data-' + camelToKebab(_fcFocusUnique) + ']')
        }
        if (!next) {
          next = document.querySelector('input[name="' + _fcFocusName + '"], textarea[name="' + _fcFocusName + '"]')
        }
        if (next) {
          next.focus()
          if (_fcFocusSel && typeof next.setSelectionRange === 'function') {
            try { next.setSelectionRange(_fcFocusSel[0], _fcFocusSel[1]) } catch (err) { /* ignore */ }
          }
        }
        _fcFocusName = null
        _fcFocusUnique = null
        _fcFocusSel = null
      })

      // ── Guided in-app tour ──────────────────────────────────────────
      // Multi-page tour state lives in localStorage so it survives navigation
      // between Board / Useful / Signals. Each step has a page (URL path)
      // and a selector (target element); when the selector resolves, the
      // tour positions a spotlight + tooltip on it. If a step page doesnt
      // match the current URL, we navigate there and the next page load
      // resumes the tour.
      ;(function() {
        const STEPS = [
          { page: '/', selector: null,
            eyebrow: 'FlowCore Marketing Sensor',
            title: 'Welcome to your Marketing Sensor.',
            body: 'A quick 60-second tour of the parts that matter. Skip anytime, re-launch from the Tour button in the header.' },
          { page: '/', selector: '#feed-rows .activity-card',
            eyebrow: 'Activity card',
            title: 'Real signals, not metadata.',
            body: 'Each card is a real change a competitor made. The color-coded badge tells you what happened — new blog post, ad launched, rank lost, viral TikTok. Scroll the feed to see every channel.' },
          { page: '/', selector: '#feed-rows .activity-card .ai-summarize-btn, #feed-rows .activity-card [data-modal-open^="summary-modal-"]',
            eyebrow: 'AI summary',
            title: 'One-click FlowCore briefing.',
            body: 'Claude Sonnet returns a 2-3 sentence "what this means for FlowCore" take. Skim 50 cards in under 5 minutes.' },
          { page: '/', selector: '#feed-rows .activity-card button[hx-vals*="useful"], #feed-rows .activity-card button[hx-vals*="unsave"]',
            eyebrow: 'Triage',
            title: 'Useful or Skip.',
            body: 'Mark Useful to save it, Skip to drop it. Trains your shortlist as you scroll.' },
          { page: '/useful', selector: 'main',
            eyebrow: 'Useful tab',
            title: 'Your weekly action queue.',
            body: 'Everything you marked Useful piles up here — your "respond to this" list, ready for the content agent. No spreadsheets.' },
          { page: '/signals', selector: '.fc-add-menu',
            eyebrow: 'Signals · Add',
            title: 'One form, every channel.',
            body: 'Click + → Add competitor. Enter name + handles, the system creates 6+ signals tagged together. 30 seconds to onboard.' },
          { page: '/', selector: null,
            eyebrow: 'You are ready',
            title: 'Explore on your own.',
            body: 'Header has a Tour button if you want to re-run this. Now go peek at what your competitors did this week.' },
        ]
        const KEY_ACTIVE = 'fcTourActive'
        const KEY_STEP = 'fcTourStep'
        const KEY_DONE = 'fcTourDone'

        const root = document.getElementById('fc-tour-root')
        if (!root) return

        function urlMatches(stepPage) {
          // Compare pathname AND the type query param so steps that
          // pre-filter the feed only match when that filter is applied.
          const stepUrl = new URL(stepPage, window.location.origin)
          if (window.location.pathname !== stepUrl.pathname) return false
          const stepType = stepUrl.searchParams.get('type') || ''
          const curType = new URLSearchParams(window.location.search).get('type') || ''
          return stepType === curType
        }

        function clearOverlay() {
          root.innerHTML = ''
          root.classList.remove('is-visible')
          root.setAttribute('aria-hidden', 'true')
        }

        function endTour(markDone, cleanup) {
          if (markDone) {
            try { localStorage.setItem(KEY_DONE, '1') } catch (_) {}
          }
          try {
            localStorage.removeItem(KEY_ACTIVE)
            localStorage.removeItem(KEY_STEP)
          } catch (_) {}
          clearOverlay()
          // Tour navigates through ?type=... filters which persist via
          // LAST_FILTER_KEY on the server. Clean those up so the user lands
          // on a fresh Board.
          if (cleanup) {
            window.location.href = '/?reset=1'
          }
        }

        function getStep() {
          try {
            const n = parseInt(localStorage.getItem(KEY_STEP) || '0', 10)
            return Number.isFinite(n) ? n : 0
          } catch (_) { return 0 }
        }

        function setStep(n) {
          try { localStorage.setItem(KEY_STEP, String(n)) } catch (_) {}
        }

        function placeTip(tip, rect, placement) {
          const margin = 14
          const vw = window.innerWidth
          const vh = window.innerHeight
          tip.style.left = '0px'; tip.style.top = '0px'
          // Get tip size after rendering
          const tipRect = tip.getBoundingClientRect()
          let top, left, prefer = placement
          if (!rect) {
            // Center
            top = Math.max(margin, (vh - tipRect.height) / 2)
            left = Math.max(margin, (vw - tipRect.width) / 2)
          } else {
            // Auto: prefer below, else above, else right, else left
            const fitsBelow = rect.bottom + margin + tipRect.height <= vh
            const fitsAbove = rect.top - margin - tipRect.height >= 0
            const fitsRight = rect.right + margin + tipRect.width <= vw
            const fitsLeft  = rect.left - margin - tipRect.width >= 0
            if (fitsBelow) {
              top = rect.bottom + margin
              left = Math.min(Math.max(margin, rect.left), vw - tipRect.width - margin)
            } else if (fitsAbove) {
              top = rect.top - margin - tipRect.height
              left = Math.min(Math.max(margin, rect.left), vw - tipRect.width - margin)
            } else if (fitsRight) {
              left = rect.right + margin
              top = Math.min(Math.max(margin, rect.top), vh - tipRect.height - margin)
            } else if (fitsLeft) {
              left = rect.left - margin - tipRect.width
              top = Math.min(Math.max(margin, rect.top), vh - tipRect.height - margin)
            } else {
              top = Math.max(margin, (vh - tipRect.height) / 2)
              left = Math.max(margin, (vw - tipRect.width) / 2)
            }
          }
          tip.style.top = top + 'px'
          tip.style.left = left + 'px'
        }

        let _retries = 0
        function render(stepIndex) {
          const step = STEPS[stepIndex]
          if (!step) { endTour(true); return }
          if (!urlMatches(step.page)) {
            // Navigate to the right page; tour resumes on load
            setStep(stepIndex)
            try { localStorage.setItem(KEY_ACTIVE, '1') } catch (_) {}
            window.location.href = step.page
            return
          }
          // Find target
          let target = null
          if (step.selector) {
            try { target = document.querySelector(step.selector) } catch (_) {}
          }

          // If target was expected but not found, retry briefly (htmx swap
          // may not have settled). After 3 retries we skip the step — the
          // current filter probably hides any matching card.
          if (step.selector && !target) {
            if (_retries < 3) {
              _retries++
              setTimeout(function() { render(stepIndex) }, 250)
              return
            }
            _retries = 0
            setStep(stepIndex + 1)
            render(stepIndex + 1)
            return
          }
          _retries = 0

          clearOverlay()
          root.classList.add('is-visible')
          root.setAttribute('aria-hidden', 'false')

          // Spotlight hole
          const hole = document.createElement('div')
          hole.className = 'fc-tour-hole'
          if (target) {
            // Bring target into view BEFORE measuring — otherwise the rect is
            // for the off-screen position and the spotlight ends up
            // somewhere we can't see.
            const initRect = target.getBoundingClientRect()
            if (initRect.top < 60 || initRect.bottom > window.innerHeight - 60) {
              target.scrollIntoView({ behavior: 'instant', block: 'center' })
            }
            const r = target.getBoundingClientRect()
            const pad = 6
            hole.style.top    = Math.max(0, r.top - pad) + 'px'
            hole.style.left   = Math.max(0, r.left - pad) + 'px'
            hole.style.width  = (r.width + pad * 2) + 'px'
            hole.style.height = (r.height + pad * 2) + 'px'
          } else {
            hole.classList.add('is-center')
            hole.style.top = '50%'; hole.style.left = '50%'
            hole.style.width = '0px'; hole.style.height = '0px'
          }
          root.appendChild(hole)

          // Tooltip
          const tip = document.createElement('div')
          tip.className = 'fc-tour-tip'
          tip.innerHTML = ''
            + '<p class="fc-tour-tip-eyebrow"></p>'
            + '<h3 class="fc-tour-tip-title"></h3>'
            + '<p class="fc-tour-tip-body"></p>'
            + '<div class="fc-tour-tip-foot">'
            + '  <span class="fc-tour-tip-progress"></span>'
            + '  <div class="fc-tour-tip-actions">'
            + '    <button type="button" class="fc-tour-btn fc-tour-btn-skip" data-tour-skip>Skip tour</button>'
            + '    <button type="button" class="fc-tour-btn fc-tour-btn-prev" data-tour-prev>Back</button>'
            + '    <button type="button" class="fc-tour-btn fc-tour-btn-next" data-tour-next></button>'
            + '  </div>'
            + '</div>'
          tip.querySelector('.fc-tour-tip-eyebrow').textContent = step.eyebrow || ''
          tip.querySelector('.fc-tour-tip-title').textContent = step.title
          tip.querySelector('.fc-tour-tip-body').textContent = step.body
          tip.querySelector('.fc-tour-tip-progress').textContent = (stepIndex + 1) + ' / ' + STEPS.length
          const prev = tip.querySelector('[data-tour-prev]')
          const next = tip.querySelector('[data-tour-next]')
          prev.disabled = stepIndex === 0
          next.textContent = stepIndex === STEPS.length - 1 ? 'Done' : 'Next →'
          root.appendChild(tip)

          // Position tip after layout
          requestAnimationFrame(function() {
            const r = target ? target.getBoundingClientRect() : null
            placeTip(tip, r, 'auto')
          })

          // Action handlers
          tip.querySelector('[data-tour-skip]').addEventListener('click', function() { endTour(true, true) })
          prev.addEventListener('click', function() {
            if (stepIndex === 0) return
            setStep(stepIndex - 1)
            render(stepIndex - 1)
          })
          next.addEventListener('click', function() {
            const nextIndex = stepIndex + 1
            if (nextIndex >= STEPS.length) { endTour(true, true); return }
            setStep(nextIndex)
            render(nextIndex)
          })
        }

        function startTour(force) {
          try {
            localStorage.setItem(KEY_ACTIVE, '1')
            if (force) {
              localStorage.setItem(KEY_STEP, '0')
              localStorage.removeItem(KEY_DONE)
            }
          } catch (_) {}
          render(getStep())
        }

        // Header trigger button — always re-launches from step 0.
        document.querySelectorAll('[data-tour-trigger]').forEach(function(btn) {
          btn.addEventListener('click', function(e) {
            e.preventDefault()
            startTour(true)
          })
        })

        // Auto-start logic on each page load:
        //  - ?tour=1 in URL → force start (after login redirect)
        //  - localStorage active flag → resume mid-tour after navigation
        const urlParams = new URLSearchParams(window.location.search)
        const forceStart = urlParams.get('tour') === '1'
        let active = false
        try { active = localStorage.getItem(KEY_ACTIVE) === '1' } catch (_) {}

        if (forceStart) {
          // Strip ?tour=1 from URL so reloads don't re-trigger
          urlParams.delete('tour')
          const qs = urlParams.toString()
          window.history.replaceState({}, '', window.location.pathname + (qs ? '?' + qs : ''))
          startTour(true)
        } else if (active) {
          render(getStep())
        }

        // ── Post-tour Setup hint ─────────────────────────────────────────
        // Once the in-app tour is marked done, surface a small callout next
        // to the header's Setup button so the user knows where to send API
        // keys. Dismissed when they click Setup or close the callout. State
        // tracked in localStorage so it doesn't reappear after dismissal.
        const KEY_SETUP_ENGAGED = 'fcSetupEngaged'
        const setupHint = document.getElementById('fc-setup-hint')
        const setupHintClose = document.getElementById('fc-setup-hint-close')
        const setupBtn = document.getElementById('fc-setup-trigger')
        // ENGAGED is the only persisted flag. Once the user actually clicks
        // the Setup button, the gradient + tooltip never come back. The ×
        // close on the tooltip only dismisses it for the current page view —
        // reload brings the tooltip back as a gentle re-prompt.
        function syncSetupAffordances() {
          if (!setupBtn) return
          let done = false, engaged = true
          try {
            done = localStorage.getItem(KEY_DONE) === '1'
            engaged = localStorage.getItem(KEY_SETUP_ENGAGED) === '1'
          } catch (_) {}
          if (done && !engaged) {
            setupBtn.setAttribute('data-hint-active', '')
            if (setupHint) setupHint.removeAttribute('hidden')
          } else {
            setupBtn.removeAttribute('data-hint-active')
            if (setupHint) setupHint.setAttribute('hidden', '')
          }
        }
        syncSetupAffordances()
        // Click × on the tooltip → hide it for this view only. Gradient
        // stays on the Setup button. Next page load shows the tooltip again.
        if (setupHintClose) {
          setupHintClose.addEventListener('click', function(e) {
            e.preventDefault()
            e.stopPropagation()
            if (setupHint) setupHint.setAttribute('hidden', '')
          })
        }
        // Click Setup → engaged. Tooltip + gradient permanently cleared.
        if (setupBtn) {
          setupBtn.addEventListener('click', function() {
            try { localStorage.setItem(KEY_SETUP_ENGAGED, '1') } catch (_) {}
            if (setupHint) setupHint.setAttribute('hidden', '')
            setupBtn.removeAttribute('data-hint-active')
          })
        }

        // Reposition spotlight + tooltip when the user scrolls (since the
        // overlay uses fixed positioning). Cheap update — only mutates the
        // existing hole/tip element styles, no full re-render.
        function repositionSpotlight() {
          if (!root.classList.contains('is-visible')) return
          const stepIndex = getStep()
          const step = STEPS[stepIndex]
          if (!step || !step.selector) return
          let target = null
          try { target = document.querySelector(step.selector) } catch (_) {}
          if (!target) return
          const hole = root.querySelector('.fc-tour-hole')
          const tip = root.querySelector('.fc-tour-tip')
          if (!hole || hole.classList.contains('is-center')) return
          const r = target.getBoundingClientRect()
          const pad = 6
          hole.style.top    = Math.max(0, r.top - pad) + 'px'
          hole.style.left   = Math.max(0, r.left - pad) + 'px'
          hole.style.width  = (r.width + pad * 2) + 'px'
          hole.style.height = (r.height + pad * 2) + 'px'
          if (tip) placeTip(tip, r, 'auto')
        }
        let scrollT
        window.addEventListener('scroll', function() {
          if (!root.classList.contains('is-visible')) return
          // Throttle to next frame for smoothness
          if (scrollT) return
          scrollT = requestAnimationFrame(function() {
            scrollT = null
            repositionSpotlight()
          })
        }, { passive: true })

        let resizeT
        window.addEventListener('resize', function() {
          clearTimeout(resizeT)
          resizeT = setTimeout(function() {
            if (!root.classList.contains('is-visible')) return
            render(getStep())
          }, 150)
        })
      })()

      // Highlight newly-added rows briefly
      document.addEventListener('htmx:afterSwap', function(e) {
        const cfg = e.detail && e.detail.requestConfig
        if (!cfg) return
        const verb = cfg.verb || ''
        if (verb !== 'post') return
        // Only when swap is afterbegin (i.e., adding to top)
        if (cfg.swapInfo && cfg.swapInfo.swapStyle !== 'afterbegin') return
        const target = e.target
        if (!target) return
        const first = target.firstElementChild
        if (first && first.tagName === 'TR') {
          first.classList.add('row-just-added')
          setTimeout(function() { first.classList.remove('row-just-added') }, 1700)
        }
      })

      // Block submit when no pills selected
      document.addEventListener('submit', function(e) {
        if (e.target.matches?.('#bulk-tag-form')) {
          const pills = document.querySelectorAll('[data-pill]')
          if (pills.length === 0) {
            e.preventDefault()
            alert('Search and select at least one signal first.')
          }
        }
      })

      function syncAll() {
        document.querySelectorAll('form').forEach(function(f) {
          if (f.querySelector('input[name="tag"]')) updateTagTrigger(f)
        })
        updatePillCount()
      }

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncAll)
      } else {
        syncAll()
      }
    </script>
  </body>
</html>`
}
