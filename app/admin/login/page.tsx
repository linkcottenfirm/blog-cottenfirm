'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/admin'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null)
  const [lockedUntilSeconds, setLockedUntilSeconds] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        router.push(next)
        router.refresh()
        return
      }
      const body = (await res.json().catch(() => ({}))) as {
        error?: string
        attemptsRemaining?: number
        lockedUntilSeconds?: number
      }
      setError(body.error || 'Login failed')
      setAttemptsRemaining(typeof body.attemptsRemaining === 'number' ? body.attemptsRemaining : null)
      setLockedUntilSeconds(typeof body.lockedUntilSeconds === 'number' ? body.lockedUntilSeconds : null)
    } catch {
      setError('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const isLockedOut = lockedUntilSeconds !== null && lockedUntilSeconds > 0

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white rounded-lg shadow p-8 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cotten Firm Blog Admin</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage blog content.</p>
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="username email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            autoFocus
            disabled={isLockedOut}
          />
        </div>
        <div>
          <label htmlFor="pw" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            id="pw"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
            disabled={isLockedOut}
          />
        </div>
        {error && (
          <div className="text-sm text-red-600">
            <p>{error}</p>
            {attemptsRemaining !== null && attemptsRemaining > 0 && (
              <p className="mt-1 text-xs text-red-500">
                {attemptsRemaining} attempt{attemptsRemaining === 1 ? '' : 's'} remaining before a 15-minute lockout.
              </p>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={submitting || isLockedOut}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded px-4 py-2 text-sm"
        >
          {isLockedOut ? 'Locked out' : submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  )
}
