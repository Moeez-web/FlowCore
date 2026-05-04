import type { MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'
import { config } from '../config.ts'

// Public paths skip auth entirely. Everything else requires a valid JWT
// cookie; otherwise we redirect (or return HX-Redirect for htmx requests).
const PUBLIC_PATHS = new Set(['/login', '/logout', '/healthz'])

function isPublic(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true
  // Allow common static asset prefixes if any are added later.
  if (path.startsWith('/static/') || path.startsWith('/assets/')) return true
  return false
}

export const authMiddleware: MiddlewareHandler = async (c, next) => {
  if (isPublic(c.req.path)) return next()

  const token = getCookie(c, 'fc_token')
  const sendUnauthenticated = () => {
    if (c.req.header('HX-Request') === 'true') {
      // htmx clients honor HX-Redirect → full-page redirect.
      c.header('HX-Redirect', '/login')
      return c.body('', 401)
    }
    return c.redirect('/login', 302)
  }

  if (!token) return sendUnauthenticated()

  try {
    await verify(token, config.auth.jwtSecret, 'HS256')
    return next()
  } catch {
    return sendUnauthenticated()
  }
}
