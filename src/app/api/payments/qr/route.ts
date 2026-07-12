import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

// POST /api/payments/qr
// body: { bookingId }
// Returns QR code data URL for the booking's pending payment
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { bookingId } = await req.json()
    if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { flight: true, fixedDeparture: true, payments: true },
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    // permission: owner, or supplier of flight, or admin
    if (user.role !== 'ADMIN') {
      if (booking.userId !== user.id) {
        if (user.role === 'SUPPLIER' && booking.flight.supplierId !== user.id) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        } else if (user.role !== 'SUPPLIER') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      }
    }

    let payment = booking.payments.find((p) => p.status === 'PENDING')
    if (!payment) {
      payment = await db.payment.create({
        data: {
          bookingId: booking.id,
          userId: booking.userId,
          amount: booking.totalAmount,
          method: 'QR_SCAN',
          status: 'PENDING',
          qrPayload: `upi://pay?pa=specialfare@hdfcbank&pn=Special Fare&am=${booking.totalAmount.toFixed(2)}&tn=${booking.reference}&cu=INR`,
        },
      })
    }

    const qrDataUrl = await QRCode.toDataURL(payment.qrPayload, {
      width: 320,
      margin: 2,
      color: { dark: '#0f172a', light: '#ffffff' },
    })

    return NextResponse.json({
      payment,
      qrDataUrl,
      booking: {
        reference: booking.reference,
        totalAmount: booking.totalAmount,
        passengerName: booking.passengerName,
        flight: booking.flight,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to generate QR' }, { status: 500 })
  }
}
