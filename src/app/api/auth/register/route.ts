import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionCookie, hashPassword, toSessionUser, SESSION_COOKIE, sessionCookieOptions, type Role } from '@/lib/auth'

export const runtime = 'nodejs'

const ALLOWED_ROLES: Role[] = ['CUSTOMER', 'AGENT', 'SUPPLIER']

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role, phone, company } = await req.json()
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }
    const finalRole: Role = ALLOWED_ROLES.includes(role) ? (role as Role) : 'CUSTOMER'
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash: await hashPassword(password),
        role: finalRole,
        phone: phone || null,
        company: company || null,
        commissionRate: finalRole === 'AGENT' ? 5 : 0,
        balance: finalRole === 'AGENT' ? 5000 : 0,
      },
    })
    const sessionUser = toSessionUser(user)
    const cookie = await createSessionCookie(sessionUser)
    const res = NextResponse.json({ user: sessionUser })
    res.headers.set('Set-Cookie', `${SESSION_COOKIE}=${cookie}; ${sessionCookieOptions()}`)
    return res
  } catch (e) {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
