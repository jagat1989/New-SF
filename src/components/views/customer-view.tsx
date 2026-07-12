'use client'

import * as React from 'react'
import {
  Plane, Search, ArrowRight, ArrowLeftRight, Calendar, Clock, Users,
  Wallet, Ticket, ScanLine, CheckCircle2, Loader2, Timer, CalendarDays, Receipt, Printer,
  ChevronDown, FileText, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { api, formatINR, formatDate, formatDateTime } from '@/lib/api'
import { useAuth } from '@/store/auth'
import type { FixedDeparture, Booking, Payment } from '@/lib/types'
import { CITY_AIRPORTS } from '@/lib/types'
import { TICKET_TERMS, TICKET_FOOTER_NOTE } from '@/lib/ticket-terms'
import { StatCard, StatusBadge, SectionHeader, EmptyState } from '@/components/shared/ui'
import { AirportCombobox } from '@/components/shared/airport-combobox'
import { BookingModal } from '@/components/shared/booking-modal'
import { QrPaymentModal } from '@/components/shared/qr-payment-modal'
import { printTicket } from '@/components/shared/print-ticket'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function todayStr() {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().split('T')[0]
}

function formatDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

/** Deterministic pseudo-barcode string generated from a booking reference. */
function genBarcode(ref: string) {
  let seed = 0
  for (let i = 0; i < ref.length; i++) seed = (seed * 31 + ref.charCodeAt(i)) >>> 0
  const chars = ['▮', '▯', '▌', '▍', '│', '║']
  let out = ''
  for (let i = 0; i < 46; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    out += chars[seed % chars.length]
  }
  return out
}

type SortKey = 'time-asc' | 'price-asc' | 'price-desc'

/* ------------------------------------------------------------------ */
/* Root view                                                          */
/* ------------------------------------------------------------------ */

export function CustomerView({ active, setActive }: { active: string; setActive: (s: string) => void }) {
  switch (active) {
    case 'bookings':
      return <BookingsSection />
    case 'payments':
      return <PaymentsSection />
    case 'search':
    default:
      return <SearchSection onGoToBookings={() => setActive('bookings')} />
  }
}

/* ------------------------------------------------------------------ */
/* 1. Search                                                          */
/* ------------------------------------------------------------------ */

function SearchSection({ onGoToBookings }: { onGoToBookings: () => void }) {
  const { user } = useAuth()
  const [origin, setOrigin] = React.useState('DEL')
  const [destination, setDestination] = React.useState('BOM')
  const [date, setDate] = React.useState(todayStr())
  const [departures, setDepartures] = React.useState<FixedDeparture[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searched, setSearched] = React.useState(false)
  const [sortBy, setSortBy] = React.useState<SortKey>('time-asc')
  const [bookOpen, setBookOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<FixedDeparture | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const loadAll = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.departures.list()
      setDepartures(res.departures || [])
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load departures')
    } finally {
      setLoading(false)
    }
  }, [])

  const search = async () => {
    if (origin === destination) {
      toast.error('Origin and destination must be different')
      return
    }
    setLoading(true)
    setSearched(true)
    try {
      const res = await api.departures.list({ origin, destination, date })
      setDepartures(res.departures || [])
    } catch (e: any) {
      toast.error(e?.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  const swap = () => {
    setOrigin(destination)
    setDestination(origin)
  }

  // On mount: load all open departures (pre-purchase inventory)
  React.useEffect(() => {
    loadAll()
  }, [loadAll, refreshKey])

  const sorted = React.useMemo(() => {
    const arr = [...departures]
    if (sortBy === 'price-asc') arr.sort((a, b) => a.sellingPrice - b.sellingPrice)
    else if (sortBy === 'price-desc') arr.sort((a, b) => b.sellingPrice - a.sellingPrice)
    else arr.sort((a, b) => new Date(a.departureDate).getTime() - new Date(b.departureDate).getTime())
    return arr
  }, [departures, sortBy])

  const openBook = (d: FixedDeparture) => {
    setSelected(d)
    setBookOpen(true)
  }

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <SectionHeader
        title="Find your next flight"
        description="Search fixed departures across India — book instantly with secure QR payment."
      />

      {/* Hero search card */}
      <Card className="overflow-hidden border-border/60 shadow-md">
        <div className="sky-gradient p-5 sm:p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Plane className="h-5 w-5" />
            <h3 className="font-semibold tracking-tight">Search Flights</h3>
            <Badge className="ml-auto bg-white/20 text-white border-white/30 hover:bg-white/20 text-[10px]">
              Direct flights only
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_1fr_auto] gap-3 items-end">
            {/* From */}
            <div>
              <Label className="text-xs text-white/80 mb-1 block">From</Label>
              <AirportCombobox
                value={origin}
                onValueChange={setOrigin}
                placeholder="Origin city"
                exclude={destination}
                triggerClassName="bg-white"
              />
            </div>

            {/* Swap (desktop) */}
            <div className="hidden lg:flex justify-center pb-0.5">
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="h-11 w-11 rounded-full"
                onClick={swap}
                aria-label="Swap origin and destination"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>

            {/* To */}
            <div>
              <Label className="text-xs text-white/80 mb-1 block">To</Label>
              <AirportCombobox
                value={destination}
                onValueChange={setDestination}
                placeholder="Destination city"
                exclude={origin}
                triggerClassName="bg-white"
              />
            </div>

            {/* Date */}
            <div>
              <Label className="text-xs text-white/80 mb-1 block">Departure</Label>
              <Input
                type="date"
                value={date}
                min={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                className="h-11 bg-white text-foreground"
              />
            </div>

            {/* Search */}
            <Button
              onClick={search}
              disabled={loading}
              className="h-11 lg:px-6 bg-white text-primary hover:bg-white/90 font-semibold"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>

          {/* Swap (mobile) */}
          <div className="lg:hidden mt-2 flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={swap}
              className="bg-white/15 text-white hover:bg-white/25 h-8"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Swap
            </Button>
          </div>
        </div>
      </Card>

      {/* Filter / sort row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-5 mb-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">{sorted.length}</span>
          <span className="text-muted-foreground">flights found</span>
          {searched && (
            <Badge variant="outline" className="text-[10px] ml-1">
              {origin} → {destination} · {formatDate(date)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Sort by</span>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="time-asc">Departure date</SelectItem>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={Plane}
              title="No flights found"
              description={
                searched
                  ? 'Try a different route or departure date.'
                  : 'No open fixed departures available right now. Please check back later.'
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sorted.map((d) => (
            <FlightCard key={d.id} departure={d} onBook={() => openBook(d)} />
          ))}
        </div>
      )}

      <BookingModal
        open={bookOpen}
        onOpenChange={setBookOpen}
        departure={selected}
        defaultPassengerName={user?.name || ''}
        defaultPassengerEmail={user?.email || ''}
        defaultPassengerPhone={user?.phone || ''}
        onBooked={() => {
          setRefreshKey((k) => k + 1)
          onGoToBookings()
        }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Flight card                                                        */
/* ------------------------------------------------------------------ */

function FlightCard({ departure, onBook }: { departure: FixedDeparture; onBook: () => void }) {
  const flight = departure.flight
  const remaining = departure.availableSeats - departure.bookedSeats
  const low = remaining > 0 && remaining <= 5
  const soldOut = remaining <= 0

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Airline */}
          <div className="flex items-center gap-3 lg:w-44 shrink-0">
            <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-primary shrink-0">
              <Plane className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{flight.airlineCode} {flight.flightNumber}</p>
              <p className="text-xs text-muted-foreground truncate">{flight.airline}</p>
            </div>
          </div>

          {/* Route + times */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 sm:gap-3">
              <div className="text-left">
                <p className="text-xl font-bold tabular-nums">{flight.departureTime}</p>
                <p className="text-xs text-muted-foreground">{flight.origin} · {flight.originCity}</p>
              </div>
              <div className="flex-1 mx-1 sm:mx-3 relative">
                <div className="border-t border-dashed border-muted-foreground/40" />
                <Plane className="h-3.5 w-3.5 absolute -top-1.5 left-1/2 -translate-x-1/2 text-primary" />
                <p className="text-[10px] text-center text-muted-foreground mt-1">
                  {formatDuration(flight.durationMins)} · {flight.aircraft}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold tabular-nums">{flight.arrivalTime}</p>
                <p className="text-xs text-muted-foreground">{flight.destination} · {flight.destinationCity}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDate(departure.departureDate)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatDuration(flight.durationMins)}
              </span>
              <Badge variant="outline" className="text-[10px]">{flight.cabinClass}</Badge>
              {flight.baggage && (
                <span className="inline-flex items-center gap-1">
                  <Wallet className="h-3 w-3" /> {flight.baggage}
                </span>
              )}
            </div>
          </div>

          {/* Right: price + book */}
          <div className="lg:w-44 shrink-0 flex flex-row lg:flex-col items-end justify-between gap-2 lg:items-end lg:border-l lg:pl-4">
            <div className="lg:text-right">
              <p className="text-[10px] text-muted-foreground uppercase">per seat</p>
              <p className="text-lg font-bold text-primary">{formatINR(departure.sellingPrice)}</p>
              <div className="flex lg:justify-end items-center gap-1 mt-0.5">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className={cn('text-xs', soldOut ? 'text-rose-600 font-semibold' : low ? 'text-rose-600 font-semibold' : 'text-muted-foreground')}>
                  {soldOut ? 'sold out' : `${remaining} left`}
                </span>
              </div>
            </div>
            <Button onClick={onBook} disabled={soldOut} className="sky-gradient text-white h-9">
              {soldOut ? 'Sold out' : 'Book Now'}
              {!soldOut && <ArrowRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* 2. Bookings                                                        */
/* ------------------------------------------------------------------ */

function BookingsSection() {
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)
  const [tab, setTab] = React.useState('all')
  const [payBookingId, setPayBookingId] = React.useState<string | null>(null)
  const [ticket, setTicket] = React.useState<Booking | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.bookings.list()
      setBookings(res.bookings || [])
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load, refreshKey])

  const now = new Date()
  const isUpcoming = (b: Booking) =>
    b.paymentStatus === 'PAID' && !!b.fixedDeparture && new Date(b.fixedDeparture.departureDate) >= now
  const isCompleted = (b: Booking) =>
    !!b.fixedDeparture && new Date(b.fixedDeparture.departureDate) < now

  const upcoming = bookings.filter(isUpcoming)
  const completed = bookings.filter(isCompleted)
  const pendingCount = bookings.filter((b) => b.paymentStatus === 'PENDING').length
  const visible = tab === 'upcoming' ? upcoming : tab === 'completed' ? completed : bookings

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <SectionHeader title="My Bookings" description="View and manage your flight bookings." />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total" value={bookings.length} icon={Ticket} accent="teal" />
        <StatCard label="Upcoming" value={upcoming.length} icon={CalendarDays} accent="sky" />
        <StatCard label="Pending Pay" value={pendingCount} icon={Timer} accent="amber" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-28 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : visible.length === 0 ? (
            <Card>
              <CardContent className="p-4">
                <EmptyState
                  icon={Ticket}
                  title="No bookings yet"
                  description="Search for flights to make your first booking."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {visible.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onPay={() => setPayBookingId(b.id)}
                  onViewTicket={() => setTicket(b)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <QrPaymentModal
        open={!!payBookingId}
        onOpenChange={(o) => {
          if (!o) {
            setPayBookingId(null)
            setRefreshKey((k) => k + 1)
          }
        }}
        bookingId={payBookingId}
        onPaid={() => setRefreshKey((k) => k + 1)}
      />

      <TicketDialog booking={ticket} open={!!ticket} onOpenChange={(o) => !o && setTicket(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Booking card                                                       */
/* ------------------------------------------------------------------ */

function BookingCard({
  booking, onPay, onViewTicket,
}: {
  booking: Booking
  onPay: () => void
  onViewTicket: () => void
}) {
  const flight = booking.flight
  const dep = booking.fixedDeparture
  const paid = booking.paymentStatus === 'PAID'

  return (
    <Card className="overflow-hidden border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-primary">{booking.reference}</span>
            <Badge variant="outline" className="text-[10px]">{booking.passengerType}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={paid ? 'CONFIRMED' : 'PENDING'} />
            <StatusBadge status={booking.status} />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg bg-teal-50 dark:bg-teal-950 flex items-center justify-center text-primary shrink-0">
            <Plane className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm truncate">
              {flight.airlineCode} {flight.flightNumber} · {flight.airline}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {flight.cabinClass} · {booking.passengerName} · {booking.seats} seat(s)
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <p className="font-semibold truncate">
              {flight.origin}
              <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
              {flight.destination}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {flight.originCity} → {flight.destinationCity}
            </p>
          </div>
          <div className="text-right shrink-0">
            {dep && (
              <p className="text-xs font-medium inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {formatDateTime(dep.departureDate)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {flight.departureTime} – {flight.arrivalTime}
            </p>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-bold text-foreground">{formatINR(booking.totalAmount)}</span>
          </div>
          <div className="flex items-center gap-2">
            {booking.paymentStatus === 'PENDING' && (
              <Button size="sm" onClick={onPay} className="sky-gradient text-white h-8">
                <ScanLine className="h-3.5 w-3.5 mr-1" /> Pay Now
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onViewTicket} className="h-8">
              <Ticket className="h-3.5 w-3.5 mr-1" /> View Ticket
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/* ------------------------------------------------------------------ */
/* E-ticket dialog                                                    */
/* ------------------------------------------------------------------ */

function TicketDialog({
  booking, open, onOpenChange,
}: {
  booking: Booking | null
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  if (!booking) return null
  const flight = booking.flight
  const dep = booking.fixedDeparture
  const barcode = genBarcode(booking.reference)
  const paid = booking.paymentStatus === 'PAID'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> E-Ticket
          </DialogTitle>
          <DialogDescription>
            Electronic ticket for {flight.airlineCode} {flight.flightNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-border overflow-hidden">
          {/* Header band */}
          <div className="sky-gradient p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              <div>
                <p className="font-bold leading-tight">SPECIAL FARE</p>
                <p className="text-[10px] text-white/80">E-Ticket / Boarding Pass</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-white/80">PNR</p>
              <p className="font-mono font-bold tracking-wider">{booking.reference}</p>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase">Passenger</p>
                <p className="font-semibold truncate">{booking.passengerName}</p>
                <p className="text-xs text-muted-foreground truncate">{booking.passengerEmail}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-muted-foreground uppercase">Flight</p>
                <p className="font-semibold">{flight.airlineCode} {flight.flightNumber}</p>
                <p className="text-xs text-muted-foreground">{flight.airline}</p>
              </div>
            </div>

            <Separator />

            {/* Route */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{flight.origin}</p>
                <p className="text-xs text-muted-foreground">{flight.originCity}</p>
                <p className="text-sm font-semibold mt-1">{flight.departureTime}</p>
              </div>
              <div className="flex-1 mx-3 relative">
                <div className="border-t border-dashed border-muted-foreground/40" />
                <Plane className="h-4 w-4 absolute -top-2 left-1/2 -translate-x-1/2 text-primary" />
                <p className="text-[10px] text-center text-muted-foreground mt-1">
                  {formatDuration(flight.durationMins)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{flight.destination}</p>
                <p className="text-xs text-muted-foreground">{flight.destinationCity}</p>
                <p className="text-sm font-semibold mt-1">{flight.arrivalTime}</p>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-muted p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Date</p>
                <p className="font-semibold">{dep ? formatDate(dep.departureDate) : '—'}</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Seat(s)</p>
                <p className="font-semibold">{booking.seats}</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-[10px] text-muted-foreground uppercase">Cabin</p>
                <p className="font-semibold">{flight.cabinClass}</p>
              </div>
            </div>

            <Separator />

            {/* Amount + status */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Amount</p>
                <p className="font-bold text-primary">{formatINR(booking.totalAmount)}</p>
              </div>
              <StatusBadge status={paid ? 'CONFIRMED' : 'PENDING'} />
            </div>

            {/* Barcode */}
            <div className="rounded-lg bg-background border border-dashed border-border p-3 text-center overflow-hidden">
              <p className="font-mono text-xl tracking-tighter leading-none overflow-hidden whitespace-nowrap">
                {barcode}
              </p>
              <p className="font-mono text-xs mt-1 tracking-widest">{booking.reference}</p>
            </div>

            <p className="text-[10px] text-center text-muted-foreground">
              {TICKET_FOOTER_NOTE}
            </p>
          </div>
        </div>

        {/* Terms & Conditions (collapsible) */}
        <TcCollapsible />

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => printTicket(booking)}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------------------------------------------ */
/* Terms & Conditions collapsible                                      */
/* ------------------------------------------------------------------ */

function TcCollapsible() {
  const [open, setOpen] = React.useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2.5 text-left hover:bg-muted transition"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Indian Airlines — Terms &amp; Conditions
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground">{TICKET_TERMS.length} clauses</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border p-3 space-y-2.5 max-h-72 overflow-y-auto scrollbar-thin">
          <p className="text-[10px] text-muted-foreground italic">
            Carriage and other services provided by the carrier are subject to its conditions of carriage and related regulations. Passengers are advised to read the following terms carefully before travel.
          </p>
          <ol className="space-y-2">
            {TICKET_TERMS.map((t, i) => (
              <li key={i} className="text-xs leading-relaxed text-foreground/90">
                <span className="flex items-start gap-1.5">
                  <span className="font-bold text-primary shrink-0">{i + 1}.</span>
                  <span>
                    <span className="flex items-center gap-1 font-semibold text-foreground">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      {t.title}
                    </span>
                    <span className="text-muted-foreground block mt-0.5">{t.body}</span>
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <p className="text-[10px] text-center text-muted-foreground/80 pt-2 border-t border-border/60">
            This is an electronically generated document and does not require a physical signature. © 2025 Special Fare. All carriage is governed by the airline&rsquo;s conditions of carriage and DGCA regulations.
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

/* ------------------------------------------------------------------ */
/* 3. Payments                                                        */
/* ------------------------------------------------------------------ */

interface PaymentRow extends Payment {
  bookingRef: string
  flight: string
}

function PaymentsSection() {
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)
  const [payBookingId, setPayBookingId] = React.useState<string | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.bookings.list()
      setBookings(res.bookings || [])
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load, refreshKey])

  const payments = React.useMemo<PaymentRow[]>(() => {
    const rows: PaymentRow[] = []
    for (const b of bookings) {
      for (const p of b.payments || []) {
        rows.push({
          ...p,
          bookingRef: b.reference,
          flight: `${b.flight?.airlineCode || ''} ${b.flight?.flightNumber || ''}`.trim(),
        })
      }
    }
    rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    return rows
  }, [bookings])

  const paidList = payments.filter((p) => p.status === 'PAID')
  const pendingList = payments.filter((p) => p.status === 'PENDING')
  const totalPaid = paidList.reduce((s, p) => s + p.amount, 0)
  const totalPending = pendingList.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <SectionHeader title="Payments" description="All your payment transactions in one place." />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard
          label="Total Spent"
          value={formatINR(totalPaid)}
          icon={Wallet}
          accent="emerald"
          hint={`${paidList.length} successful payment(s)`}
        />
        <StatCard
          label="Pending Amount"
          value={formatINR(totalPending)}
          icon={Timer}
          accent="amber"
          hint={`${pendingList.length} awaiting payment`}
        />
        <StatCard
          label="Transactions"
          value={payments.length}
          icon={Receipt}
          accent="sky"
        />
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <EmptyState
              icon={Wallet}
              title="No payments yet"
              description="Your payment history will appear here once you book a flight."
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/95 backdrop-blur z-10">
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Flight</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Txn ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs whitespace-nowrap">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{p.bookingRef}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{p.flight}</TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap">{formatINR(p.amount)}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <ScanLine className="h-3 w-3" /> QR Scan
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {p.transactionId ? (
                        <span className="truncate inline-block max-w-[120px] align-bottom">{p.transactionId}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      {p.status === 'PENDING' ? (
                        <Button
                          size="sm"
                          className="h-7 sky-gradient text-white"
                          onClick={() => setPayBookingId(p.bookingId)}
                        >
                          <ScanLine className="h-3 w-3 mr-1" /> Pay
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground inline-flex items-center">
                          <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" /> Done
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <QrPaymentModal
        open={!!payBookingId}
        onOpenChange={(o) => {
          if (!o) {
            setPayBookingId(null)
            setRefreshKey((k) => k + 1)
          }
        }}
        bookingId={payBookingId}
        onPaid={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
