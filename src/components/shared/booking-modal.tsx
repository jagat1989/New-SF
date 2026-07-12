'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plane, Users, Minus, Plus, Loader2, ArrowRight } from 'lucide-react'
import { api, formatINR, formatDate } from '@/lib/api'
import type { FixedDeparture } from '@/lib/types'
import { QrPaymentModal } from '@/components/shared/qr-payment-modal'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  departure: FixedDeparture | null
  defaultPassengerName?: string
  defaultPassengerEmail?: string
  defaultPassengerPhone?: string
  agentMode?: boolean
  onBooked?: () => void
}

export function BookingModal({
  open, onOpenChange, departure,
  defaultPassengerName = '', defaultPassengerEmail = '', defaultPassengerPhone = '',
  agentMode = false, onBooked,
}: Props) {
  const [seats, setSeats] = React.useState(1)
  const [pax, setPax] = React.useState({ name: defaultPassengerName, email: defaultPassengerEmail, phone: defaultPassengerPhone, type: 'ADULT' })
  const [submitting, setSubmitting] = React.useState(false)
  const [bookingId, setBookingId] = React.useState<string | null>(null)
  const [qrOpen, setQrOpen] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setSeats(1)
      setPax({ name: defaultPassengerName, email: defaultPassengerEmail, phone: defaultPassengerPhone, type: 'ADULT' })
      setBookingId(null)
    }
  }, [open, defaultPassengerName, defaultPassengerEmail, defaultPassengerPhone])

  if (!departure) return null
  const flight = departure.flight
  const remaining = departure.availableSeats - departure.bookedSeats
  const total = departure.sellingPrice * seats

  const submit = async () => {
    if (!pax.name.trim() || !pax.email.trim()) {
      toast.error('Passenger name and email are required')
      return
    }
    if (seats > remaining) {
      toast.error(`Only ${remaining} seats available`)
      return
    }
    setSubmitting(true)
    try {
      const res = await api.bookings.create({
        fixedDepartureId: departure.id,
        passengerName: pax.name,
        passengerEmail: pax.email,
        passengerPhone: pax.phone,
        passengerType: pax.type,
        seats,
      })
      setBookingId(res.booking.id)
      setQrOpen(true)
      toast.success('Booking created! Complete payment to confirm.')
      onBooked?.()
    } catch (e: any) {
      toast.error(e.message || 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Dialog open={open && !qrOpen} onOpenChange={(o) => { onOpenChange(o); if (!o) setBookingId(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" /> Book Flight
            </DialogTitle>
            <DialogDescription>
              {agentMode ? 'Create a booking for your client' : 'Enter passenger details to book'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Flight summary */}
            <div className="rounded-xl border border-border bg-gradient-to-br from-accent/40 to-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{flight.airlineCode} {flight.flightNumber}</span>
                  <Badge variant="outline" className="text-[10px]">{flight.cabinClass}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">{flight.airline}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold">{flight.departureTime}</p>
                  <p className="text-xs text-muted-foreground">{flight.origin} · {flight.originCity}</p>
                </div>
                <div className="flex-1 mx-3 relative">
                  <div className="border-t border-dashed border-muted-foreground/40" />
                  <Plane className="h-3.5 w-3.5 absolute -top-1.5 left-1/2 -translate-x-1/2 text-primary" />
                  <p className="text-[10px] text-center text-muted-foreground mt-1">{flight.durationMins}m · {flight.aircraft}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">{flight.arrivalTime}</p>
                  <p className="text-xs text-muted-foreground">{flight.destination} · {flight.destinationCity}</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{formatDate(departure.departureDate)}</span>
                <span className="font-medium text-emerald-600">{remaining} seats left</span>
              </div>
            </div>

            {/* Passenger */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label className="text-xs font-medium text-muted-foreground">Passenger name *</Label>
                  <Input value={pax.name} onChange={(e) => setPax({ ...pax, name: e.target.value })} placeholder="Full name as per ID" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Email *</Label>
                  <Input type="email" value={pax.email} onChange={(e) => setPax({ ...pax, email: e.target.value })} placeholder="email@example.com" />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Phone</Label>
                  <Input value={pax.phone} onChange={(e) => setPax({ ...pax, phone: e.target.value })} placeholder="+91..." />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Passenger type</Label>
                  <Select value={pax.type} onValueChange={(v) => setPax({ ...pax, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ADULT">Adult</SelectItem>
                      <SelectItem value="CHILD">Child</SelectItem>
                      <SelectItem value="INFANT">Infant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Seats</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setSeats((s) => Math.max(1, s - 1))}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-8 text-center font-bold">{seats}</span>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setSeats((s) => Math.min(remaining, s + 1))}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="rounded-lg bg-muted p-3 space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Base price × {seats}</span>
                <span>{formatINR(departure.sellingPrice)} × {seats}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1.5 border-t border-border/60">
                <span>Total</span>
                <span className="text-primary">{formatINR(total)}</span>
              </div>
            </div>

            <Button onClick={submit} disabled={submitting} className="w-full h-11 sky-gradient text-white">
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating booking…</>
              ) : (
                <>Proceed to QR Payment <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QrPaymentModal
        open={qrOpen}
        onOpenChange={(o) => {
          setQrOpen(o)
          if (!o) {
            onOpenChange(false)
            onBooked?.()
          }
        }}
        bookingId={bookingId}
        onPaid={onBooked}
      />
    </>
  )
}
