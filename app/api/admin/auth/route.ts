import { NextRequest, NextResponse } from 'next/server'
import { checkPassword, buildSessionToken, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '@/lib/admin-auth'

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json()
    if (typeof password !== 'string') {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }
    if (!checkPassword(password)) {
      // Generic message — don't leak whether the user exists / which env var is wrong
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }
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
  } catch (err) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

// Logout
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' })
  return res
}
