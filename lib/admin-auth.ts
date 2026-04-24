import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'cf_admin_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('ADMIN_SESSION_SECRET or SUPABASE_SERVICE_ROLE_KEY required')
  return secret
}

function getPassword(): string {
  const pw = process.env.ADMIN_PASSWORD
  if (!pw) throw new Error('ADMIN_PASSWORD env var required')
  return pw
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function buildSessionToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const payload = `v1.${expiresAt}`
  const sig = sign(payload)
  return `${payload}.${sig}`
}

export function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [version, expiresAtStr, sig] = parts
  if (version !== 'v1') return false
  const expiresAt = parseInt(expiresAtStr, 10)
  if (!expiresAt || expiresAt < Date.now()) return false
  const payload = `${version}.${expiresAtStr}`
  const expectedSig = sign(payload)
  // constant-time compare
  if (sig.length !== expectedSig.length) return false
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
}

export function checkPassword(submitted: string): boolean {
  const expected = getPassword()
  if (submitted.length !== expected.length) return false
  return crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected))
}

export const SESSION_COOKIE_NAME = COOKIE_NAME
export const SESSION_TTL_SECONDS = SESSION_TTL_MS / 1000

export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  return isValidSessionToken(token)
}

export async function requireAuth(): Promise<void> {
  const ok = await isAuthenticated()
  if (!ok) redirect('/admin/login')
}

export function isAuthenticatedRequest(req: NextRequest): boolean {
  const token = req.cookies.get(COOKIE_NAME)?.value
  return isValidSessionToken(token)
}
