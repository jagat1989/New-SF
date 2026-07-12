import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// POST /api/payments/verify
// body: { paymentId }
// Simulates the user scanning the QR and confirming payment.
// Marks payment PAID, booking PAID, increments supplier balance by cost, agent commission.
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { paymentId } = await req.json()
    if (!paymentId) return NextResponse.json({ error: 'paymentId required' }, { status: 400 })

    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: { booking: { include: { flight: true, fixedDeparture: true } } },
    })
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    if (payment.status === 'PAID') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

    // permission
    if (user.role !== 'ADMIN') {
      if (payment.userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const booking = payment.booking
    const txnId = 'TXN' + Date.now() + Math.floor(Math.random() * 1000)

    await db.$transaction([
      db.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', transactionId: txnId, updatedAt: new Date() },
      }),
      db.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
      }),
      // credit supplier balance with cost price
      db.user.update({
        where: { id: booking.flight.supplierId },
        data: { balance: { increment: booking.fixedDeparture?.costPrice ?? booking.totalAmount * 0.85 } },
      }),
      // credit agent commission
      ...(booking.commission > 0 && booking.bookedByRole === 'AGENT'
        ? [db.user.update({ where: { id: booking.userId }, data: { balance: { increment: booking.commission } } })]
        : []),
    ])

    const updated = await db.payment.findUnique({ where: { id: payment.id } })
    return NextResponse.json({ payment: updated, transactionId: txnId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Verification failed' }, { status: 500 })
  }
}
