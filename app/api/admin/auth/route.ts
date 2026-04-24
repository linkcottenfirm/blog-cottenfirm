import { NextRequest, NextResponse } from 'next/server'
import {
  checkCredentials,
  buildSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  checkRateLimit,
  recordFailedAttempt,
  clearAttempts,
  rateLimitKeyForRequest,
} from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  const rateKey = rateLimitKeyForRequest(req, 'login')
  const limit = checkRateLimit(rateKey)
  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: `Too many failed attempts. Try again in ${Math.ceil((limit.lockedUntilSeconds || 0) / 60)} minutes.`,
        lockedUntilSeconds: limit.lockedUntilSeconds,
      },
      { status: 429 },
    )
  }

  let body: { email?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
  }

  if (!checkCredentials(email, password)) {
    const after = recordFailedAttempt(rateKey)
    if (!after.allowed) {
      return NextResponse.json(
        {
          error: `Too many failed attempts. Locked out for ${Math.ceil((after.lockedUntilSeconds || 0) / 60)} minutes.`,
          lockedUntilSeconds: after.lockedUntilSeconds,
        },
        { status: 429 },
      )
    }
    return NextResponse.json(
      {
        error: 'Invalid email or password',
        attemptsRemaining: after.attemptsRemaining,
      },
      { status: 401 },
    )
  }

  // Successful login — clear the rate-limit counter for this IP
  clearAttempts(rateKey)

  const token = buildSessionToken()
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
  return res
}

// Logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return res
}
