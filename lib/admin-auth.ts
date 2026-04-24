import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import crypto from 'crypto'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'cf_admin_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7 // 7 days

// ---- Rate limiting ----
// In-memory per-IP attempt tracker. Survives within a warm Lambda; resets on
// cold start. For a single-admin site this is reasonable; combined with a
// strong ADMIN_PASSWORD it's hard to brute-force.
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 1000 * 60 * 15 // 15 minutes

interface AttemptRecord { count: number; firstAttemptAt: number; lockedUntil?: number }
const attempts = new Map<string, AttemptRecord>()

export interface RateLimitResult {
  allowed: boolean
  attemptsRemaining: number
  lockedUntilSeconds?: number
}

export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const rec = attempts.get(key)
  if (!rec) return { allowed: true, attemptsRemaining: MAX_ATTEMPTS }
  // If locked, check if lockout has elapsed
  if (rec.lockedUntil && rec.lockedUntil > now) {
    return { allowed: false, attemptsRemaining: 0, lockedUntilSeconds: Math.ceil((rec.lockedUntil - now) / 1000) }
  }
  // Lockout elapsed — clear and allow
  if (rec.lockedUntil && rec.lockedUntil <= now) {
    attempts.delete(key)
    return { allowed: true, attemptsRemaining: MAX_ATTEMPTS }
  }
  return { allowed: true, attemptsRemaining: Math.max(0, MAX_ATTEMPTS - rec.count) }
}

export function recordFailedAttempt(key: string, now: number = Date.now()): RateLimitResult {
  const rec = attempts.get(key) || { count: 0, firstAttemptAt: now }
  rec.count += 1
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCKOUT_MS
  }
  attempts.set(key, rec)
  if (rec.lockedUntil) {
    return { allowed: false, attemptsRemaining: 0, lockedUntilSeconds: Math.ceil(LOCKOUT_MS / 1000) }
  }
  return { allowed: true, attemptsRemaining: MAX_ATTEMPTS - rec.count }
}

export function clearAttempts(key: string): void {
  attempts.delete(key)
}

// ---- Credential checking ----
function getSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'build-placeholder'
}

function getPassword(): string {
  const pw = process.env.ADMIN_PASSWORD
  
  return pw || 'build-placeholder'
}

function getEmail(): string {
  const email = process.env.ADMIN_EMAIL
  if (!email) throw new Error('ADMIN_EMAIL env var required')
  return email
}

function constantTimeStringEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export function checkCredentials(submittedEmail: string, submittedPassword: string): boolean {
  const expectedEmail = getEmail().trim().toLowerCase()
  const expectedPassword = getPassword()
  // Compare email case-insensitively; password is exact
  const emailOk = constantTimeStringEqual(submittedEmail.trim().toLowerCase(), expectedEmail)
  const passwordOk = constantTimeStringEqual(submittedPassword, expectedPassword)
  // Always check both to keep comparison time uniform
  return emailOk && passwordOk
}

// Legacy alias kept so any callers that imported `checkPassword` still work.
export function checkPassword(submitted: string): boolean {
  return constantTimeStringEqual(submitted, getPassword())
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
  if (sig.length !== expectedSig.length) return false
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
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

// Pull a usable rate-limit key from the request. Prefers the first IP in
// X-Forwarded-For (Vercel populates this), falls back to a literal "unknown".
export function rateLimitKeyForRequest(req: NextRequest, scope: string = 'login'): string {
  const xff = req.headers.get('x-forwarded-for') || ''
  const ip = xff.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  return `${scope}:${ip}`
}
