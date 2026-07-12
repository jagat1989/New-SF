'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScanLine, CheckCircle2, Loader2, Plane, Clock, ShieldCheck, Printer, Ticket } from 'lucide-react'
import { api, formatINR, formatDate } from '@/lib/api'
import type { Booking, Payment } from '@/lib/types'
import { printTicket } from '@/components/shared/print-ticket'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  bookingId: string | null
  onPaid?: () => void
}

export function QrPaymentModal({ open, onOpenChange, bookingId, onPaid }: Props) {
  const [loading, setLoading] = React.useState(false)
  const [verifying, setVerifying] = React.useState(false)
  const [qrDataUrl, setQrDataUrl] = React.useState<string | null>(null)
  const [payment, setPayment] = React.useState<Payment | null>(null)
  const [booking, setBooking] = React.useState<any>(null)
  const [paid, setPaid] = React.useState(false)
  const [txnId, setTxnId] = React.useState<string | null>(null)
  const [countdown, setCountdown] = React.useState(300) // 5 min

  const load = React.useCallback(async () => {
    if (!bookingId) return
    setLoading(true)
    setPaid(false)
    setTxnId(null)
    setCountdown(300)
    try {
      const res = await api.payments.qr(bookingId)
      setQrDataUrl(res.qrDataUrl)
      setPayment(res.payment)
      setBooking(res.booking)
      if (res.payment.status === 'PAID') {
        setPaid(true)
        setTxnId(res.payment.transactionId)
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to generate QR')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  React.useEffect(() => {
    if (open && bookingId) load()
    if (!open) {
      setQrDataUrl(null); setPayment(null); setBooking(null); setPaid(false); setTxnId(null)
    }
  }, [open, bookingId, load])

  React.useEffect(() => {
    if (!open || paid || countdown <= 0) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [open, paid, countdown])

  const verify = async () => {
    if (!payment) return
    setVerifying(true)
    try {
      const res = await api.payments.verify(payment.id)
      setPaid(true)
      setTxnId(res.transactionId)
      toast.success('Payment successful! Booking confirmed.')
      onPaid?.()
    } catch (e: any) {
      toast.error(e.message || 'Payment verification failed')
    } finally {
      setVerifying(false)
    }
  }

  // Fetch the full booking (with flight + fixedDeparture) and open the print window.
  const [printing, setPrinting] = React.useState(false)
  const handlePrint = async () => {
    if (!bookingId) return
    setPrinting(true)
    try {
      const { bookings } = await api.bookings.list()
      const full = bookings.find((b) => b.id === bookingId)
      if (!full) {
        toast.error('Could not load ticket details for printing')
        return
      }
      printTicket(full)
    } catch (e: any) {
      toast.error(e.message || 'Failed to open print preview')
    } finally {
      setPrinting(false)
    }
  }

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            QR Scan Payment
          </DialogTitle>
          <DialogDescription>
            Scan the QR with any UPI app to pay for your booking
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground mt-3">Generating secure QR…</p>
          </div>
        ) : paid ? (
          <div className="flex flex-col items-center py-6 text-center animate-fade-in">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mb-4">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-foreground">Payment Successful</p>
            <p className="text-sm text-muted-foreground mt-1">Your booking is confirmed</p>
            {txnId && (
              <div className="mt-4 w-full rounded-lg bg-muted p-3 text-left">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Transaction ID</span>
                  <span className="font-mono font-semibold">{txnId}</span>
                </div>
                {booking && (
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="text-muted-foreground">Booking Ref</span>
                    <span className="font-mono font-semibold">{booking.reference}</span>
                  </div>
                )}
                {booking && (
                  <div className="flex justify-between text-xs mt-1.5">
                    <span className="text-muted-foreground">Amount Paid</span>
                    <span className="font-bold text-emerald-600">{formatINR(booking.totalAmount)}</span>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-5">
              <Button variant="outline" onClick={handlePrint} disabled={printing}>
                {printing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Preparing…</>
                ) : (
                  <><Printer className="h-4 w-4 mr-2" /> Print Ticket</>
                )}
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Booking summary */}
            {booking && (
              <div className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Plane className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{booking.flight?.airlineCode} {booking.flight?.flightNumber}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">{booking.flight?.cabinClass}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-foreground">{booking.flight?.origin}</p>
                    <p className="text-muted-foreground">{booking.flight?.originCity}</p>
                  </div>
                  <div className="flex-1 mx-3 border-t border-dashed border-border relative">
                    <Plane className="h-3 w-3 absolute -top-1.5 left-1/2 -translate-x-1/2 text-primary rotate-90" />
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{booking.flight?.destination}</p>
                    <p className="text-muted-foreground">{booking.flight?.destinationCity}</p>
                  </div>
                </div>
              </div>
            )}

            {/* QR */}
            <div className="flex flex-col items-center">
              <div className="relative rounded-2xl border-2 border-primary/20 bg-white p-4 shadow-sm">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Payment QR" className="h-52 w-52" />
                ) : (
                  <div className="h-52 w-52 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 sky-gradient text-white text-[10px] font-bold px-3 py-1 rounded-full shadow flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> UPI Secure
                </div>
              </div>

              <div className="mt-5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                QR expires in <span className="font-mono font-semibold text-foreground">{mins}:{secs.toString().padStart(2, '0')}</span>
              </div>
            </div>

            {/* Amount */}
            <div className="rounded-lg bg-muted p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Amount to Pay</span>
              <span className="text-xl font-bold text-foreground">{formatINR(booking?.totalAmount || 0)}</span>
            </div>

            <div className="text-center text-xs text-muted-foreground">
              Open GPay / PhonePe / Paytm / BHIM and scan the QR above
            </div>

            {/* Simulate scan */}
            <Button onClick={verify} disabled={verifying} className="w-full h-11 sky-gradient text-white">
              {verifying ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying payment…</>
              ) : (
                <><ScanLine className="h-4 w-4 mr-2" /> I have scanned & paid</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
