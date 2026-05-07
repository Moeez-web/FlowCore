import { html, raw, type Raw } from './html.ts'

// Inline SVG icons per channel — small, monochrome, sized via class.
// Using currentColor so we can re-tint via Tailwind text- classes.

const SVG_OPEN = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'

export const ICONS: Record<string, string> = {
  website: `${SVG_OPEN} class="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  meta_ads: `${SVG_OPEN} class="w-4 h-4"><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10c-1.94 0-3.75-.55-5.28-1.5L2 22l1.5-4.72A9.97 9.97 0 0 1 2 12z"/></svg>`,
  instagram: `${SVG_OPEN} class="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>`,
  google_ads: `${SVG_OPEN} class="w-4 h-4"><path d="M3 17l6-12 6 12"/><path d="M21 17l-6-12"/><circle cx="9" cy="17" r="3"/></svg>`,
  tiktok: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4"><path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743 2.896 2.896 0 0 1 2.305-4.638 2.91 2.91 0 0 1 .88.131V9.4a6.328 6.328 0 0 0-1-.05A6.329 6.329 0 0 0 5.8 20.092a6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.83 4.83 0 0 1-1.84-.104z"/></svg>`,
  youtube_shorts: `${SVG_OPEN} class="w-4 h-4"><rect x="3" y="6" width="14" height="12" rx="2"/><path d="m17 9 4-2v10l-4-2"/></svg>`,
  seo: `${SVG_OPEN} class="w-4 h-4"><circle cx="11" cy="11" r="7"/><path d="m21 21-5-5"/></svg>`,
}

export const NAV_ICONS: Record<string, string> = {
  dashboard: `${SVG_OPEN} class="w-4 h-4"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
  competitors: `${SVG_OPEN} class="w-4 h-4"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  keywords: `${SVG_OPEN} class="w-4 h-4"><path d="M20.59 13.41 13 21a2 2 0 0 1-2.83 0L3 13.83V3h10.83L20.59 9.76a2 2 0 0 1 0 2.83z"/><circle cx="7.5" cy="7.5" r="1"/></svg>`,
}

export const UI_ICONS: Record<string, string> = {
  filter: `${SVG_OPEN} class="w-4 h-4"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  close: `${SVG_OPEN} class="w-5 h-5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  external: `${SVG_OPEN} class="w-3.5 h-3.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  trending_up: `${SVG_OPEN} class="w-4 h-4"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  flame: `${SVG_OPEN} class="w-4 h-4"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
  sparkle: `${SVG_OPEN} class="w-3.5 h-3.5"><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></svg>`,
  eye: `${SVG_OPEN} class="w-3.5 h-3.5"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  bookmark: `${SVG_OPEN} class="w-4 h-4"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`,
  tag: `${SVG_OPEN} class="w-4 h-4"><path d="M20.59 13.41 13 21a2 2 0 0 1-2.83 0L3 13.83V3h10.83L20.59 9.76a2 2 0 0 1 0 2.83z"/><circle cx="7.5" cy="7.5" r="1"/></svg>`,
  key: `${SVG_OPEN} class="w-4 h-4"><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-2 2"/><path d="m18.5 4.5 2 2"/></svg>`,
  broadcast: `${SVG_OPEN} class="w-4 h-4"><path d="M5 12a7 7 0 0 1 14 0"/><path d="M2 12a10 10 0 0 1 20 0"/><circle cx="12" cy="12" r="2"/><path d="M12 14v8"/></svg>`,
  arrow_up: `${SVG_OPEN} class="w-3 h-3"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`,
  arrow_down: `${SVG_OPEN} class="w-3 h-3"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
  link: `${SVG_OPEN} class="w-3.5 h-3.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  pause: `${SVG_OPEN} class="w-3 h-3"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
  play: `${SVG_OPEN} class="w-3 h-3"><polygon points="6 4 20 12 6 20 6 4"/></svg>`,
  trash: `${SVG_OPEN} class="w-3 h-3"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
  info: `${SVG_OPEN} class="w-4 h-4"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
  refresh: `${SVG_OPEN} class="w-4 h-4"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>`,
  cog: `${SVG_OPEN} class="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
}

export function icon(name: string): Raw {
  const svg = ICONS[name] ?? UI_ICONS[name] ?? NAV_ICONS[name]
  if (!svg) return html``
  return raw(svg)
}
