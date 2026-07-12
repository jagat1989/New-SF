import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  try {
    const body = await req.json()
    const updated = await db.user.update({
      where: { id },
      data: {
        name: body.name,
        role: body.role,
        phone: body.phone,
        company: body.company,
        commissionRate: body.commissionRate !== undefined ? Number(body.commissionRate) : undefined,
        balance: body.balance !== undefined ? Number(body.balance) : undefined,
        active: body.active,
      },
      select: { id: true, email: true, name: true, role: true, phone: true, company: true, balance: true, commissionRate: true, active: true },
    })
    return NextResponse.json({ user: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  if (id === user.id) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
