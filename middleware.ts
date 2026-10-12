import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import type { SessionData } from './lib/auth'
import { getSessionOptions } from './lib/session'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const session = await getIronSession<SessionData>(request, response, getSessionOptions())

  const { pathname } = request.nextUrl

  // Public routes
  if (
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/uploads') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static')
  ) {
    return response
  }

  // Protected routes - redirect to login if not authenticated
  if (!session.isLoggedIn) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
