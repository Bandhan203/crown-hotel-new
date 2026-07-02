/** Unified registration form types — single source for advance & walk-in. */

export type RegistrationMode = 'advance' | 'walk-in';

export interface AdvancePaymentRecord {
  id: number;
  amount: string;
  payment_method: string;
  paid_at: string | null;
  source: 'RESERVATION' | 'CHECK_IN' | 'OTHER';
  label: string;
  booking_ref?: string;
}

export interface RegistrationData {
  id: number;
  registration_id: number;
  registration_ref: string;
  mode: 'ADVANCE' | 'WALK_IN';
  status: string;
  registration_status: string;
  booking_id: number | null;
  booking_ref: string;
  guest_email: string;
  guest_phone: string;
  room_type_name: string;
  room_type_id: number | null;
  room_id: number | null;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  nights: number;
  adults: number;
  children: number;
  infants: number;
  contact_person: string;
  deposit_amount: string;
  advance_paid: string;
  advance_payments: AdvancePaymentRecord[];
  balance_due: string;
  payment_amount: string;
  payment_method: string;
  total_price: string;
  grand_total: string;
  currency: string;
  billing_type: string;
  business_date?: string;
  guest_type: string;
  purpose_of_visit: string;
  coming_from: string;
  extra_bed: number;
  rack_rate: string;
  offer_rate: string;
  discount_amount: string;
  special_requests: string;
  company_name: string;
  booking_source: string;
  arrival_time: string;
  id_type: string;
  id_number: string;
  registration_card: string | null;
  first_name: string;
  last_name: string;
  designation: string;
  date_of_birth: string;
  gender: string;
  nationality: string;
  country: string;
  address: string;
  occupation: string;
  place_of_issue: string;
  visa_no: string;
}

export const EMPTY_REGISTRATION: RegistrationData = {
  id: 0,
  registration_id: 0,
  registration_ref: '',
  mode: 'WALK_IN',
  status: 'DRAFT',
  registration_status: 'DRAFT',
  booking_id: null,
  booking_ref: '',
  guest_email: '',
  guest_phone: '',
  room_type_name: '',
  room_type_id: null,
  room_id: null,
  room_number: '',
  check_in_date: new Date().toISOString().split('T')[0],
  check_out_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
  nights: 1,
  adults: 1,
  children: 0,
  infants: 0,
  contact_person: '',
  deposit_amount: '0',
  advance_paid: '0',
  advance_payments: [],
  balance_due: '0',
  payment_amount: '0',
  payment_method: 'CASH',
  total_price: '0',
  grand_total: '0',
  currency: 'BDT',
  billing_type: 'GUEST',
  guest_type: '',
  purpose_of_visit: '',
  coming_from: '',
  extra_bed: 0,
  rack_rate: '',
  offer_rate: '',
  discount_amount: '0',
  special_requests: '',
  company_name: '',
  booking_source: 'WALK_IN',
  arrival_time: '',
  id_type: '',
  id_number: '',
  registration_card: null,
  first_name: '',
  last_name: '',
  designation: '',
  date_of_birth: '',
  gender: '',
  nationality: '',
  country: '',
  address: '',
  occupation: '',
  place_of_issue: '',
  visa_no: '',
};

export function buildRegistrationPayload(data: RegistrationData, roomId: string, roomTypeId?: string) {
  return {
    guest_email: data.guest_email,
    guest_type: data.guest_type,
    purpose_of_visit: data.purpose_of_visit,
    coming_from: data.coming_from,
    extra_bed: data.extra_bed,
    rack_rate: data.rack_rate,
    offer_rate: data.offer_rate,
    discount_amount: data.discount_amount,
    special_requests: data.special_requests,
    company_name: data.company_name,
    booking_source: data.booking_source,
    arrival_time: data.arrival_time || null,
    check_in_date: data.check_in_date || null,
    check_out_date: data.check_out_date || null,
    id_type: data.id_type,
    id_number: data.id_number,
    first_name: data.first_name,
    last_name: data.last_name,
    designation: data.designation,
    date_of_birth: data.date_of_birth || null,
    gender: data.gender,
    nationality: data.nationality,
    country: data.country,
    address: data.address,
    occupation: data.occupation,
    place_of_issue: data.place_of_issue,
    visa_no: data.visa_no,
    contact_person: data.contact_person,
    infants: data.infants,
    adults: data.adults,
    children: data.children,
    deposit_amount: data.deposit_amount,
    guest_phone: data.guest_phone,
    billing_type: data.billing_type || 'GUEST',
    room_type_id: roomTypeId ? Number(roomTypeId) : data.room_type_id,
    room_id: roomId ? Number(roomId) : data.room_id,
  };
}

export function hydrateRegistrationForm(api: Partial<RegistrationData>): RegistrationData {
  return {
    ...EMPTY_REGISTRATION,
    ...api,
    check_in_date: api.check_in_date ? String(api.check_in_date) : EMPTY_REGISTRATION.check_in_date,
    check_out_date: api.check_out_date ? String(api.check_out_date) : EMPTY_REGISTRATION.check_out_date,
    date_of_birth: api.date_of_birth ? String(api.date_of_birth) : '',
    arrival_time: api.arrival_time ? String(api.arrival_time).slice(0, 5) : '',
    rack_rate: api.rack_rate != null ? String(api.rack_rate) : '',
    offer_rate: api.offer_rate != null ? String(api.offer_rate) : '',
    discount_amount: api.discount_amount != null ? String(api.discount_amount) : '0',
    deposit_amount: api.deposit_amount != null ? String(api.deposit_amount) : '0',
    advance_paid: api.advance_paid != null ? String(api.advance_paid) : '0',
    advance_payments: api.advance_payments ?? [],
    balance_due: api.balance_due != null ? String(api.balance_due) : '0',
    payment_amount: api.payment_amount != null ? String(api.payment_amount) : '0',
    payment_method: api.payment_method || 'CASH',
    total_price: api.total_price != null ? String(api.total_price) : '0',
    grand_total: api.grand_total != null ? String(api.grand_total) : '0',
    registration_id: api.registration_id ?? api.id ?? 0,
  };
}
