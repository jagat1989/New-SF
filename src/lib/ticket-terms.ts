/**
 * Indian Airlines — standard terms & conditions shown on e-tickets.
 * Shared by the on-screen TicketDialog and the printable print-ticket.ts.
 *
 * Kept as plain strings so they can be rendered in both React (JSX) and the
 * standalone HTML print document.
 */

export interface TcItem {
  title: string
  body: string
}

export const TICKET_TERMS: TcItem[] = [
  {
    title: 'Check-in & Boarding',
    body: 'Web check-in opens 48 hours and closes 1 hour before scheduled departure. Airport check-in counters close 45 minutes prior to departure for domestic and 60 minutes for international flights. Passengers must report at the boarding gate at least 25 minutes before departure. Boarding closes 15 minutes before departure — latecomers will be denied boarding with no refund.',
  },
  {
    title: 'Valid Identification',
    body: 'All passengers must carry a valid government-issued photo ID at check-in and boarding. Accepted IDs: Aadhaar Card, Passport, Voter ID, Driving Licence, PAN Card (with photo), or photo credit/debit card issued by a bank. For infants, a birth certificate is mandatory. The name on the ID must exactly match the name on this e-ticket.',
  },
  {
    title: 'Baggage Allowance',
    body: 'Free checked baggage: 15 kg per adult/child in Economy (25 kg on Airbus A320 family premium routes), 30 kg in Business, and 40 kg in First Class. Cabin baggage: 1 piece up to 7 kg (55 cm × 35 cm × 25 cm) plus a small laptop/handbag. Excess baggage is chargeable at ₹500 per kg or can be pre-purchased online at a discounted rate. Restricted items include liquids over 100 ml, sharp objects, lithium batteries above 100 Wh, and flammable materials.',
  },
  {
    title: 'Cancellations & Refunds',
    body: 'Cancellation charges: ₹3,500 or base fare (whichever is lower) per passenger per sector if cancelled more than 72 hours before departure; ₹4,000 or base fare within 72 hours. No refund for no-shows or cancellations within 2 hours of departure. Refunds for credit-shell bookings are processed to the original payment method within 7–10 working days. Taxes are refunded in full as per DGCA guidelines.',
  },
  {
    title: 'Date Change & Re-issue',
    body: 'Date changes are permitted up to 2 hours before departure subject to a change fee of ₹2,500 per passenger per sector plus the fare difference. Same-day flight changes on the same sector are allowed at ₹1,500 per passenger if seats are available. Fare differences are non-refundable if the new fare is lower.',
  },
  {
    title: 'Special Fare Conditions',
    body: 'This ticket is issued under a special fare category and is non-transferable and non-endorsable. Name changes are not permitted. The ticket is valid only for the passenger named above and only on the flight/date specified. Special fares are subject to limited inventory and may not be available on all flights or dates.',
  },
  {
    title: 'Refunds & No-show',
    body: 'In case of a no-show (failure to report for the booked flight), the entire ticket value will be forfeited and no refund will be processed. If you miss a connecting flight due to a delay on our airline, we will re-accommodate you on the next available flight at no additional charge, subject to seat availability.',
  },
  {
    title: 'Flight Delays, Cancellations & Denied Boarding',
    body: 'If a flight is cancelled by the airline, passengers are entitled to a full refund or rebooking on the next available flight at no extra cost, plus compensation as per DGCA Civil Aviation Requirement (CAR) Section 3 — Series M Part III. For delays over 2 hours, complimentary meals/snacks are provided; over 4 hours, a full refund is offered if the passenger chooses not to travel. Denied boarding due to overbooking entitles passengers to compensation of up to ₹20,000 or an alternate flight, whichever is chosen.',
  },
  {
    title: 'Infants, Children & Unaccompanied Minors',
    body: 'Infants (under 2 years) travel at 10% of the adult fare on a lap and do not get a separate seat. Children (2–12 years) are charged the applicable child fare. Unaccompanied minors (5–12 years) require a mandatory UM service request at least 48 hours before departure, with a service fee of ₹1,500 per sector.',
  },
  {
    title: 'Health & Medical',
    body: 'Passengers with contagious diseases, recent surgery, or conditions requiring medical clearance must obtain a "Fit to Fly" certificate from a registered medical practitioner. Pregnant passengers are permitted to fly up to the 36th week for single pregnancies (32nd week for multiples) with a doctor’s certificate after the 28th week. MEDIF forms must be submitted 72 hours before departure.',
  },
  {
    title: 'Security & Dangerous Goods',
    body: 'In accordance with BCAS and DGCA regulations, the following are strictly prohibited: firearms, ammunition, explosives, compressed gases, flammable liquids/solids, oxidizers, poisons, radioactive materials, and corrosives. Power banks must be carried in cabin baggage only (max 100 Wh) and never in checked baggage. Lithium-ion spare batteries are limited to 2 per passenger.',
  },
  {
    title: 'Governing Law & Jurisdiction',
    body: 'Carriage is subject to the Carriage by Air Act 1972, the Aircraft Act 1934, and DGCA Civil Aviation Requirements. These conditions of carriage, together with the fare rules applicable to this ticket, constitute the entire agreement. Disputes are subject to the exclusive jurisdiction of the courts at the airline’s registered office in India.',
  },
]

export const TICKET_FOOTER_NOTE =
  'Please arrive at the airport 2 hours before departure. Carry a valid government-issued photo ID. This e-ticket must be presented at check-in.'
