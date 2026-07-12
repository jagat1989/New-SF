import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET flights - pre-purchase inventory
// - ADMIN: all flights
// - SUPPLIER: own flights
// - AGENT/CUSTOMER: active flights (for browsing inventory)
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const origin = searchParams.get('origin')
  const destination = searchParams.get('destination')

  let where: any = {}
  if (user.role === 'SUPPLIER') {
    where.supplierId = user.id
  } else if (user.role === 'ADMIN') {
    // all
  } else {
    where.status = 'ACTIVE'
  }
  if (origin) where.origin = origin
  if (destination) where.destination = destination

  const flights = await db.flight.findMany({
    where,
    include: { supplier: { select: { id: true, name: true, company: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ flights })
}

// POST - create flight (SUPPLIER, ADMIN)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'SUPPLIER' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const supplierId = user.role === 'ADMIN' && body.supplierId ? body.supplierId : user.id
    const flight = await db.flight.create({
      data: {
        flightNumber: body.flightNumber,
        airline: body.airline || user.company || user.name,
        airlineCode: body.airlineCode || 'XX',
        origin: body.origin?.toUpperCase(),
        originCity: body.originCity,
        destination: body.destination?.toUpperCase(),
        destinationCity: body.destinationCity,
        departureTime: body.departureTime,
        arrivalTime: body.arrivalTime,
        durationMins: Number(body.durationMins) || 60,
        aircraft: body.aircraft || 'A320',
        totalSeats: Number(body.totalSeats) || 150,
        basePrice: Number(body.basePrice),
        cabinClass: body.cabinClass || 'ECONOMY',
        baggage: body.baggage || '20kg checked + 7kg cabin',
        supplierId,
        status: 'ACTIVE',
      },
    })
    return NextResponse.json({ flight })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to create flight' }, { status: 500 })
  }
}
