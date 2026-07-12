'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  Plane,
  Plus,
  Calendar,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  Wallet,
  Ticket,
  Building2,
  Loader2,
  ArrowRight,
  Search,
  Filter,
  ShieldAlert,
  TrendingUp,
  MapPin,
  Clock,
  Users,
} from 'lucide-react'

import { api, formatINR, formatDate, formatDateTime } from '@/lib/api'
import type { Flight, FixedDeparture, Booking } from '@/lib/types'
import { CITY_AIRPORTS, CABIN_CLASSES } from '@/lib/types'
import { useAuth } from '@/store/auth'
import { StatCard, StatusBadge, SectionHeader, EmptyState } from '@/components/shared/ui'
import { AirportCombobox } from '@/components/shared/airport-combobox'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

/* ------------------------------------------------------------------ */
/*  Flight form (reusable for create + edit)                          */
/* ------------------------------------------------------------------ */

interface FlightFormValues {
  flightNumber: string
  airline: string
  airlineCode: string
  origin: string
  originCity: string
  destination: string
  destinationCity: string
  departureTime: string
  arrivalTime: string
  durationMins: string
  aircraft: string
  totalSeats: string
  basePrice: string
  cabinClass: string
  baggage: string
}

function emptyFlightForm(company?: string | null): FlightFormValues {
  return {
    flightNumber: '',
    airline: company || '',
    airlineCode: '',
    origin: '',
    originCity: '',
    destination: '',
    destinationCity: '',
    departureTime: '06:00',
    arrivalTime: '08:00',
    durationMins: '120',
    aircraft: 'A320',
    totalSeats: '150',
    basePrice: '4500',
    cabinClass: 'ECONOMY',
    baggage: '20kg checked + 7kg cabin',
  }
}

function flightToForm(f: Flight): FlightFormValues {
  return {
    flightNumber: f.flightNumber,
    airline: f.airline,
    airlineCode: f.airlineCode,
    origin: f.origin,
    originCity: f.originCity,
    destination: f.destination,
    destinationCity: f.destinationCity,
    departureTime: f.departureTime,
    arrivalTime: f.arrivalTime,
    durationMins: String(f.durationMins),
    aircraft: f.aircraft,
    totalSeats: String(f.totalSeats),
    basePrice: String(f.basePrice),
    cabinClass: f.cabinClass,
    baggage: f.baggage,
  }
}

function FlightForm({
  initial,
  submitting,
  onSubmit,
}: {
  initial: FlightFormValues
  submitting: boolean
  onSubmit: (v: FlightFormValues) => void
}) {
  const [v, setV] = React.useState<FlightFormValues>(initial)

  const set = <K extends keyof FlightFormValues>(k: K, val: FlightFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }))

  const handleOrigin = (code: string) => {
    const city = CITY_AIRPORTS.find((c) => c.code === code)?.city || ''
    setV((prev) => ({ ...prev, origin: code, originCity: city }))
  }
  const handleDestination = (code: string) => {
    const city = CITY_AIRPORTS.find((c) => c.code === code)?.city || ''
    setV((prev) => ({ ...prev, destination: code, destinationCity: city }))
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!v.flightNumber || !v.origin || !v.destination || !v.basePrice) {
      toast.error('Flight number, origin, destination & base price are required')
      return
    }
    if (v.origin === v.destination) {
      toast.error('Origin and destination must differ')
      return
    }
    onSubmit(v)
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Flight Number *">
          <Input
            placeholder="SW 101"
            value={v.flightNumber}
            onChange={(e) => set('flightNumber', e.target.value)}
          />
        </Field>
        <Field label="Airline">
          <Input
            placeholder="SkyWings Airlines"
            value={v.airline}
            onChange={(e) => set('airline', e.target.value)}
          />
        </Field>
        <Field label="Airline Code">
          <Input
            placeholder="SW"
            value={v.airlineCode}
            onChange={(e) => set('airlineCode', e.target.value.toUpperCase())}
            maxLength={3}
          />
        </Field>
        <Field label="Cabin Class">
          <Select value={v.cabinClass} onValueChange={(val) => set('cabinClass', val)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select cabin" />
            </SelectTrigger>
            <SelectContent>
              {CABIN_CLASSES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Separator />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <MapPin className="h-3.5 w-3.5" /> Route
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Origin Airport *">
          <AirportCombobox
            value={v.origin}
            onValueChange={handleOrigin}
            placeholder="Select origin"
            exclude={v.destination}
            triggerClassName="h-9"
          />
        </Field>
        <Field label="Origin City">
          <Input
            placeholder="New Delhi"
            value={v.originCity}
            onChange={(e) => set('originCity', e.target.value)}
          />
        </Field>
        <Field label="Destination Airport *">
          <AirportCombobox
            value={v.destination}
            onValueChange={handleDestination}
            placeholder="Select destination"
            exclude={v.origin}
            triggerClassName="h-9"
          />
        </Field>
        <Field label="Destination City">
          <Input
            placeholder="Mumbai"
            value={v.destinationCity}
            onChange={(e) => set('destinationCity', e.target.value)}
          />
        </Field>
      </div>

      <Separator />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5" /> Schedule
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Field label="Departure">
          <Input
            type="time"
            value={v.departureTime}
            onChange={(e) => set('departureTime', e.target.value)}
          />
        </Field>
        <Field label="Arrival">
          <Input
            type="time"
            value={v.arrivalTime}
            onChange={(e) => set('arrivalTime', e.target.value)}
          />
        </Field>
        <Field label="Duration (min)">
          <Input
            type="number"
            min={1}
            value={v.durationMins}
            onChange={(e) => set('durationMins', e.target.value)}
          />
        </Field>
        <Field label="Aircraft">
          <Input
            placeholder="A320"
            value={v.aircraft}
            onChange={(e) => set('aircraft', e.target.value)}
          />
        </Field>
      </div>

      <Separator />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Total Seats">
          <Input
            type="number"
            min={1}
            value={v.totalSeats}
            onChange={(e) => set('totalSeats', e.target.value)}
          />
        </Field>
        <Field label="Base Price (₹) *">
          <Input
            type="number"
            min={0}
            value={v.basePrice}
            onChange={(e) => set('basePrice', e.target.value)}
          />
        </Field>
        <Field label="Baggage">
          <Input
            placeholder="20kg checked + 7kg cabin"
            value={v.baggage}
            onChange={(e) => set('baggage', e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter className="pt-2">
        <Button type="submit" disabled={submitting} className="sky-gradient text-white">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            'Save Flight'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Departure form (reusable)                                         */
/* ------------------------------------------------------------------ */

interface DepartureFormValues {
  flightId: string
  departureDate: string
  availableSeats: string
  costPrice: string
  sellingPrice: string
  status: string
}

function DepartureForm({
  initial,
  flights,
  submitting,
  onSubmit,
}: {
  initial: DepartureFormValues
  flights: Flight[]
  submitting: boolean
  onSubmit: (v: DepartureFormValues) => void
}) {
  const [v, setV] = React.useState<DepartureFormValues>(initial)
  const set = <K extends keyof DepartureFormValues>(k: K, val: DepartureFormValues[K]) =>
    setV((prev) => ({ ...prev, [k]: val }))

  const cost = Number(v.costPrice) || 0
  const sell = Number(v.sellingPrice) || 0
  const markup = sell - cost
  const markupPct = cost > 0 ? Math.round((markup / cost) * 100) : 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!v.flightId) return toast.error('Select a flight')
    if (!v.departureDate) return toast.error('Departure date is required')
    if (sell <= 0 || cost <= 0) return toast.error('Prices must be greater than 0')
    if (sell < cost) return toast.error('Selling price cannot be less than cost price')
    onSubmit(v)
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Flight *">
        <Select value={v.flightId} onValueChange={(val) => set('flightId', val)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a flight from your inventory" />
          </SelectTrigger>
          <SelectContent>
            {flights.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No flights in inventory. Add a flight first.
              </div>
            ) : (
              flights.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.airlineCode} {f.flightNumber} · {f.origin}→{f.destination}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Departure Date *">
          <Input
            type="date"
            min={today}
            value={v.departureDate}
            onChange={(e) => set('departureDate', e.target.value)}
          />
        </Field>
        <Field label="Available Seats">
          <Input
            type="number"
            min={1}
            value={v.availableSeats}
            onChange={(e) => set('availableSeats', e.target.value)}
          />
        </Field>
      </div>

      <Separator />
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5" /> Pricing
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Cost Price (₹) — net cost">
          <Input
            type="number"
            min={0}
            value={v.costPrice}
            onChange={(e) => set('costPrice', e.target.value)}
          />
        </Field>
        <Field label="Selling Price (₹)">
          <Input
            type="number"
            min={0}
            value={v.sellingPrice}
            onChange={(e) => set('sellingPrice', e.target.value)}
          />
        </Field>
      </div>

      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">Markup per seat</p>
          <p className="text-lg font-bold text-foreground">{formatINR(markup)}</p>
        </div>
        <Badge
          className={
            markupPct >= 20
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
          }
        >
          {markupPct}% margin
        </Badge>
      </div>

      {initial.status && (
        <Field label="Status">
          <Select value={v.status} onValueChange={(val) => set('status', val)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="SOLD_OUT">Sold Out</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      <DialogFooter className="pt-2">
        <Button type="submit" disabled={submitting} className="sky-gradient text-white">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…
            </>
          ) : (
            'Save Departure'
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                     */
/* ------------------------------------------------------------------ */

function RowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

function RouteCell({ origin, originCity, destination, destinationCity }: {
  origin: string; originCity: string; destination: string; destinationCity: string
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <div className="text-right">
        <p className="font-bold text-foreground leading-none">{origin}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{originCity}</p>
      </div>
      <div className="flex items-center gap-0.5 text-muted-foreground">
        <span className="h-px w-4 bg-border" />
        <Plane className="h-3 w-3 text-primary" />
        <span className="h-px w-4 bg-border" />
      </div>
      <div className="text-left">
        <p className="font-bold text-foreground leading-none">{destination}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{destinationCity}</p>
      </div>
    </div>
  )
}

function SeatProgress({ booked, available }: { booked: number; available: number }) {
  const total = booked + available
  const pct = total > 0 ? Math.round((booked / total) * 100) : 0
  return (
    <div className="w-full min-w-[100px]">
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="text-muted-foreground">{booked}/{total}</span>
        <span className="font-semibold text-foreground">{pct}%</span>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main SupplierView                                                 */
/* ------------------------------------------------------------------ */

export function SupplierView({ active, setActive }: { active: string; setActive: (s: string) => void }) {
  const { user } = useAuth()

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-fade-in">
      {active === 'overview' && <OverviewSection setActive={setActive} />}
      {active === 'flights' && <FlightsSection />}
      {active === 'departures' && <DeparturesSection />}
      {active === 'bookings' && <BookingsSection />}
      {/* fallthrough if unknown tab */}
      {!['overview', 'flights', 'departures', 'bookings'].includes(active) && (
        <OverviewSection setActive={setActive} />
      )}
      {user && <span className="sr-only">Supplier: {user.company || user.name}</span>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Overview                                                          */
/* ------------------------------------------------------------------ */

function OverviewSection({ setActive }: { setActive: (s: string) => void }) {
  const [stats, setStats] = React.useState<any>(null)
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [s, b] = await Promise.all([api.stats(), api.bookings.list()])
      setStats(s)
      setBookings(b.bookings.slice(0, 5))
    } catch (e: any) {
      toast.error(e.message || 'Failed to load overview')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const openSeats = stats?.openSeats ?? 0
  const bookedSeats = stats?.bookedSeats ?? 0
  const totalSeats = openSeats + bookedSeats
  const fillPct = totalSeats > 0 ? Math.round((bookedSeats / totalSeats) * 100) : 0

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Supplier Dashboard"
        description="Pre-purchase inventory & fixed-departure performance at a glance."
      />

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            label="Total Flights"
            value={stats?.flights ?? 0}
            icon={Plane}
            hint="Pre-purchase inventory"
            accent="teal"
          />
          <StatCard
            label="Fixed Departures"
            value={stats?.departures ?? 0}
            icon={Calendar}
            hint="Published for agents & customers"
            accent="sky"
          />
          <StatCard
            label="Bookings Received"
            value={stats?.bookings ?? 0}
            icon={Ticket}
            hint="Across your inventory"
            accent="emerald"
          />
          <StatCard
            label="Gross Revenue"
            value={formatINR(stats?.grossRevenue ?? 0)}
            icon={Wallet}
            hint="Paid bookings (sell price)"
            accent="amber"
          />
          <StatCard
            label="Net Revenue"
            value={formatINR(stats?.netRevenue ?? 0)}
            icon={BarChart3}
            hint="After cost price"
            accent="violet"
          />
          <StatCard
            label="Wallet Balance"
            value={formatINR(stats?.balance ?? 0)}
            icon={Wallet}
            hint="Available to withdraw"
            accent="emerald"
          />
        </div>
      )}

      {/* Seats + inventory health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Seat Utilisation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Booked</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{bookedSeats}</p>
              </div>
              <div className="rounded-lg bg-sky-50 dark:bg-sky-950/40 p-3">
                <p className="text-[11px] uppercase text-muted-foreground">Open</p>
                <p className="text-2xl font-bold text-sky-600 dark:text-sky-400">{openSeats}</p>
              </div>
            </div>
            <Progress value={fillPct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {fillPct}% of published seats sold
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-border/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" /> Recent Bookings
              </CardTitle>
              <CardDescription className="text-xs">Latest activity on your inventory</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActive('bookings')}>
              View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : bookings.length === 0 ? (
              <EmptyState icon={Ticket} title="No bookings yet" description="Bookings on your inventory will appear here." />
            ) : (
              <ScrollArea className="max-h-80">
                <div className="divide-y divide-border">
                  {bookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground">{b.reference}</span>
                          <StatusBadge status={b.paymentStatus} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {b.passengerName} · {b.flight?.airlineCode} {b.flight?.flightNumber} ·{' '}
                          {b.flight?.origin}→{b.flight?.destination}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-foreground">{formatINR(b.totalAmount)}</p>
                        <p className="text-[10px] text-muted-foreground">{formatDate(b.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inventory health */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Inventory Health
          </CardTitle>
          <CardDescription className="text-xs">
            Seats sold vs available across all your fixed departures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {bookedSeats} sold · {openSeats} open · {totalSeats} total
            </span>
            <span className="font-semibold text-foreground">{fillPct}% utilisation</span>
          </div>
          <Progress value={fillPct} className="h-3" />
          <div className="flex items-center gap-4 pt-1 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-primary" /> Sold
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-muted" /> Available
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Flights                                                           */
/* ------------------------------------------------------------------ */

function FlightsSection() {
  const { user } = useAuth()
  const [flights, setFlights] = React.useState<Flight[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<Flight | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Flight | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.flights.list()
      setFlights(res.flights)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load flights')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (v: FlightFormValues) => {
    setSubmitting(true)
    try {
      await api.flights.create({
        flightNumber: v.flightNumber,
        airline: v.airline || user?.company || '',
        airlineCode: v.airlineCode,
        origin: v.origin,
        originCity: v.originCity,
        destination: v.destination,
        destinationCity: v.destinationCity,
        departureTime: v.departureTime,
        arrivalTime: v.arrivalTime,
        durationMins: Number(v.durationMins),
        aircraft: v.aircraft,
        totalSeats: Number(v.totalSeats),
        basePrice: Number(v.basePrice),
        cabinClass: v.cabinClass,
        baggage: v.baggage,
      })
      toast.success('Flight added to pre-purchase inventory')
      setCreateOpen(false)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to create flight')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (v: FlightFormValues) => {
    if (!editTarget) return
    setSubmitting(true)
    try {
      await api.flights.update(editTarget.id, {
        flightNumber: v.flightNumber,
        airline: v.airline,
        airlineCode: v.airlineCode,
        origin: v.origin,
        originCity: v.originCity,
        destination: v.destination,
        destinationCity: v.destinationCity,
        departureTime: v.departureTime,
        arrivalTime: v.arrivalTime,
        durationMins: Number(v.durationMins),
        aircraft: v.aircraft,
        totalSeats: Number(v.totalSeats),
        basePrice: Number(v.basePrice),
        cabinClass: v.cabinClass,
        baggage: v.baggage,
      })
      toast.success('Flight updated')
      setEditTarget(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update flight')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await api.flights.remove(deleteTarget.id)
      toast.success('Flight removed')
      setDeleteTarget(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete flight')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Pre-Purchase Flight Inventory"
        description="Your pre-purchase flight inventory available for fixed-departure publishing."
        action={
          <Button onClick={() => setCreateOpen(true)} className="sky-gradient text-white">
            <Plus className="h-4 w-4 mr-1.5" /> Add Flight
          </Button>
        }
      />

      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Flight</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead className="text-center">Seats</TableHead>
                <TableHead className="text-right">Base Price</TableHead>
                <TableHead className="text-center">Cabin</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <RowSkeleton cols={8} />
              ) : flights.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-2">
                    <EmptyState
                      icon={Plane}
                      title="No flights in inventory"
                      description="Add your first pre-purchase flight to start publishing fixed departures."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                flights.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg sky-gradient text-white flex items-center justify-center shrink-0">
                          <Plane className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {f.airlineCode} {f.flightNumber}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{f.airline}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <RouteCell
                        origin={f.origin}
                        originCity={f.originCity}
                        destination={f.destination}
                        destinationCity={f.destinationCity}
                      />
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-medium text-foreground">
                        {f.departureTime} → {f.arrivalTime}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{f.durationMins} min · {f.aircraft}</p>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold text-sm">{f.totalSeats}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatINR(f.basePrice)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {f.cabinClass}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={f.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditTarget(f)}
                          title="Edit flight"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                          onClick={() => setDeleteTarget(f)}
                          title="Delete flight"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" /> Add Pre-Purchase Flight
            </DialogTitle>
            <DialogDescription>
              Add a flight to your inventory. You can then publish fixed departures for agents & customers to book.
            </DialogDescription>
          </DialogHeader>
          <FlightForm
            initial={emptyFlightForm(user?.company)}
            submitting={submitting}
            onSubmit={handleCreate}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Flight
            </DialogTitle>
            <DialogDescription>
              {editTarget?.airlineCode} {editTarget?.flightNumber}
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <FlightForm
              initial={flightToForm(editTarget)}
              submitting={submitting}
              onSubmit={handleUpdate}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete flight?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{deleteTarget?.airlineCode} {deleteTarget?.flightNumber}</strong>{' '}
              ({deleteTarget?.origin}→{deleteTarget?.destination}) from your inventory. Any fixed departures
              linked to this flight may also be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Departures (Extranet)                                             */
/* ------------------------------------------------------------------ */

function DeparturesSection() {
  const [flights, setFlights] = React.useState<Flight[]>([])
  const [departures, setDepartures] = React.useState<FixedDeparture[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<FixedDeparture | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<FixedDeparture | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  // filters
  const [statusFilter, setStatusFilter] = React.useState<string>('ALL')
  const [search, setSearch] = React.useState('')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const [fd, fl] = await Promise.all([api.departures.list(), api.flights.list()])
      setDepartures(fd.departures)
      setFlights(fl.flights)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load departures')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (v: DepartureFormValues) => {
    setSubmitting(true)
    try {
      await api.departures.create({
        flightId: v.flightId,
        departureDate: v.departureDate,
        availableSeats: Number(v.availableSeats),
        costPrice: Number(v.costPrice),
        sellingPrice: Number(v.sellingPrice),
      })
      toast.success('Fixed departure published')
      setCreateOpen(false)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to publish departure')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdate = async (v: DepartureFormValues) => {
    if (!editTarget) return
    setSubmitting(true)
    try {
      await api.departures.update(editTarget.id, {
        departureDate: v.departureDate,
        availableSeats: Number(v.availableSeats),
        costPrice: Number(v.costPrice),
        sellingPrice: Number(v.sellingPrice),
        status: v.status,
      })
      toast.success('Departure updated')
      setEditTarget(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update departure')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (d: FixedDeparture) => {
    const next = d.status === 'OPEN' ? 'CLOSED' : 'OPEN'
    try {
      await api.departures.update(d.id, { status: next })
      toast.success(`Departure ${next === 'OPEN' ? 'reopened' : 'closed'}`)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to toggle status')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    try {
      await api.departures.remove(deleteTarget.id)
      toast.success('Departure removed')
      setDeleteTarget(null)
      await load()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete departure')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = departures.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const fn = `${d.flight?.airlineCode} ${d.flight?.flightNumber}`.toLowerCase()
      if (!fn.includes(q)) return false
    }
    return true
  })

  const emptyForm: DepartureFormValues = {
    flightId: '',
    departureDate: '',
    availableSeats: '30',
    costPrice: '',
    sellingPrice: '',
    status: '',
  }

  return (
    <div className="space-y-5">
      {/* Extranet banner */}
      <div className="rounded-xl sky-gradient text-white p-4 sm:p-5 flex items-start gap-3 shadow-md">
        <div className="rounded-lg bg-white/20 p-2 shrink-0">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold flex items-center gap-2 flex-wrap">
            Extranet · Fixed Departures
            <Badge className="bg-white/20 text-white border-0 text-[10px]">B2B</Badge>
          </p>
          <p className="text-xs text-white/85 mt-0.5">
            Publish pre-purchase seat inventory for agents &amp; customers. Set cost price, selling price and seat count — your markup is calculated automatically.
          </p>
        </div>
      </div>

      <SectionHeader
        title="Fixed Departures"
        description="Publish and manage seat inventory tied to your flights on specific dates."
        action={
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={flights.length === 0}
            className="sky-gradient text-white"
            title={flights.length === 0 ? 'Add a flight first' : 'Publish a new departure'}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Publish Fixed Departure
          </Button>
        }
      />

      {/* Filters */}
      <Card className="border-border/60">
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search flight number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="SOLD_OUT">Sold out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Flight</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead className="text-center">Seats</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Sell</TableHead>
                <TableHead className="text-right">Markup</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <RowSkeleton cols={9} />
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-2">
                    <EmptyState
                      icon={Calendar}
                      title={departures.length === 0 ? 'No fixed departures yet' : 'No departures match your filters'}
                      description={
                        departures.length === 0
                          ? 'Publish your first fixed departure to start selling seats.'
                          : 'Try clearing the search or status filter.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => {
                  const remaining = d.availableSeats - d.bookedSeats
                  return (
                    <TableRow key={d.id}>
                      <TableCell>
                        <p className="font-semibold text-sm text-foreground">
                          {d.flight?.airlineCode} {d.flight?.flightNumber}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{d.flight?.airline}</p>
                      </TableCell>
                      <TableCell>
                        {d.flight && (
                          <RouteCell
                            origin={d.flight.origin}
                            originCity={d.flight.originCity}
                            destination={d.flight.destination}
                            destinationCity={d.flight.destinationCity}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium text-foreground">{formatDate(d.departureDate)}</p>
                        <p className="text-[11px] text-muted-foreground">{d.flight?.departureTime}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-medium text-foreground">
                            {d.bookedSeats}/{d.availableSeats}
                          </span>
                          <SeatProgress booked={d.bookedSeats} available={remaining} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatINR(d.costPrice)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-foreground">
                        {formatINR(d.sellingPrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 text-[10px]">
                          +{formatINR(d.markup)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={d.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleStatus(d)}
                            disabled={d.status === 'SOLD_OUT'}
                            title={d.status === 'OPEN' ? 'Close departure' : 'Reopen departure'}
                          >
                            {d.status === 'OPEN' ? (
                              <ToggleRight className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditTarget(d)}
                            title="Edit departure"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                            onClick={() => setDeleteTarget(d)}
                            title="Delete departure"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" /> Publish Fixed Departure
            </DialogTitle>
            <DialogDescription>
              Allocate seat inventory for a specific date. Agents &amp; customers will see OPEN departures.
            </DialogDescription>
          </DialogHeader>
          <DepartureForm
            initial={emptyForm}
            flights={flights}
            submitting={submitting}
            onSubmit={handleCreate}
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" /> Edit Fixed Departure
            </DialogTitle>
            <DialogDescription>
              {editTarget?.flight?.airlineCode} {editTarget?.flight?.flightNumber} ·{' '}
              {editTarget && formatDate(editTarget.departureDate)}
            </DialogDescription>
          </DialogHeader>
          {editTarget && (
            <DepartureForm
              initial={{
                flightId: editTarget.flightId,
                departureDate: new Date(editTarget.departureDate).toISOString().slice(0, 10),
                availableSeats: String(editTarget.availableSeats),
                costPrice: String(editTarget.costPrice),
                sellingPrice: String(editTarget.sellingPrice),
                status: editTarget.status,
              }}
              flights={flights}
              submitting={submitting}
              onSubmit={handleUpdate}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete fixed departure?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the departure on{' '}
              <strong>{deleteTarget && formatDate(deleteTarget.departureDate)}</strong> for{' '}
              <strong>{deleteTarget?.flight?.airlineCode} {deleteTarget?.flight?.flightNumber}</strong>.
              {deleteTarget && deleteTarget.bookedSeats > 0 && (
                <span className="block mt-2 text-rose-600 dark:text-rose-400 font-medium">
                  ⚠ This departure has {deleteTarget.bookedSeats} existing booking(s). Deleting may orphan those bookings.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Bookings                                                          */
/* ------------------------------------------------------------------ */

function BookingsSection() {
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [loading, setLoading] = React.useState(true)
  const [paymentFilter, setPaymentFilter] = React.useState<string>('ALL')

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.bookings.list()
      setBookings(res.bookings)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  const filtered = bookings.filter((b) =>
    paymentFilter === 'ALL' ? true : b.paymentStatus === paymentFilter,
  )

  const pendingCount = bookings.filter((b) => b.paymentStatus === 'PENDING').length

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Bookings on Your Inventory"
        description="All bookings placed by customers & agents on your fixed departures."
        action={
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All payments</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {/* Note for pending bookings */}
      {pendingCount > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 flex items-start gap-2.5">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300">
            <strong>{pendingCount} pending payment{pendingCount > 1 ? 's' : ''}.</strong> Payment for these
            bookings is handled by the customer or agent who placed them via QR scan. You can view details
            but cannot mark them paid from the supplier extranet.
          </div>
        </div>
      )}

      <Card className="border-border/60">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead>Reference</TableHead>
                <TableHead>Passenger</TableHead>
                <TableHead>Flight</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead className="text-center">Seats</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead className="text-center">Payment</TableHead>
                <TableHead className="text-center">Booked By</TableHead>
                <TableHead>Booked On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <RowSkeleton cols={10} />
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="py-2">
                    <EmptyState
                      icon={Ticket}
                      title={bookings.length === 0 ? 'No bookings yet' : 'No bookings match your filter'}
                      description={
                        bookings.length === 0
                          ? 'Bookings on your fixed departures will appear here.'
                          : 'Try a different payment status filter.'
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-foreground">{b.reference}</span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium text-foreground">{b.passengerName}</p>
                      <p className="text-[11px] text-muted-foreground">{b.passengerEmail}</p>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs font-semibold text-foreground">
                        {b.flight?.airlineCode} {b.flight?.flightNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {b.flight?.origin}→{b.flight?.destination}
                      </p>
                    </TableCell>
                    <TableCell>
                      {b.fixedDeparture ? (
                        <span className="text-xs">{formatDate(b.fixedDeparture.departureDate)}</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="text-sm font-semibold">{b.seats}</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">{formatINR(b.totalAmount)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {b.commission > 0 ? formatINR(b.commission) : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <StatusBadge status={b.paymentStatus} />
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {b.bookedByRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[11px] text-muted-foreground">{formatDateTime(b.createdAt)}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
