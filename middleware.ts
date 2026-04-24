import { NextRequest, NextResponse } from 'next/server'
import { isAuthenticatedRequest } from '@/lib/admin-auth'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // /admin/login is public (no gate)
  if (pathname === '/admin/login' || pathname.startsWith('/api/admin/auth')) {
    return NextResponse.next()
  }

  // Gate all /admin/* and /api/admin/* routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    if (!isAuthenticatedRequest(req)) {
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
