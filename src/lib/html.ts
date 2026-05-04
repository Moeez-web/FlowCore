// Tiny tagged-template helper with auto-escape.
// Interpolated values are HTML-escaped unless wrapped in Raw or already an html`` result.
// Arrays are flattened — each item is escaped or rendered as Raw.

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escape(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ESCAPE[ch] ?? ch)
}

export class Raw {
  constructor(public readonly value: string) {}
  toString(): string {
    return this.value
  }
}

export function raw(s: string): Raw {
  return new Raw(s)
}

function render(v: unknown): string {
  if (v == null || v === false) return ''
  if (v instanceof Raw) return v.value
  if (Array.isArray(v)) return v.map(render).join('')
  return escape(String(v))
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): Raw {
  let out = strings[0] ?? ''
  for (let i = 0; i < values.length; i++) {
    out += render(values[i])
    out += strings[i + 1] ?? ''
  }
  return new Raw(out)
}
