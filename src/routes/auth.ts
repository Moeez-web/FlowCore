import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import { setCookie, deleteCookie } from 'hono/cookie'
import { config } from '../config.ts'
import { walkthroughPage } from '../views/walkthrough.ts'

export const authRoutes = new Hono()

authRoutes.get('/login', (c) => {
  // Splash slideshow with login form on the last slide. ?skip=1 jumps
  // straight to the form for repeat visits.
  const skip = String(c.req.query('skip') ?? '') === '1'
  return c.html(walkthroughPage({ startStep: skip ? 5 : 1 }).value)
})

authRoutes.post('/login', async (c) => {
  const form = await c.req.parseBody()
  const email = String(form['email'] ?? '').trim().toLowerCase()
  const password = String(form['password'] ?? '')

  const expectedEmail = config.auth.demoEmail.trim().toLowerCase()
  const expectedPassword = config.auth.demoPassword

  if (email !== expectedEmail || password !== expectedPassword) {
    return c.html(walkthroughPage({ error: 'Invalid email or password.', startStep: 5 }).value, 401)
  }

  // 7-day token. Hono's sign expects exp as a Unix epoch in seconds.
  const expSeconds = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
  const token = await sign({ sub: email, exp: expSeconds }, config.auth.jwtSecret, 'HS256')

  setCookie(c, 'fc_token', token, {
    httpOnly: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
    secure: config.auth.cookieSecure,
  })

  // After login, land on the Board with the guided tour starting. The tour
  // script respects an "already-seen" flag in localStorage so repeat logins
  // skip past the tour silently. Manual re-launch lives in the header.
  return c.redirect('/?tour=1', 302)
})

authRoutes.post('/logout', (c) => {
  deleteCookie(c, 'fc_token', { path: '/' })
  return c.redirect('/login', 302)
})

// GET /logout for convenience (e.g., link clicks). Redirects to login after
// clearing the cookie.
authRoutes.get('/logout', (c) => {
  deleteCookie(c, 'fc_token', { path: '/' })
  return c.redirect('/login', 302)
})
