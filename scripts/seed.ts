import { db } from '../src/lib/db'
import { scryptSync, randomBytes } from 'crypto'

function hashPw(p: string) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(p, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  console.log('Seeding Special Fare...')

  await db.payment.deleteMany()
  await db.booking.deleteMany()
  await db.fixedDeparture.deleteMany()
  await db.flight.deleteMany()
  await db.user.deleteMany()

  // Admin credentials come from env vars (set in .env on the server) so the
  // real password is never committed to git. Falls back to demo values.
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@specialfare.com'
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123'
  const ADMIN_NAME = process.env.ADMIN_NAME || 'System Admin'

  // Demo accounts (supplier/agent/customer) share a known demo password.
  const DEMO_PW = hashPw('password123')

  const admin = await db.user.create({
    data: { email: ADMIN_EMAIL, passwordHash: hashPw(ADMIN_PASSWORD), name: ADMIN_NAME, role: 'ADMIN', phone: '+919900000001' },
  })
  const supplier1 = await db.user.create({
    data: { email: 'supplier@skywings.com', passwordHash: DEMO_PW, name: 'SkyWings Airlines', role: 'SUPPLIER', phone: '+919900000002', company: 'SkyWings Airlines', balance: 500000 },
  })
  const supplier2 = await db.user.create({
    data: { email: 'ops@nimbusair.com', passwordHash: DEMO_PW, name: 'Nimbus Air', role: 'SUPPLIER', phone: '+919900000003', company: 'Nimbus Air', balance: 320000 },
  })
  const agent1 = await db.user.create({
    data: { email: 'agent@flymart.com', passwordHash: DEMO_PW, name: 'FlyMart Travels', role: 'AGENT', phone: '+919900000004', company: 'FlyMart Travels', balance: 25000, commissionRate: 8 },
  })
  const agent2 = await db.user.create({
    data: { email: 'agent@globetrotter.com', passwordHash: DEMO_PW, name: 'GlobeTrotter Agency', role: 'AGENT', phone: '+919900000005', company: 'GlobeTrotter Agency', balance: 18000, commissionRate: 6 },
  })
  const customer = await db.user.create({
    data: { email: 'rahul@example.com', passwordHash: DEMO_PW, name: 'Rahul Sharma', role: 'CUSTOMER', phone: '+919900000006', balance: 5000 },
  })
  const customer2 = await db.user.create({
    data: { email: 'priya@example.com', passwordHash: DEMO_PW, name: 'Priya Patel', role: 'CUSTOMER', phone: '+919900000007' },
  })

  const flightsData = [
    { flightNumber: 'SW 101', airline: 'SkyWings Airlines', airlineCode: 'SW', origin: 'DEL', originCity: 'New Delhi', destination: 'BOM', destinationCity: 'Mumbai', departureTime: '06:00', arrivalTime: '08:15', durationMins: 135, totalSeats: 180, basePrice: 4500, cabinClass: 'ECONOMY', aircraft: 'A320', supplierId: supplier1.id },
    { flightNumber: 'SW 204', airline: 'SkyWings Airlines', airlineCode: 'SW', origin: 'DEL', originCity: 'New Delhi', destination: 'BLR', destinationCity: 'Bengaluru', departureTime: '09:30', arrivalTime: '12:20', durationMins: 170, totalSeats: 160, basePrice: 6200, cabinClass: 'ECONOMY', aircraft: 'B737', supplierId: supplier1.id },
    { flightNumber: 'SW 310', airline: 'SkyWings Airlines', airlineCode: 'SW', origin: 'BOM', originCity: 'Mumbai', destination: 'GOI', destinationCity: 'Goa', departureTime: '14:00', arrivalTime: '15:10', durationMins: 70, totalSeats: 144, basePrice: 3200, cabinClass: 'ECONOMY', aircraft: 'A319', supplierId: supplier1.id },
    { flightNumber: 'NA 505', airline: 'Nimbus Air', airlineCode: 'NA', origin: 'BLR', originCity: 'Bengaluru', destination: 'MAA', destinationCity: 'Chennai', departureTime: '07:15', arrivalTime: '08:20', durationMins: 65, totalSeats: 150, basePrice: 2800, cabinClass: 'ECONOMY', aircraft: 'A320', supplierId: supplier2.id },
    { flightNumber: 'NA 612', airline: 'Nimbus Air', airlineCode: 'NA', origin: 'DEL', originCity: 'New Delhi', destination: 'GOI', destinationCity: 'Goa', departureTime: '11:00', arrivalTime: '13:25', durationMins: 145, totalSeats: 180, basePrice: 5400, cabinClass: 'BUSINESS', aircraft: 'A321', supplierId: supplier2.id },
    { flightNumber: 'NA 770', airline: 'Nimbus Air', airlineCode: 'NA', origin: 'BOM', originCity: 'Mumbai', destination: 'HYD', destinationCity: 'Hyderabad', departureTime: '16:40', arrivalTime: '18:00', durationMins: 80, totalSeats: 162, basePrice: 3600, cabinClass: 'ECONOMY', aircraft: 'B737', supplierId: supplier2.id },
    { flightNumber: 'SW 888', airline: 'SkyWings Airlines', airlineCode: 'SW', origin: 'BLR', originCity: 'Bengaluru', destination: 'GOI', destinationCity: 'Goa', departureTime: '18:30', arrivalTime: '19:50', durationMins: 80, totalSeats: 150, basePrice: 3400, cabinClass: 'ECONOMY', aircraft: 'A320', supplierId: supplier1.id },
    { flightNumber: 'SW 110', airline: 'SkyWings Airlines', airlineCode: 'SW', origin: 'CCU', originCity: 'Kolkata', destination: 'DEL', destinationCity: 'New Delhi', departureTime: '08:00', arrivalTime: '10:20', durationMins: 140, totalSeats: 170, basePrice: 5800, cabinClass: 'ECONOMY', aircraft: 'A320', supplierId: supplier1.id },
    { flightNumber: 'SW 230', airline: 'SkyWings Airlines', airlineCode: 'SW', origin: 'JAI', originCity: 'Jaipur', destination: 'BOM', destinationCity: 'Mumbai', departureTime: '12:45', arrivalTime: '14:30', durationMins: 105, totalSeats: 150, basePrice: 3800, cabinClass: 'ECONOMY', aircraft: 'A319', supplierId: supplier1.id },
    { flightNumber: 'SW 415', airline: 'SkyWings Airlines', airlineCode: 'SW', origin: 'LKO', originCity: 'Lucknow', destination: 'BLR', destinationCity: 'Bengaluru', departureTime: '10:15', arrivalTime: '13:00', durationMins: 165, totalSeats: 160, basePrice: 5400, cabinClass: 'ECONOMY', aircraft: 'B737', supplierId: supplier1.id },
    { flightNumber: 'NA 820', airline: 'Nimbus Air', airlineCode: 'NA', origin: 'COK', originCity: 'Kochi', destination: 'MAA', destinationCity: 'Chennai', departureTime: '06:30', arrivalTime: '07:45', durationMins: 75, totalSeats: 150, basePrice: 3100, cabinClass: 'ECONOMY', aircraft: 'A320', supplierId: supplier2.id },
    { flightNumber: 'NA 901', airline: 'Nimbus Air', airlineCode: 'NA', origin: 'TRV', originCity: 'Thiruvananthapuram', destination: 'BLR', destinationCity: 'Bengaluru', departureTime: '15:20', arrivalTime: '16:35', durationMins: 75, totalSeats: 144, basePrice: 3600, cabinClass: 'ECONOMY', aircraft: 'A319', supplierId: supplier2.id },
    { flightNumber: 'NA 640', airline: 'Nimbus Air', airlineCode: 'NA', origin: 'GAU', originCity: 'Guwahati', destination: 'CCU', destinationCity: 'Kolkata', departureTime: '09:00', arrivalTime: '10:25', durationMins: 85, totalSeats: 150, basePrice: 4200, cabinClass: 'ECONOMY', aircraft: 'A320', supplierId: supplier2.id },
    { flightNumber: 'NA 750', airline: 'Nimbus Air', airlineCode: 'NA', origin: 'PAT', originCity: 'Patna', destination: 'DEL', destinationCity: 'New Delhi', departureTime: '13:10', arrivalTime: '15:00', durationMins: 110, totalSeats: 160, basePrice: 4600, cabinClass: 'ECONOMY', aircraft: 'B737', supplierId: supplier2.id },
    { flightNumber: 'SW 560', airline: 'SkyWings Airlines', airlineCode: 'SW', origin: 'CJB', originCity: 'Coimbatore', destination: 'HYD', destinationCity: 'Hyderabad', departureTime: '17:00', arrivalTime: '18:30', durationMins: 90, totalSeats: 150, basePrice: 3900, cabinClass: 'ECONOMY', aircraft: 'A320', supplierId: supplier1.id },
    { flightNumber: 'NA 333', airline: 'Nimbus Air', airlineCode: 'NA', origin: 'IXB', originCity: 'Bagdogra', destination: 'CCU', destinationCity: 'Kolkata', departureTime: '11:30', arrivalTime: '12:35', durationMins: 65, totalSeats: 140, basePrice: 2900, cabinClass: 'ECONOMY', aircraft: 'A319', supplierId: supplier2.id },
  ]
  const flights = []
  for (const f of flightsData) flights.push(await db.flight.create({ data: f }))

  const now = new Date()
  const dayMs = 24 * 60 * 60 * 1000
  const fdData = [
    { flightIdx: 0, dayOffset: 1, cost: 4000, sell: 4699, seats: 40 },
    { flightIdx: 0, dayOffset: 3, cost: 4200, sell: 4899, seats: 35 },
    { flightIdx: 0, dayOffset: 7, cost: 4100, sell: 4799, seats: 50 },
    { flightIdx: 1, dayOffset: 2, cost: 5600, sell: 6499, seats: 30 },
    { flightIdx: 1, dayOffset: 5, cost: 5800, sell: 6799, seats: 28 },
    { flightIdx: 2, dayOffset: 1, cost: 2900, sell: 3399, seats: 60 },
    { flightIdx: 2, dayOffset: 4, cost: 3000, sell: 3599, seats: 55 },
    { flightIdx: 3, dayOffset: 2, cost: 2500, sell: 2999, seats: 70 },
    { flightIdx: 3, dayOffset: 6, cost: 2600, sell: 3099, seats: 65 },
    { flightIdx: 4, dayOffset: 3, cost: 5000, sell: 5999, seats: 22 },
    { flightIdx: 4, dayOffset: 8, cost: 5100, sell: 6199, seats: 25 },
    { flightIdx: 5, dayOffset: 1, cost: 3200, sell: 3799, seats: 48 },
    { flightIdx: 5, dayOffset: 5, cost: 3300, sell: 3899, seats: 44 },
    { flightIdx: 6, dayOffset: 2, cost: 3000, sell: 3599, seats: 52 },
    { flightIdx: 6, dayOffset: 9, cost: 3100, sell: 3699, seats: 50 },
    // new flights (idx 7..16)
    { flightIdx: 7, dayOffset: 1, cost: 5200, sell: 5999, seats: 38 },
    { flightIdx: 7, dayOffset: 4, cost: 5300, sell: 6199, seats: 42 },
    { flightIdx: 8, dayOffset: 2, cost: 3400, sell: 3999, seats: 45 },
    { flightIdx: 9, dayOffset: 3, cost: 4900, sell: 5699, seats: 32 },
    { flightIdx: 10, dayOffset: 1, cost: 2800, sell: 3299, seats: 58 },
    { flightIdx: 10, dayOffset: 6, cost: 2900, sell: 3399, seats: 52 },
    { flightIdx: 11, dayOffset: 2, cost: 3300, sell: 3899, seats: 40 },
    { flightIdx: 12, dayOffset: 3, cost: 3800, sell: 4399, seats: 36 },
    { flightIdx: 12, dayOffset: 7, cost: 3900, sell: 4499, seats: 34 },
    { flightIdx: 13, dayOffset: 1, cost: 4200, sell: 4899, seats: 40 },
    { flightIdx: 14, dayOffset: 4, cost: 3500, sell: 4099, seats: 44 },
    { flightIdx: 15, dayOffset: 2, cost: 2600, sell: 3099, seats: 60 },
    { flightIdx: 15, dayOffset: 5, cost: 2400, sell: 2899, seats: 50 },
  ]
  for (const fd of fdData) {
    const flight = flights[fd.flightIdx]
    const depDate = new Date(now.getTime() + fd.dayOffset * dayMs)
    depDate.setHours(0, 0, 0, 0)
    await db.fixedDeparture.create({
      data: { flightId: flight.id, departureDate: depDate, availableSeats: fd.seats, bookedSeats: Math.floor(fd.seats * 0.15), costPrice: fd.cost, sellingPrice: fd.sell, markup: fd.sell - fd.cost, status: 'OPEN', supplierId: flight.supplierId },
    })
  }

  const allFds = await db.fixedDeparture.findMany({ include: { flight: true } })
  const sampleBookings = [
    { fdIdx: 0, userId: customer.id, role: 'CUSTOMER', seats: 1, paid: true },
    { fdIdx: 2, userId: agent1.id, role: 'AGENT', seats: 2, paid: true },
    { fdIdx: 5, userId: customer2.id, role: 'CUSTOMER', seats: 1, paid: false },
    { fdIdx: 8, userId: agent2.id, role: 'AGENT', seats: 3, paid: true },
    { fdIdx: 1, userId: customer.id, role: 'CUSTOMER', seats: 2, paid: true },
  ]
  for (let i = 0; i < sampleBookings.length; i++) {
    const sb = sampleBookings[i]
    const fd = allFds[sb.fdIdx]
    if (!fd) continue
    const total = fd.sellingPrice * sb.seats
    const commission = sb.role === 'AGENT' ? total * 0.08 : 0
    const booking = await db.booking.create({
      data: { reference: `SF${1000 + i}`, flightId: fd.flightId, fixedDepartureId: fd.id, userId: sb.userId, bookedByRole: sb.role, passengerName: sb.role === 'AGENT' ? 'Walk-in Passenger' : 'Primary Passenger', passengerEmail: 'passenger@example.com', passengerPhone: '+919900012345', passengerType: 'ADULT', seats: sb.seats, unitPrice: fd.sellingPrice, totalAmount: total, commission, status: 'CONFIRMED', paymentStatus: sb.paid ? 'PAID' : 'PENDING' },
    })
    await db.payment.create({
      data: { bookingId: booking.id, userId: sb.userId, amount: total, method: 'QR_SCAN', status: sb.paid ? 'PAID' : 'PENDING', qrPayload: `upi://pay?pa=specialfare@bank&pn=Special Fare&am=${total}&tn=${booking.reference}`, transactionId: sb.paid ? `TXN${Date.now()}${i}` : null },
    })
  }

  console.log('Seed complete.')
  console.log(`Admin:     ${ADMIN_EMAIL} (password from ADMIN_PASSWORD env var)`)
  console.log('Supplier:  supplier@skywings.com / password123')
  console.log('Agent:     agent@flymart.com / password123')
  console.log('Customer:  rahul@example.com / password123')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(async () => { await db.$disconnect() })
