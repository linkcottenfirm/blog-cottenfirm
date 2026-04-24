import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'cf_admin_session'

function isValidSessionToken(token: string | undefined): boolean {
  if (!token) return false
  try {
    // Simple check: token exists and was set recently
    // Full validation happens in Node.js routes via admin-auth.ts
    // Middleware just checks presence of a well-formed token
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const [version, expiresAtStr] = parts
    if (version !== 'v1') return false
    const expiresAt = parseInt(expiresAtStr, 10)
    if (!expiresAt || expiresAt < Date.now()) return false
    return true
  } catch {
    return false
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // /admin/login is public (no gate)
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin/auth')) {
    return NextResponse.next()
  }

  // Gate all /admin/* and /api/admin/* routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const token = req.cookies.get(COOKIE_NAME)?.value
    if (!isValidSessionToken(token)) {
      // For API routes, return 401 JSON
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // For pages, redirect to login (preserve return URL)
      const loginUrl = new URL('/admin/login', req.url)
      loginUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
