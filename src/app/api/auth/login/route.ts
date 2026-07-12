import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionCookie, verifyPassword, toSessionUser, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = (body.email || '').toLowerCase().trim()
    const password = body.password || ''

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Connect to DB and look up the user — surface connection errors clearly
    let user
    try {
      user = await db.user.findUnique({ where: { email } })
    } catch (dbErr: any) {
      console.error('[login] DB error:', dbErr?.message)
      return NextResponse.json(
        { error: `Database connection error: ${dbErr?.message || 'cannot reach database'}. Check DATABASE_URL in .env.` },
        { status: 500 },
      )
    }

    if (!user) {
      return NextResponse.json({ error: `No account found with email "${email}". Run create-admin.sql in Supabase SQL Editor.` }, { status: 401 })
    }
    if (!user.active) {
      return NextResponse.json({ error: 'Account suspended. Contact administrator.' }, { status: 403 })
    }

    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Wrong password. If you seeded via SQL, ensure the passwordHash is a real scrypt hash (not empty).' }, { status: 401 })
    }

    const sessionUser = toSessionUser(user)
    const cookie = await createSessionCookie(sessionUser)
    const res = NextResponse.json({ user: sessionUser })
    res.headers.set('Set-Cookie', `${SESSION_COOKIE}=${cookie}; ${sessionCookieOptions()}`)
    return res
  } catch (e: any) {
    console.error('[login] unexpected error:', e)
    return NextResponse.json({ error: `Login failed: ${e?.message || 'unknown error'}` }, { status: 500 })
  }
}
