import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET fixed departures - pre-purchase inventory shown to customers/agents
// - ADMIN: all
// - SUPPLIER: own
// - AGENT/CUSTOMER: OPEN departures with available seats, optionally filtered
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')
  const date = searchParams.get('date')
  const flightId = searchParams.get('flightId')

  let where: any = {}
  if (user.role === 'SUPPLIER') {
    where.supplierId = user.id
  } else {
    // CUSTOMER/AGENT/ADMIN: only OPEN departures for browsing
    if (user.role !== 'ADMIN') {
      where.status = 'OPEN'
    }
  }
  if (flightId) where.flightId = flightId
  if (origin || destination) {
    where.flight = {}
    if (origin) where.flight.origin = origin.toUpperCase()
    if (destination) where.flight.destination = destination.toUpperCase()
  }
  if (date) {
    const d = new Date(date)
    const next = new Date(d)
    next.setDate(next.getDate() + 1)
    where.departureDate = { gte: d, lt: next }
  }

  const departures = await db.fixedDeparture.findMany({
    where,
    include: { flight: true, supplier: { select: { name: true, company: true } } },
    orderBy: { departureDate: 'asc' },
  })
  return NextResponse.json({ departures })
}

// POST - create fixed departure (SUPPLIER, ADMIN) — extranet
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPPLIER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const flight = await db.flight.findUnique({ where: { id: body.flightId } })
    if (!flight) return NextResponse.json({ error: 'Flight not found' }, { status: 404 })
    if (user.role === 'SUPPLIER' && flight.supplierId !== user.id) {
      return NextResponse.json({ error: 'You can only create departures for your own flights' }, { status: 403 })
    }
    const depDate = new Date(body.departureDate)
    const cost = Number(body.costPrice)
    const sell = Number(body.sellingPrice)
    const departure = await db.fixedDeparture.create({
      data: {
        flightId: flight.id,
        departureDate: depDate,
        availableSeats: Number(body.availableSeats),
        bookedSeats: 0,
        costPrice: cost,
        sellingPrice: sell,
        markup: sell - cost,
        status: 'OPEN',
        supplierId: flight.supplierId,
      },
    })
    return NextResponse.json({ departure })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create departure' }, { status: 500 })
  }
}
