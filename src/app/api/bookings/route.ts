import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET bookings
// - CUSTOMER: own bookings
// - AGENT: bookings they created
// - SUPPLIER: bookings on their inventory
// - ADMIN: all bookings
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let where: any = {}
  if (user.role === 'CUSTOMER' || user.role === 'AGENT') {
    where.userId = user.id
  } else if (user.role === 'SUPPLIER') {
    where.flight = { supplierId: user.id }
  }
  // ADMIN: all

  const bookings = await db.booking.findMany({
    where,
    include: {
      flight: true,
      fixedDeparture: true,
      user: { select: { id: true, name: true, email: true, role: true } },
      payments: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ bookings })
}

// POST - create booking (CUSTOMER, AGENT, ADMIN)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'CUSTOMER' && user.role !== 'AGENT' && user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  try {
    const body = await req.json()
    const { fixedDepartureId, passengerName, passengerEmail, passengerPhone, passengerType, seats } = body
    if (!fixedDepartureId || !passengerName || !passengerEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const fd = await db.fixedDeparture.findUnique({
      where: { id: fixedDepartureId },
      include: { flight: true },
    })
    if (!fd) return NextResponse.json({ error: 'Departure not found' }, { status: 404 })
    if (fd.status !== 'OPEN') return NextResponse.json({ error: 'Departure not available' }, { status: 400 })
    const seatCount = Number(seats) || 1
    const remaining = fd.availableSeats - fd.bookedSeats
    if (seatCount > remaining) {
      return NextResponse.json({ error: `Only ${remaining} seats available` }, { status: 400 })
    }

    const total = fd.sellingPrice * seatCount
    const commission = user.role === 'AGENT' ? (total * user.commissionRate) / 100 : 0
    const reference = 'SF' + Math.floor(100000 + Math.random() * 900000)

    const [booking] = await db.$transaction([
      db.booking.create({
        data: {
          reference,
          flightId: fd.flightId,
          fixedDepartureId: fd.id,
          userId: user.id,
          bookedByRole: user.role,
          passengerName,
          passengerEmail,
          passengerPhone: passengerPhone || null,
          passengerType: passengerType || 'ADULT',
          seats: seatCount,
          unitPrice: fd.sellingPrice,
          totalAmount: total,
          commission,
          status: 'CONFIRMED',
          paymentStatus: 'PENDING',
        },
      }),
      db.fixedDeparture.update({
        where: { id: fd.id },
        data: {
          bookedSeats: { increment: seatCount },
          status: fd.bookedSeats + seatCount >= fd.availableSeats ? 'SOLD_OUT' : 'OPEN',
        },
      }),
    ])

    // create pending payment record
    const payment = await db.payment.create({
      data: {
        bookingId: booking.id,
        userId: user.id,
        amount: total,
        method: 'QR_SCAN',
        status: 'PENDING',
        qrPayload: `upi://pay?pa=specialfare@hdfcbank&pn=Special Fare&am=${total.toFixed(2)}&tn=${reference}&cu=INR`,
      },
    })

    const fullBooking = await db.booking.findUnique({
      where: { id: booking.id },
      include: { flight: true, fixedDeparture: true, payments: true },
    })
    return NextResponse.json({ booking: fullBooking, payment })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Booking failed' }, { status: 500 })
  }
}
