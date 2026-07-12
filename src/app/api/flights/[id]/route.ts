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
  const existing = await db.flight.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role === 'SUPPLIER' && existing.supplierId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const flight = await db.flight.update({
      where: { id },
      data: {
        flightNumber: body.flightNumber,
        airline: body.airline,
        airlineCode: body.airlineCode,
        origin: body.origin?.toUpperCase(),
        originCity: body.originCity,
        destination: body.destination?.toUpperCase(),
        destinationCity: body.destinationCity,
        departureTime: body.departureTime,
        arrivalTime: body.arrivalTime,
        durationMins: Number(body.durationMins),
        aircraft: body.aircraft,
        totalSeats: Number(body.totalSeats),
        basePrice: Number(body.basePrice),
        cabinClass: body.cabinClass,
        baggage: body.baggage,
        status: body.status,
      },
    })
    return NextResponse.json({ flight })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to update flight' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPPLIER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const { id } = await params
  const existing = await db.flight.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (user.role === 'SUPPLIER' && existing.supplierId !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  await db.flight.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
