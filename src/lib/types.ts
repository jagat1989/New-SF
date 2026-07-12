export type Role = 'ADMIN' | 'SUPPLIER' | 'AGENT' | 'CUSTOMER'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  phone?: string | null
  company?: string | null
  balance: number
  commissionRate: number
}

export interface Flight {
  id: string
  flightNumber: string
  airline: string
  airlineCode: string
  origin: string
  originCity: string
  destination: string
  destinationCity: string
  departureTime: string
  arrivalTime: string
  durationMins: number
  aircraft: string
  totalSeats: number
  basePrice: number
  cabinClass: string
  baggage: string
  supplierId: string
  supplier?: { id: string; name: string; company: string | null }
  status: string
  createdAt: string
}

export interface FixedDeparture {
  id: string
  flightId: string
  flight: Flight
  departureDate: string
  availableSeats: number
  bookedSeats: number
  costPrice: number
  sellingPrice: number
  markup: number
  status: string
  supplierId: string
  supplier?: { name: string; company: string | null }
  createdAt: string
}

export interface Booking {
  id: string
  reference: string
  flightId: string
  flight: Flight
  fixedDepartureId: string | null
  fixedDeparture: FixedDeparture | null
  userId: string
  user?: { id: string; name: string; email: string; role: string }
  bookedByRole: string
  passengerName: string
  passengerEmail: string
  passengerPhone: string | null
  passengerType: string
  seats: number
  unitPrice: number
  totalAmount: number
  commission: number
  status: string
  paymentStatus: string
  createdAt: string
  payments: Payment[]
}

export interface Payment {
  id: string
  bookingId: string
  userId: string
  amount: number
  method: string
  status: string
  qrPayload: string
  transactionId: string | null
  createdAt: string
}

export const CITY_AIRPORTS = [
  // North India
  { code: 'DEL', city: 'New Delhi', region: 'North', name: 'Indira Gandhi Intl' },
  { code: 'LKO', city: 'Lucknow', region: 'North', name: 'Chaudhary Charan Singh' },
  { code: 'VNS', city: 'Varanasi', region: 'North', name: 'Lal Bahadur Shastri' },
  { code: 'AGR', city: 'Agra', region: 'North', name: 'Kheria' },
  { code: 'KNU', city: 'Kanpur', region: 'North', name: 'Kanpur' },
  { code: 'IXD', city: 'Prayagraj', region: 'North', name: 'Bamrauli (Allahabad)' },
  { code: 'GOP', city: 'Gorakhpur', region: 'North', name: 'Mahayogi Gorakhnath' },
  { code: 'BEK', city: 'Bareilly', region: 'North', name: 'Trishul' },
  { code: 'JAI', city: 'Jaipur', region: 'North', name: 'Jaipur Intl' },
  { code: 'JOD', city: 'Jodhpur', region: 'North', name: 'Jodhpur' },
  { code: 'UDR', city: 'Udaipur', region: 'North', name: 'Maharana Pratap' },
  { code: 'IXJ', city: 'Jammu', region: 'North', name: 'Jammu' },
  { code: 'SXR', city: 'Srinagar', region: 'North', name: 'Sheikh ul-Alam' },
  { code: 'IXL', city: 'Leh', region: 'North', name: 'Kushok Bakula Rimpochee' },
  { code: 'DHM', city: 'Dharamshala', region: 'North', name: 'Gaggal' },
  { code: 'KUU', city: 'Kullu', region: 'North', name: 'Bhuntar' },
  { code: 'SLV', city: 'Shimla', region: 'North', name: 'Jubbarhatti' },
  { code: 'IXC', city: 'Chandigarh', region: 'North', name: 'Chandigarh Intl' },
  { code: 'DED', city: 'Dehradun', region: 'North', name: 'Jolly Grant' },
  { code: 'PGH', city: 'Pantnagar', region: 'North', name: 'Pantnagar' },

  // West India
  { code: 'BOM', city: 'Mumbai', region: 'West', name: 'Chhatrapati Shivaji Maharaj' },
  { code: 'PNQ', city: 'Pune', region: 'West', name: 'Pune' },
  { code: 'NAG', city: 'Nagpur', region: 'West', name: 'Dr. Babasaheb Ambedkar' },
  { code: 'AMD', city: 'Ahmedabad', region: 'West', name: 'Sardar Vallabhbhai Patel' },
  { code: 'BDQ', city: 'Vadodara', region: 'West', name: 'Vadodara' },
  { code: 'RAJ', city: 'Rajkot', region: 'West', name: 'Hirasar' },
  { code: 'IXU', city: 'Aurangabad', region: 'West', name: 'Chikkalthana' },
  { code: 'STV', city: 'Surat', region: 'West', name: 'Surat' },
  { code: 'BHU', city: 'Bhavnagar', region: 'West', name: 'Bhavnagar' },
  { code: 'JGA', city: 'Jamnagar', region: 'West', name: 'Jamnagar' },
  { code: 'BHO', city: 'Bhopal', region: 'West', name: 'Raja Bhoj' },
  { code: 'IDR', city: 'Indore', region: 'West', name: 'Devi Ahilyabai Holkar' },
  { code: 'JLR', city: 'Jabalpur', region: 'West', name: 'Dumna' },
  { code: 'GWL', city: 'Gwalior', region: 'West', name: 'Gwalior' },
  { code: 'HJR', city: 'Khajuraho', region: 'West', name: 'Khajuraho' },
  { code: 'RPR', city: 'Raipur', region: 'West', name: 'Swami Vivekananda' },
  { code: 'GOI', city: 'Goa (Dabolim)', region: 'West', name: 'Dabolim' },
  { code: 'GOX', city: 'Goa (Mopa)', region: 'West', name: 'Manohar Intl' },
  { code: 'IXG', city: 'Belagavi', region: 'West', name: 'Belgaum' },
  { code: 'HBX', city: 'Hubli', region: 'West', name: 'Hubballi' },
  { code: 'KLH', city: 'Kolhapur', region: 'West', name: 'Kolhapur' },
  { code: 'NDC', city: 'Nanded', region: 'West', name: 'Shri Guru Gobind Singh Ji' },

  // South India
  { code: 'BLR', city: 'Bengaluru', region: 'South', name: 'Kempegowda Intl' },
  { code: 'MAA', city: 'Chennai', region: 'South', name: 'Chennai Intl' },
  { code: 'HYD', city: 'Hyderabad', region: 'South', name: 'Rajiv Gandhi Intl' },
  { code: 'COK', city: 'Kochi', region: 'South', name: 'Cochin Intl' },
  { code: 'TRV', city: 'Thiruvananthapuram', region: 'South', name: 'Trivandrum Intl' },
  { code: 'CCJ', city: 'Kozhikode', region: 'South', name: 'Calicut Intl' },
  { code: 'CNN', city: 'Kannur', region: 'South', name: 'Kannur Intl' },
  { code: 'IXM', city: 'Madurai', region: 'South', name: 'Madurai' },
  { code: 'TRZ', city: 'Tiruchirappalli', region: 'South', name: 'Tiruchirappalli Intl' },
  { code: 'CJB', city: 'Coimbatore', region: 'South', name: 'Coimbatore Intl' },
  { code: 'IXE', city: 'Mangaluru', region: 'South', name: 'Mangaluru Intl' },
  { code: 'MYQ', city: 'Mysuru', region: 'South', name: 'Mysore' },
  { code: 'VTZ', city: 'Visakhapatnam', region: 'South', name: 'Visakhapatnam' },
  { code: 'VGA', city: 'Vijayawada', region: 'South', name: 'Vijayawada' },
  { code: 'TIR', city: 'Tirupati', region: 'South', name: 'Tirupati' },
  { code: 'RJA', city: 'Rajahmundry', region: 'South', name: 'Rajahmundry' },
  { code: 'PUT', city: 'Puttaparthi', region: 'South', name: 'Sri Sathya Sai' },
  { code: 'IXP', city: 'Puducherry', region: 'South', name: 'Puducherry' },

  // East & Northeast India
  { code: 'CCU', city: 'Kolkata', region: 'East', name: 'Netaji Subhas Chandra Bose' },
  { code: 'BBI', city: 'Bhubaneswar', region: 'East', name: 'Biju Patnaik Intl' },
  { code: 'IXA', city: 'Agartala', region: 'East', name: 'Maharaja Bir Bikram' },
  { code: 'IXS', city: 'Silchar', region: 'East', name: 'Silchar' },
  { code: 'GAU', city: 'Guwahati', region: 'East', name: 'Lokpriya Gopinath Bordoloi Intl' },
  { code: 'DIB', city: 'Dibrugarh', region: 'East', name: 'Dibrugarh' },
  { code: 'IXT', city: 'Tezpur', region: 'East', name: 'Tezpur' },
  { code: 'IXI', city: 'Lilabari', region: 'East', name: 'Lilabari' },
  { code: 'IXH', city: 'Aizawl', region: 'East', name: 'Lengpui' },
  { code: 'IMF', city: 'Imphal', region: 'East', name: 'Bir Tikendrajit Intl' },
  { code: 'DMU', city: 'Dimapur', region: 'East', name: 'Dimapur' },
  { code: 'SHL', city: 'Shillong', region: 'East', name: 'Umroi' },
  { code: 'IXZ', city: 'Port Blair', region: 'East', name: 'Veer Savarkar Intl' },
  { code: 'GAY', city: 'Gaya', region: 'East', name: 'Gaya' },
  { code: 'PAT', city: 'Patna', region: 'East', name: 'Jay Prakash Narayan' },
  { code: 'IXR', city: 'Ranchi', region: 'East', name: 'Birsa Munda' },
  { code: 'IXB', city: 'Bagdogra', region: 'East', name: 'Bagdogra' },
  { code: 'RUP', city: 'Kokrajhar', region: 'East', name: 'Rupsi' },
]

export const AIRPORT_REGIONS = ['All', 'North', 'West', 'South', 'East']

export const CABIN_CLASSES = ['ECONOMY', 'BUSINESS', 'FIRST']
