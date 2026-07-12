import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSessionUser } from '@/lib/auth'

export const runtime = 'nodejs'

// GET platform stats - role-scoped
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role === 'ADMIN') {
    const [users, flights, departures, bookings, payments] = await Promise.all([
      db.user.count(),
      db.flight.count(),
      db.fixedDeparture.count(),
      db.booking.count(),
      db.payment.findMany({ where: { status: 'PAID' }, select: { amount: true, createdAt: true } }),
    ])
    const revenue = payments.reduce((s, p) => s + p.amount, 0)
    const byRole = await db.user.groupBy({ by: ['role'], _count: true })
    const recentBookings = await db.booking.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } },
    })

    // revenue last 7 days
    const days: { date: string; revenue: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const start = new Date(Date.now() - i * 86400000)
      start.setHours(0, 0, 0, 0)
      const end = new Date(start)
      end.setDate(end.getDate() + 1)
      const dayRev = payments
        .filter((p) => p.createdAt >= start && p.createdAt < end)
        .reduce((s, p) => s + p.amount, 0)
      days.push({ date: start.toISOString().slice(5, 10), revenue: dayRev })
    }

    return NextResponse.json({
      users, flights, departures, bookings, revenue, recentBookings,
      byRole: byRole.map((r) => ({ role: r.role, count: r._count })),
      revenueTrend: days,
    })
  }

  if (user.role === 'SUPPLIER') {
    const flights = await db.flight.count({ where: { supplierId: user.id } })
    const departures = await db.fixedDeparture.count({ where: { supplierId: user.id } })
    const supplierFlights = await db.flight.findMany({ where: { supplierId: user.id }, select: { id: true } })
    const flightIds = supplierFlights.map((f) => f.id)
    const bookings = await db.booking.count({ where: { flightId: { in: flightIds } } })
    const paidBookings = await db.booking.findMany({
      where: { flightId: { in: flightIds }, paymentStatus: 'PAID' },
      include: { fixedDeparture: true },
    })
    const grossRevenue = paidBookings.reduce((s, b) => s + b.totalAmount, 0)
    const netRevenue = paidBookings.reduce(
      (s, b) => s + (b.fixedDeparture?.costPrice ?? 0) * b.seats,
      0,
    )
    const openSeats = await db.fixedDeparture.aggregate({
      where: { supplierId: user.id, status: 'OPEN' },
      _sum: { availableSeats: true, bookedSeats: true },
    })
    return NextResponse.json({
      flights, departures, bookings, grossRevenue, netRevenue,
      balance: user.balance,
      openSeats: openSeats._sum.availableSeats ?? 0,
      bookedSeats: openSeats._sum.bookedSeats ?? 0,
    })
  }

  if (user.role === 'AGENT') {
    const bookings = await db.booking.count({ where: { userId: user.id } })
    const paidBookings = await db.booking.findMany({ where: { userId: user.id, paymentStatus: 'PAID' } })
    const totalSales = paidBookings.reduce((s, b) => s + b.totalAmount, 0)
    const totalCommission = paidBookings.reduce((s, b) => s + b.commission, 0)
    const pending = await db.booking.count({ where: { userId: user.id, paymentStatus: 'PENDING' } })
    return NextResponse.json({
      bookings, totalSales, totalCommission, pending,
      balance: user.balance, commissionRate: user.commissionRate,
    })
  }

  // CUSTOMER
  const bookings = await db.booking.count({ where: { userId: user.id } })
  const upcoming = await db.booking.count({
    where: {
      userId: user.id,
      paymentStatus: 'PAID',
      fixedDeparture: { departureDate: { gte: new Date() } },
    },
  })
  const spentResult = await db.payment.aggregate({
    where: { userId: user.id, status: 'PAID' },
    _sum: { amount: true },
  })
  return NextResponse.json({
    bookings, upcoming, totalSpent: spentResult._sum.amount ?? 0,
    balance: user.balance,
  })
}
