import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser, hashPassword, toSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET all users (ADMIN only)
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await db.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, phone: true, company: true,
      balance: true, commissionRate: true, active: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ users })
}

// POST - create user (ADMIN only)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const body = await req.json()
    const existing = await db.user.findUnique({ where: { email: body.email.toLowerCase().trim() } })
    if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 })

    const newUser = await db.user.create({
      data: {
        name: body.name,
        email: body.email.toLowerCase().trim(),
        passwordHash: await hashPassword(body.password || 'password123'),
        role: body.role || 'CUSTOMER',
        phone: body.phone || null,
        company: body.company || null,
        commissionRate: Number(body.commissionRate) || 0,
        balance: Number(body.balance) || 0,
        active: body.active !== false,
      },
    })
    return NextResponse.json({ user: toSessionUser(newUser) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create user' }, { status: 500 })
  }
}
