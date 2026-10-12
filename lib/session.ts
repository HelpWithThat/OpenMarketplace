import type { SessionOptions } from 'iron-session'

const FALLBACK_SECRET = 'complex_password_at_least_32_characters_long_for_security'

function useSecureCookies(): boolean {
  if (process.env.NODE_ENV === 'production') return true
  const publicUrl =
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    ''
  return publicUrl.startsWith('https')
}

export function getSessionOptions(): SessionOptions {
  return {
    password: process.env.SESSION_SECRET || FALLBACK_SECRET,
    cookieName: 'marketplace_session',
    cookieOptions: {
      secure: useSecureCookies(),
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    },
  }
}
