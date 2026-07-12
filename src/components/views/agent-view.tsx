'use client'

import * as React from 'react'
import {
  Plane, Search, Briefcase, Wallet, Ticket, ScanLine, Users, TrendingUp,
  Percent, Calendar, Loader2, ArrowRight, ArrowLeftRight, Clock, Filter,
  ChevronRight, CheckCircle2, Info, Printer, ChevronDown, FileText, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { api, formatINR, formatDate, formatDateTime } from '@/lib/api'
import type { FixedDeparture, Booking } from '@/lib/types'
import { CITY_AIRPORTS } from '@/lib/types'
import { TICKET_TERMS } from '@/lib/ticket-terms'
import { useAuth } from '@/store/auth'
import { StatCard, StatusBadge, SectionHeader, EmptyState } from '@/components/shared/ui'
import { AirportCombobox } from '@/components/shared/airport-combobox'
import { BookingModal } from '@/components/shared/booking-modal'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'
import { QrPaymentModal } from '@/components/shared/qr-payment-modal'
import { printTicket } from '@/components/shared/print-ticket'

type SortKey = 'price-asc' | 'price-desc' | 'time-asc' | 'time-desc'

/** Deterministic pseudo-barcode string generated from a booking reference. */
function genBarcode(ref: string) {
  let seed = 0
  for (let i = 0; i < ref.length; i++) seed = (seed * 31 + ref.charCodeAt(i)) >>> 0
  let out = ''
  for (let i = 0; i < 44; i++) {
    const v = (seed >> (i % 22)) ^ (i * 13)
    out += (v & 3).toString(2).padStart(2, '0')
  }
  return out.slice(0, 44)
}

export function AgentView({ active }: { active: string; setActive: (s: string) => void }) {
  if (active === 'bookings') return <BookingsSection />
  if (active === 'commission') return <CommissionSection />
  return <InventorySection />
}

/* ============================================================
 * Inventory Section
 * ============================================================ */

function InventorySection() {
  const { user } = useAuth()
  const commissionRate = user?.commissionRate ?? 0

  const [origin, setOrigin] = React.useState('all')
  const [destination, setDestination] = React.useState('all')
  const [date, setDate] = React.useState('')
  const [sort, setSort] = React.useState<SortKey>('price-asc')
  const [departures, setDepartures] = React.useState<FixedDeparture[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searching, setSearching] = React.useState(false)
  const [bookingDeparture, setBookingDeparture] = React.useState<FixedDeparture | null>(null)

  const fetchAll = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.departures.list()
      setDepartures(res.departures || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [])

  const search = async () => {
    setSearching(true)
    try {
      const params: Record<string, string> = {}
      if (origin !== 'all') params.origin = origin
      if (destination !== 'all') params.destination = destination
      if (date) params.date = date
      const res = await api.departures.list(Object.keys(params).length ? params : undefined)
      setDepartures(res.departures || [])
    } catch (e: any) {
      toast.error(e.message || 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  React.useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const sorted = React.useMemo(() => {
    const list = [...departures]
    list.sort((a, b) => {
      switch (sort) {
        case 'price-asc': return a.sellingPrice - b.sellingPrice
        case 'price-desc': return b.sellingPrice - a.sellingPrice
        case 'time-asc': return a.flight.departureTime.localeCompare(b.flight.departureTime)
        case 'time-desc': return b.flight.departureTime.localeCompare(a.flight.departureTime)
      }
    })
    return list
  }, [departures, sort])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SectionHeader
        title="Pre-Purchase Inventory"
        description="Browse fixed departures published by suppliers and book seats for your clients at B2B rates."
        action={
          <Badge variant="outline" className="hidden sm:inline-flex items-center gap-1 border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300">
            <Percent className="h-3 w-3" /> {commissionRate}% commission per booking
          </Badge>
        }
      />

      {/* Search card */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">From</Label>
              <AirportCombobox
                value={origin}
                onValueChange={setOrigin}
                placeholder="Any origin"
                allowAll
                allLabel="All origins"
                triggerClassName="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To</Label>
              <AirportCombobox
                value={destination}
                onValueChange={setDestination}
                placeholder="Any destination"
                allowAll
                allLabel="All destinations"
                triggerClassName="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Departure date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
            </div>
            <div className="flex items-end">
              <Button
                onClick={search}
                disabled={searching}
                className="w-full h-10 sky-gradient text-white"
              >
                {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                Search
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sort / filter row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading departures…' : `${sorted.length} departure${sorted.length === 1 ? '' : 's'} available`}
        </p>
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="price-asc">Price: Low to High</SelectItem>
              <SelectItem value="price-desc">Price: High to Low</SelectItem>
              <SelectItem value="time-asc">Departure: Earliest</SelectItem>
              <SelectItem value="time-desc">Departure: Latest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-0">
            <EmptyState
              icon={Plane}
              title="No departures found"
              description="Try adjusting your search filters or check back later as suppliers publish new inventory."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sorted.map((d) => (
            <DepartureCard
              key={d.id}
              departure={d}
              commissionRate={commissionRate}
              onBook={() => setBookingDeparture(d)}
            />
          ))}
        </div>
      )}

      <BookingModal
        open={!!bookingDeparture}
        onOpenChange={(o) => !o && setBookingDeparture(null)}
        departure={bookingDeparture}
        agentMode={true}
        onBooked={() => {
          // refresh seat counts after a booking
          fetchAll()
        }}
      />
    </div>
  )
}

function DepartureCard({
  departure, commissionRate, onBook,
}: {
  departure: FixedDeparture
  commissionRate: number
  onBook: () => void
}) {
  const flight = departure.flight
  const remaining = departure.availableSeats - departure.bookedSeats
  const commissionPerSeat = (departure.sellingPrice * commissionRate) / 100
  const lowSeats = remaining <= 5

  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow flex flex-col">
      <CardContent className="p-5 flex flex-col gap-4 flex-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-9 w-9 rounded-lg sky-gradient flex items-center justify-center shrink-0">
              <Plane className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm truncate">{flight.airlineCode} {flight.flightNumber}</p>
              <p className="text-[11px] text-muted-foreground truncate">{flight.airline}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="outline" className="text-[10px]">{flight.cabinClass}</Badge>
            <StatusBadge status={departure.status} />
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xl font-bold text-foreground">{flight.departureTime}</p>
            <p className="text-xs text-muted-foreground truncate">{flight.origin} · {flight.originCity}</p>
          </div>
          <div className="flex-1 mx-2 relative">
            <div className="border-t border-dashed border-muted-foreground/40" />
            <Plane className="h-3.5 w-3.5 absolute -top-1.5 left-1/2 -translate-x-1/2 text-primary" />
            <p className="text-[10px] text-center text-muted-foreground mt-1">{flight.durationMins}m · {flight.aircraft}</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xl font-bold text-foreground">{flight.arrivalTime}</p>
            <p className="text-xs text-muted-foreground truncate">{flight.destination} · {flight.destinationCity}</p>
          </div>
        </div>

        {/* Footer meta */}
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" /> {formatDate(departure.departureDate)}
          </span>
          <span className={`inline-flex items-center gap-1 font-medium ${lowSeats ? 'text-rose-600' : 'text-emerald-600'}`}>
            <Users className="h-3.5 w-3.5" /> {remaining} seat{remaining === 1 ? '' : 's'} left
          </span>
        </div>

        <Separator />

        {/* Price + commission */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Selling price</p>
            <p className="text-2xl font-bold text-foreground">{formatINR(departure.sellingPrice)}</p>
            <p className="text-[11px] text-muted-foreground">per seat</p>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/50 px-3 py-2 text-right">
            <p className="text-[10px] font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1 justify-end">
              <Percent className="h-3 w-3" /> {commissionRate}% commission
            </p>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatINR(commissionPerSeat)}</p>
            <p className="text-[10px] text-emerald-700/70 dark:text-emerald-300/70">per seat</p>
          </div>
        </div>

        <Button onClick={onBook} disabled={remaining <= 0} className="w-full h-11 sky-gradient text-white">
          <Briefcase className="h-4 w-4 mr-2" /> Book for Client
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  )
}

/* ============================================================
 * Bookings Section
 * ============================================================ */

type BookingTab = 'all' | 'pending' | 'confirmed'

function BookingsSection() {
  const [tab, setTab] = React.useState<BookingTab>('all')
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)
  const [payBookingId, setPayBookingId] = React.useState<string | null>(null)
  const [ticketBooking, setTicketBooking] = React.useState<Booking | null>(null)

  const fetchBookings = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.bookings.list()
      setBookings(res.bookings || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const filtered = React.useMemo(() => {
    if (tab === 'pending') return bookings.filter((b) => b.paymentStatus === 'PENDING')
    if (tab === 'confirmed') return bookings.filter((b) => b.paymentStatus === 'PAID')
    return bookings
  }, [bookings, tab])

  const pendingCount = bookings.filter((b) => b.paymentStatus === 'PENDING').length
  const confirmedCount = bookings.filter((b) => b.paymentStatus === 'PAID').length

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SectionHeader
        title="My Bookings"
        description="Bookings you have created on behalf of your clients."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as BookingTab)}>
        <TabsList>
          <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({confirmedCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="border-border/60">
                  <CardContent className="p-4 space-y-3">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-4 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-0">
                <EmptyState
                  icon={Ticket}
                  title="No bookings yet"
                  description="Browse the pre-purchase inventory to create your first booking for a client."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  onPay={() => setPayBookingId(b.id)}
                  onViewTicket={() => setTicketBooking(b)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <QrPaymentModal
        open={!!payBookingId}
        onOpenChange={(o) => !o && setPayBookingId(null)}
        bookingId={payBookingId}
        onPaid={() => {
          setPayBookingId(null)
          fetchBookings()
        }}
      />

      <TicketDialog booking={ticketBooking} onClose={() => setTicketBooking(null)} />
    </div>
  )
}

function BookingCard({
  booking, onPay, onViewTicket,
}: {
  booking: Booking
  onPay: () => void
  onViewTicket: () => void
}) {
  const flight = booking.flight
  const pending = booking.paymentStatus === 'PENDING'

  return (
    <Card className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Left: flight summary */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                {booking.reference}
              </span>
              <span className="text-xs text-muted-foreground">{flight.airlineCode} {flight.flightNumber}</span>
              <Badge variant="outline" className="text-[10px]">{flight.cabinClass}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="min-w-0">
                <p className="font-semibold">{flight.origin}</p>
                <p className="text-[11px] text-muted-foreground">{flight.departureTime}</p>
              </div>
              <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold">{flight.destination}</p>
                <p className="text-[11px] text-muted-foreground">{flight.arrivalTime}</p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground ml-2">
                <Calendar className="h-3 w-3" />
                {booking.fixedDeparture ? formatDate(booking.fixedDeparture.departureDate) : formatDate(booking.createdAt)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {booking.passengerName}</span>
              <span className="inline-flex items-center gap-1"><Ticket className="h-3 w-3" /> {booking.seats} seat{booking.seats === 1 ? '' : 's'}</span>
            </div>
          </div>

          {/* Right: amount + actions */}
          <div className="lg:w-56 shrink-0 flex flex-row lg:flex-col items-center lg:items-end justify-between gap-3 lg:gap-2 lg:border-l lg:pl-5 lg:border-border/60">
            <div className="text-left lg:text-right">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">Total</p>
              <p className="text-lg font-bold text-foreground">{formatINR(booking.totalAmount)}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                +{formatINR(booking.commission)} commission
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusBadge status={booking.paymentStatus} />
            </div>
          </div>
        </div>

        <Separator className="my-3" />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Clock className="h-3 w-3" /> Booked {formatDateTime(booking.createdAt)}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onViewTicket} className="h-8">
              <Ticket className="h-3.5 w-3.5 mr-1.5" /> View Ticket
            </Button>
            {pending && (
              <Button size="sm" onClick={onPay} className="h-8 sky-gradient text-white">
                <ScanLine className="h-3.5 w-3.5 mr-1.5" /> Pay Now
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TicketDialog({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  if (!booking) return null
  const flight = booking.flight
  const fd = booking.fixedDeparture

  return (
    <Dialog open={!!booking} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" /> E-Ticket
          </DialogTitle>
          <DialogDescription>Booking reference {booking.reference}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status banner */}
          <div className={`rounded-lg p-3 flex items-center gap-2 ${
            booking.paymentStatus === 'PAID'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300'
          }`}>
            {booking.paymentStatus === 'PAID'
              ? <CheckCircle2 className="h-4 w-4 shrink-0" />
              : <Clock className="h-4 w-4 shrink-0" />}
            <p className="text-xs font-medium">
              {booking.paymentStatus === 'PAID'
                ? 'Confirmed — payment received, ticket issued.'
                : 'Pending payment — confirm payment to issue ticket.'}
            </p>
          </div>

          {/* Flight block */}
          <div className="rounded-xl border border-border bg-gradient-to-br from-accent/40 to-card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm">{flight.airlineCode} {flight.flightNumber}</span>
              <Badge variant="outline" className="text-[10px]">{flight.cabinClass}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">{flight.departureTime}</p>
                <p className="text-xs text-muted-foreground">{flight.origin} · {flight.originCity}</p>
              </div>
              <div className="flex-1 mx-3 relative">
                <div className="border-t border-dashed border-muted-foreground/40" />
                <Plane className="h-3.5 w-3.5 absolute -top-1.5 left-1/2 -translate-x-1/2 text-primary" />
                <p className="text-[10px] text-center text-muted-foreground mt-1">{flight.durationMins}m</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{flight.arrivalTime}</p>
                <p className="text-xs text-muted-foreground">{flight.destination} · {flight.destinationCity}</p>
              </div>
            </div>
            {fd && (
              <div className="mt-3 pt-3 border-t border-border/60 text-xs text-muted-foreground">
                {formatDate(fd.departureDate)} · {flight.aircraft}
              </div>
            )}
          </div>

          {/* Passenger + fare */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Passenger</p>
              <p className="font-semibold">{booking.passengerName}</p>
              <p className="text-xs text-muted-foreground">{booking.passengerEmail}</p>
            </div>
            <div className="rounded-lg bg-muted p-3">
              <p className="text-[11px] text-muted-foreground uppercase">Fare</p>
              <p className="font-semibold">{formatINR(booking.unitPrice)} × {booking.seats}</p>
              <p className="text-xs font-bold text-primary">{formatINR(booking.totalAmount)}</p>
            </div>
          </div>

          {/* Barcode */}
          <div className="rounded-lg bg-background border border-dashed border-border p-3 text-center overflow-hidden">
            <p className="font-mono text-lg tracking-tighter leading-none overflow-hidden whitespace-nowrap">
              {genBarcode(booking.reference)}
            </p>
            <p className="font-mono text-xs mt-1 tracking-widest">{booking.reference}</p>
          </div>
        </div>

        {/* Terms & Conditions (collapsible) */}
        <AgentTcCollapsible />

        <div className="grid grid-cols-2 gap-2 mt-1">
          <Button variant="outline" onClick={() => printTicket(booking)}>
            <Printer className="h-4 w-4 mr-2" /> Print Ticket
          </Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ============================================================
 * Terms & Conditions collapsible (agent)
 * ============================================================ */

function AgentTcCollapsible() {
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

/* ============================================================
 * Commission Section
 * ============================================================ */

interface AgentStats {
  bookings: number
  totalSales: number
  totalCommission: number
  pending: number
  balance: number
  commissionRate: number
}

function CommissionSection() {
  const [stats, setStats] = React.useState<AgentStats | null>(null)
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)

  const fetchAll = React.useCallback(async () => {
    setLoading(true)
    try {
      const [s, b] = await Promise.all([api.stats(), api.bookings.list()])
      setStats(s as AgentStats)
      setBookings(b.bookings || [])
    } catch (e: any) {
      toast.error(e.message || 'Failed to load commission data')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const paidBookings = React.useMemo(
    () => bookings.filter((b) => b.paymentStatus === 'PAID'),
    [bookings],
  )
  const sumCommission = paidBookings.reduce((s, b) => s + b.commission, 0)
  const sumSales = paidBookings.reduce((s, b) => s + b.totalAmount, 0)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <SectionHeader
        title="Commission Dashboard"
        description="Track your earnings, sales performance, and wallet balance."
      />

      {loading || !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-5 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard
            label="Total Commission"
            value={formatINR(stats.totalCommission)}
            icon={TrendingUp}
            accent="emerald"
            hint="From paid bookings"
          />
          <StatCard
            label="Total Sales"
            value={formatINR(stats.totalSales)}
            icon={Wallet}
            accent="teal"
            hint={`${stats.bookings} booking${stats.bookings === 1 ? '' : 's'}`}
          />
          <StatCard
            label="Pending Payments"
            value={stats.pending}
            icon={Clock}
            accent="amber"
            hint="Awaiting client payment"
          />
          <StatCard
            label="Commission Rate"
            value={`${stats.commissionRate}%`}
            icon={Percent}
            accent="violet"
            hint="Per paid booking"
          />
          <StatCard
            label="Wallet Balance"
            value={formatINR(stats.balance)}
            icon={Wallet}
            accent="sky"
            hint="Available to withdraw"
          />
        </div>
      )}

      {/* Breakdown table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Commission Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : paidBookings.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="No paid bookings yet"
              description="Commission is credited to your wallet once a client completes payment for a booking you created."
            />
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Flight</TableHead>
                    <TableHead>Passenger</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidBookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {b.reference}
                      </TableCell>
                      <TableCell className="text-xs">
                        {b.flight.airlineCode} {b.flight.flightNumber}
                        <span className="block text-[10px] text-muted-foreground">
                          {b.flight.origin} → {b.flight.destination}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">{b.passengerName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(b.createdAt)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatINR(b.totalAmount)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {stats?.commissionRate ?? 0}%
                      </TableCell>
                      <TableCell className="text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(b.commission)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={4} className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-bold">{formatINR(sumSales)}</TableCell>
                    <TableCell className="text-right" />
                    <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {formatINR(sumCommission)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Auto-credit note */}
      <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 flex gap-3">
        <Info className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold text-foreground">How agent commission works</p>
          <p className="text-muted-foreground mt-1 leading-relaxed">
            For every booking you create on behalf of a client, a commission of{' '}
            <span className="font-semibold text-emerald-700 dark:text-emerald-300">
              {stats?.commissionRate ?? 0}%
            </span>{' '}
            of the total amount is automatically credited to your wallet the moment the client&apos;s
            payment is verified. Commission only accrues on paid bookings — pending bookings contribute
            nothing until settled.
          </p>
        </div>
      </div>
    </div>
  )
}
