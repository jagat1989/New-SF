import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPPLIER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const existing = await db.fixedDeparture.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role === 'SUPPLIER' && existing.supplierId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const departure = await db.fixedDeparture.update({
      where: { id },
      data: {
        departureDate: body.departureDate ? new Date(body.departureDate) : undefined,
        availableSeats: body.availableSeats !== undefined ? Number(body.availableSeats) : undefined,
        costPrice: body.costPrice !== undefined ? Number(body.costPrice) : undefined,
        sellingPrice: body.sellingPrice !== undefined ? Number(body.sellingPrice) : undefined,
        markup: body.sellingPrice && body.costPrice ? Number(body.sellingPrice) - Number(body.costPrice) : undefined,
        status: body.status,
      },
    })
    return NextResponse.json({ departure })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update departure' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPPLIER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const existing = await db.fixedDeparture.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role === 'SUPPLIER' && existing.supplierId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await db.fixedDeparture.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
