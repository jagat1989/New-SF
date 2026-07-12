'use client'

import type { Booking } from '@/lib/types'
import { formatINR, formatDate } from '@/lib/api'
import { TICKET_TERMS, TICKET_FOOTER_NOTE } from '@/lib/ticket-terms'

/**
 * Generates a self-contained, print-ready HTML document for an e-ticket
 * and opens it in a new window, then triggers the browser's print dialog.
 */
export function printTicket(booking: Booking) {
  const flight = booking.flight
  const dep = booking.fixedDeparture
  const paid = booking.paymentStatus === 'PAID'

  // deterministic pseudo-barcode from the booking reference
  let seed = 0
  for (let i = 0; i < booking.reference.length; i++) seed = (seed * 31 + booking.reference.charCodeAt(i)) >>> 0
  const bars = Array.from({ length: 48 }, (_, i) => {
    const w = ((seed >> (i % 24)) ^ (i * 7)) & 7
    return w % 2 === 0
  })
    .map((on) => (on ? '<span class="b-on"></span>' : '<span class="b-off"></span>'))
    .join('')

  const statusColor = paid ? '#059669' : '#d97706'
  const statusLabel = paid ? 'CONFIRMED' : 'PENDING PAYMENT'

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>E-Ticket ${booking.reference} — Special Fare</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: #f1f5f9;
    color: #0f172a;
    padding: 24px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .ticket {
    max-width: 720px;
    margin: 0 auto;
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
  }
  .stub { display: flex; }
  .main { flex: 1; padding: 28px 32px; }
  .side {
    width: 150px;
    background: linear-gradient(135deg, #0d9488 0%, #0891b2 100%);
    color: #fff;
    padding: 28px 16px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    text-align: center;
  }
  .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  .brand-logo {
    width: 28px; height: 28px; border-radius: 8px;
    background: #fff; color: #0d9488;
    display: flex; align-items: center; justify-content: center;
    font-weight: 800; font-size: 14px;
  }
  .brand-name { font-weight: 800; letter-spacing: 0.5px; font-size: 15px; }
  .sub { font-size: 10px; opacity: 0.85; }
  .pnr-label { font-size: 10px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
  .pnr { font-family: "Courier New", monospace; font-weight: 700; font-size: 18px; letter-spacing: 2px; margin-top: 2px; }
  .status {
    display: inline-block; padding: 4px 10px; border-radius: 999px;
    font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
    background: ${statusColor}20; color: ${statusColor};
    margin-top: 12px;
  }
  h1 { font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
  .route { display: flex; align-items: center; justify-content: space-between; margin: 8px 0 20px; }
  .city { text-align: center; }
  .code { font-size: 28px; font-weight: 800; letter-spacing: 0.5px; }
  .name { font-size: 11px; color: #64748b; margin-top: 2px; }
  .time { font-size: 14px; font-weight: 700; margin-top: 6px; }
  .path { flex: 1; position: relative; margin: 0 16px; padding-top: 14px; }
  .path-line { border-top: 2px dashed #cbd5e1; }
  .path-icon { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); font-size: 16px; }
  .path-dur { font-size: 10px; text-align: center; color: #64748b; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 16px 0; }
  .cell { background: #f8fafc; border-radius: 8px; padding: 10px 12px; }
  .cell-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .cell-value { font-size: 13px; font-weight: 700; margin-top: 2px; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-top: 1px solid #e2e8f0; }
  .row:first-of-type { border-top: none; }
  .row-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
  .row-value { font-size: 13px; font-weight: 700; }
  .fare { color: #0d9488; }
  .barcode {
    background: #fff; border: 1px dashed #cbd5e1; border-radius: 8px;
    padding: 14px; text-align: center; margin-top: 16px;
  }
  .bars { display: flex; justify-content: center; align-items: flex-end; height: 44px; gap: 1px; }
  .b-on { display: inline-block; width: 3px; height: 100%; background: #0f172a; }
  .b-off { display: inline-block; width: 3px; height: 100%; background: transparent; }
  .ref { font-family: "Courier New", monospace; font-size: 12px; letter-spacing: 4px; margin-top: 6px; color: #475569; }
  .note { font-size: 10px; color: #94a3b8; text-align: center; margin-top: 12px; }
  .side-foot { font-size: 9px; opacity: 0.75; }
  .side-amount { font-size: 16px; font-weight: 800; }
  .side-amount-label { font-size: 9px; opacity: 0.8; text-transform: uppercase; letter-spacing: 1px; }
  .btn-print {
    display: block; margin: 16px auto 0; padding: 10px 24px;
    background: #0d9488; color: #fff; border: none; border-radius: 8px;
    font-size: 13px; font-weight: 600; cursor: pointer;
  }
  .btn-print:hover { background: #0f766e; }
  .tc-section {
    max-width: 720px;
    margin: 20px auto 0;
    background: #fff;
    border-radius: 12px;
    padding: 20px 28px;
    box-shadow: 0 2px 12px rgba(15, 23, 42, 0.05);
    page-break-inside: avoid;
  }
  .tc-title {
    font-size: 13px;
    font-weight: 800;
    color: #0f172a;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 2px solid #0d9488;
    padding-bottom: 6px;
    margin-bottom: 12px;
  }
  .tc-intro { font-size: 10px; color: #64748b; margin-bottom: 10px; line-height: 1.5; }
  .tc-list { list-style: none; padding: 0; margin: 0; }
  .tc-list li { margin-bottom: 8px; font-size: 9.5px; line-height: 1.5; color: #334155; }
  .tc-list .tc-h {
    display: inline;
    font-weight: 700;
    color: #0f172a;
  }
  .tc-list .tc-n {
    display: inline-block;
    min-width: 18px;
    color: #0d9488;
    font-weight: 700;
  }
  .tc-footer {
    margin-top: 12px;
    padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    font-size: 9px;
    color: #94a3b8;
    text-align: center;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .ticket { box-shadow: none; max-width: 100%; }
    .tc-section { box-shadow: none; page-break-before: always; }
    .btn-print { display: none; }
    @page { margin: 12mm; }
  }
</style>
</head>
<body>
  <div class="ticket">
    <div class="stub">
      <div class="main">
        <div class="brand">
          <div class="brand-logo">SF</div>
          <div>
            <div class="brand-name">SPECIAL FARE</div>
            <div class="sub">E-Ticket / Boarding Pass</div>
          </div>
          <span class="status">${statusLabel}</span>
        </div>

        <h1>Flight</h1>
        <div style="font-size:15px;font-weight:700;">${flight.airlineCode} ${flight.flightNumber} · ${flight.airline}</div>

        <h1 style="margin-top:18px;">Route</h1>
        <div class="route">
          <div class="city">
            <div class="code">${flight.origin}</div>
            <div class="name">${flight.originCity}</div>
            <div class="time">${flight.departureTime}</div>
          </div>
          <div class="path">
            <div class="path-line"></div>
            <div class="path-icon">✈</div>
            <div class="path-dur">${Math.floor(flight.durationMins / 60)}h ${flight.durationMins % 60}m · ${flight.aircraft}</div>
          </div>
          <div class="city">
            <div class="code">${flight.destination}</div>
            <div class="name">${flight.destinationCity}</div>
            <div class="time">${flight.arrivalTime}</div>
          </div>
        </div>

        <div class="grid">
          <div class="cell">
            <div class="cell-label">Passenger</div>
            <div class="cell-value">${escapeHtml(booking.passengerName)}</div>
          </div>
          <div class="cell">
            <div class="cell-label">Departure</div>
            <div class="cell-value">${dep ? formatDate(dep.departureDate) : '—'}</div>
          </div>
          <div class="cell">
            <div class="cell-label">Seat(s)</div>
            <div class="cell-value">${booking.seats}</div>
          </div>
          <div class="cell">
            <div class="cell-label">Cabin</div>
            <div class="cell-value">${flight.cabinClass}</div>
          </div>
        </div>

        <div class="row">
          <span class="row-label">Passenger type</span>
          <span class="row-value">${booking.passengerType}</span>
        </div>
        <div class="row">
          <span class="row-label">Baggage</span>
          <span class="row-value">${flight.baggage || '20kg checked + 7kg cabin'}</span>
        </div>
        <div class="row">
          <span class="row-label">Fare (${formatINR(booking.unitPrice)} × ${booking.seats})</span>
          <span class="row-value fare">${formatINR(booking.totalAmount)}</span>
        </div>
        ${booking.commission > 0 ? `<div class="row"><span class="row-label">Agent commission</span><span class="row-value">${formatINR(booking.commission)}</span></div>` : ''}
        <div class="row">
          <span class="row-label">Booked by</span>
          <span class="row-value">${booking.bookedByRole}</span>
        </div>
        <div class="row">
          <span class="row-label">Booking date</span>
          <span class="row-value">${formatDate(booking.createdAt)}</span>
        </div>

        <div class="barcode">
          <div class="bars">${bars}</div>
          <div class="ref">${booking.reference}</div>
        </div>

        <p class="note">${TICKET_FOOTER_NOTE}</p>
      </div>

      <div class="side">
        <div>
          <div class="pnr-label">PNR</div>
          <div class="pnr">${booking.reference}</div>
        </div>
        <div>
          <div class="side-amount-label">Total paid</div>
          <div class="side-amount">${formatINR(booking.totalAmount)}</div>
          <div class="sub" style="margin-top:4px;">${flight.cabinClass}</div>
        </div>
        <div class="side-foot">Special Fare<br/>Flight Platform</div>
      </div>
    </div>
  </div>

  <!-- Terms & Conditions -->
  <div class="tc-section">
    <div class="tc-title">Terms &amp; Conditions of Carriage</div>
    <p class="tc-intro">Carriage and other services provided by the carrier are subject to its conditions of carriage and related regulations. Passengers are advised to read the following terms carefully before travel. By using this e-ticket, the passenger acknowledges acceptance of these conditions.</p>
    <ol class="tc-list">
      ${TICKET_TERMS.map(
        (t, i) =>
          `<li><span class="tc-n">${i + 1}.</span> <span class="tc-h">${escapeHtml(t.title)}.</span> ${escapeHtml(t.body)}</li>`,
      ).join('')}
    </ol>
    <div class="tc-footer">This is an electronically generated document and does not require a physical signature. &copy; 2025 Special Fare. All carriage is governed by the airline's conditions of carriage and DGCA regulations.</div>
  </div>

  <button class="btn-print" onclick="window.print()">🖨 Print this ticket</button>
  <script>
    // auto-trigger print after the window loads
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 300);
    });
  </script>
</body>
</html>`

  const w = window.open('', '_blank', 'width=820,height=900')
  if (!w) {
    alert('Please allow pop-ups to print your e-ticket.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
