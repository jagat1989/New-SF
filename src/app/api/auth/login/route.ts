import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionCookie, verifyPassword, toSessionUser, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    if (!user.active) return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const sessionUser = toSessionUser(user)
    const cookie = await createSessionCookie(sessionUser)
    const res = NextResponse.json({ user: sessionUser })
    res.headers.set('Set-Cookie', `${SESSION_COOKIE}=${cookie}; ${sessionCookieOptions()}`)
    return res
  } catch (e) {
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
