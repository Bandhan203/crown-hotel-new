import type { Room, Guest, Folio, Transaction, InventoryItem, SystemConfig } from './types';
import type { Company, Agent, CommissionEntry, HousekeepingRecord } from './extendedTypes';

// 40 rooms across 4 floors
export const initialRooms: Room[] = [
  // Floor 1 — Standard Singles & Doubles
  { id: 'r101', number: '101', type: 'Single', floor: 1, status: 'occupied', ratePerNight: 2500, maxOccupancy: 1 },
  { id: 'r102', number: '102', type: 'Double', floor: 1, status: 'vacant', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r103', number: '103', type: 'Double', floor: 1, status: 'dirty', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r104', number: '104', type: 'Single', floor: 1, status: 'reserved', ratePerNight: 2500, maxOccupancy: 1 },
  { id: 'r105', number: '105', type: 'Double', floor: 1, status: 'vacant', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r106', number: '106', type: 'Single', floor: 1, status: 'occupied', ratePerNight: 2500, maxOccupancy: 1 },
  { id: 'r107', number: '107', type: 'Double', floor: 1, status: 'vacant', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r108', number: '108', type: 'Single', floor: 1, status: 'maintenance', ratePerNight: 2500, maxOccupancy: 1 },
  { id: 'r109', number: '109', type: 'Double', floor: 1, status: 'vacant', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r110', number: '110', type: 'Single', floor: 1, status: 'dirty', ratePerNight: 2500, maxOccupancy: 1 },
  // Floor 2 — Deluxe
  { id: 'r201', number: '201', type: 'Deluxe', floor: 2, status: 'occupied', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r202', number: '202', type: 'Deluxe', floor: 2, status: 'vacant', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r203', number: '203', type: 'Double', floor: 2, status: 'vacant', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r204', number: '204', type: 'Single', floor: 2, status: 'dirty', ratePerNight: 2500, maxOccupancy: 1 },
  { id: 'r205', number: '205', type: 'Double', floor: 2, status: 'occupied', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r206', number: '206', type: 'Deluxe', floor: 2, status: 'reserved', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r207', number: '207', type: 'Deluxe', floor: 2, status: 'vacant', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r208', number: '208', type: 'Double', floor: 2, status: 'occupied', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r209', number: '209', type: 'Deluxe', floor: 2, status: 'vacant', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r210', number: '210', type: 'Double', floor: 2, status: 'maintenance', ratePerNight: 3500, maxOccupancy: 2 },
  // Floor 3 — Suites & Deluxe
  { id: 'r301', number: '301', type: 'Suite', floor: 3, status: 'occupied', ratePerNight: 8000, maxOccupancy: 4 },
  { id: 'r302', number: '302', type: 'Suite', floor: 3, status: 'vacant', ratePerNight: 8000, maxOccupancy: 4 },
  { id: 'r303', number: '303', type: 'Deluxe', floor: 3, status: 'maintenance', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r304', number: '304', type: 'Double', floor: 3, status: 'vacant', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r305', number: '305', type: 'Single', floor: 3, status: 'occupied', ratePerNight: 2500, maxOccupancy: 1 },
  { id: 'r306', number: '306', type: 'Double', floor: 3, status: 'vacant', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r307', number: '307', type: 'Suite', floor: 3, status: 'reserved', ratePerNight: 8000, maxOccupancy: 4 },
  { id: 'r308', number: '308', type: 'Deluxe', floor: 3, status: 'occupied', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r309', number: '309', type: 'Double', floor: 3, status: 'vacant', ratePerNight: 3500, maxOccupancy: 2 },
  { id: 'r310', number: '310', type: 'Deluxe', floor: 3, status: 'dirty', ratePerNight: 5000, maxOccupancy: 2 },
  // Floor 4 — Presidential & Suites
  { id: 'r401', number: '401', type: 'Suite', floor: 4, status: 'vacant', ratePerNight: 8000, maxOccupancy: 4 },
  { id: 'r402', number: '402', type: 'Deluxe', floor: 4, status: 'occupied', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r403', number: '403', type: 'Suite', floor: 4, status: 'vacant', ratePerNight: 8000, maxOccupancy: 4 },
  { id: 'r404', number: '404', type: 'Deluxe', floor: 4, status: 'reserved', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r405', number: '405', type: 'Suite', floor: 4, status: 'maintenance', ratePerNight: 8000, maxOccupancy: 4 },
  { id: 'r406', number: '406', type: 'Deluxe', floor: 4, status: 'vacant', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r407', number: '407', type: 'Suite', floor: 4, status: 'occupied', ratePerNight: 8000, maxOccupancy: 4 },
  { id: 'r408', number: '408', type: 'Deluxe', floor: 4, status: 'vacant', ratePerNight: 5000, maxOccupancy: 2 },
  { id: 'r409', number: '409', type: 'Suite', floor: 4, status: 'dirty', ratePerNight: 8000, maxOccupancy: 4 },
  { id: 'r410', number: '410', type: 'Deluxe', floor: 4, status: 'occupied', ratePerNight: 5000, maxOccupancy: 2 },
];

export const initialGuests: Guest[] = [
  { id: 'g001', phone: '01711000001', name: 'রাহুল আহমেদ', fatherName: 'করিম আহমেদ', motherName: 'সুমাইয়া বেগম', nid: '1990123456789', nationality: 'Bangladeshi', address: 'ঢাকা, বাংলাদেশ', email: 'rahul@email.com', preferences: 'Non-smoking. Coffee in morning. High floor.', vipLevel: 2, createdAt: '2024-01-15T10:00:00Z' },
  { id: 'g002', phone: '01711000002', name: 'সারা খান', nid: '1985987654321', nationality: 'Bangladeshi', address: 'চট্টগ্রাম, বাংলাদেশ', preferences: 'Extra pillows. Quiet room.', vipLevel: 1, createdAt: '2024-02-20T09:00:00Z' },
  { id: 'g003', phone: '01711000003', name: 'Mohammed Al-Rashid', passport: 'A1234567', nationality: 'Saudi Arabian', address: 'Riyadh, Saudi Arabia', email: 'mrashid@email.com', preferences: 'Halal food only. Prayer mat required.', vipLevel: 3, createdAt: '2024-03-10T14:00:00Z' },
  { id: 'g004', phone: '01711000004', name: 'করিম উদ্দিন', nid: '1978456789012', nationality: 'Bangladeshi', address: 'সিলেট, বাংলাদেশ', preferences: 'Ground floor room.', vipLevel: 0, createdAt: '2024-04-05T11:00:00Z' },
  { id: 'g005', phone: '01711000005', name: 'Priya Sharma', passport: 'B7654321', nationality: 'Indian', address: 'Kolkata, India', email: 'priya@email.com', preferences: 'Vegetarian meals. Non-smoking.', vipLevel: 1, createdAt: '2024-05-12T16:00:00Z' },
  { id: 'g006', phone: '01711000006', name: 'John Williams', passport: 'C9988776', nationality: 'American', address: 'New York, USA', email: 'john.w@email.com', preferences: 'Late checkout if possible. King bed.', vipLevel: 2, createdAt: '2024-06-01T08:00:00Z' },
  { id: 'g007', phone: '01711000007', name: 'আব্দুল করিম', nid: '1982345678901', nationality: 'Bangladeshi', address: 'রাজশাহী, বাংলাদেশ', preferences: '', vipLevel: 0, createdAt: '2024-06-10T10:00:00Z' },
];

const today = new Date().toISOString().split('T')[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const dayAfter = new Date(Date.now() + 172800000).toISOString().split('T')[0];
const threeDays = new Date(Date.now() + 259200000).toISOString().split('T')[0];

export const initialFolios: Folio[] = [
  { id: 'f001', referenceNo: 'NICE-2024-0001', guestId: 'g001', roomId: 'r101', checkIn: yesterday, checkOut: tomorrow, mealPlan: 'CP', status: 'inhouse', adults: 1, children: 0, pickupRequired: false, advancePaid: 2500, createdAt: yesterday + 'T10:00:00Z', createdBy: 'receptionist' },
  { id: 'f002', referenceNo: 'NICE-2024-0002', guestId: 'g003', roomId: 'r201', checkIn: yesterday, checkOut: dayAfter, mealPlan: 'AP', status: 'inhouse', adults: 2, children: 1, pickupRequired: true, arrivalMode: 'Flight', flightBusNo: 'BG401', advancePaid: 10000, notes: 'VIP guest. Airport pickup arranged.', createdAt: yesterday + 'T12:00:00Z', createdBy: 'manager' },
  { id: 'f003', referenceNo: 'NICE-2024-0003', guestId: 'g002', roomId: 'r205', checkIn: today, checkOut: tomorrow, mealPlan: 'EP', status: 'inhouse', adults: 1, children: 0, pickupRequired: false, advancePaid: 1500, createdAt: today + 'T08:00:00Z', createdBy: 'receptionist' },
  { id: 'f004', referenceNo: 'NICE-2024-0004', guestId: 'g004', roomId: 'r106', checkIn: yesterday, checkOut: today, mealPlan: 'CP', status: 'inhouse', adults: 1, children: 0, pickupRequired: false, advancePaid: 2000, createdAt: yesterday + 'T14:00:00Z', createdBy: 'receptionist' },
  { id: 'f005', referenceNo: 'NICE-2024-0005', guestId: 'g005', roomId: 'r301', checkIn: yesterday, checkOut: dayAfter, mealPlan: 'MAP', status: 'inhouse', adults: 2, children: 0, pickupRequired: false, advancePaid: 5000, createdAt: yesterday + 'T15:00:00Z', createdBy: 'receptionist' },
  { id: 'f006', referenceNo: 'NICE-2024-0006', guestId: 'g006', roomId: 'r402', checkIn: today, checkOut: dayAfter, mealPlan: 'EP', status: 'inhouse', adults: 1, children: 0, pickupRequired: false, advancePaid: 3000, createdAt: today + 'T09:00:00Z', createdBy: 'receptionist' },
  { id: 'f007', referenceNo: 'NICE-2024-0007', guestId: 'g001', roomId: 'r208', checkIn: today, checkOut: threeDays, mealPlan: 'CP', status: 'inhouse', adults: 1, children: 0, pickupRequired: false, advancePaid: 2000, createdAt: today + 'T10:30:00Z', createdBy: 'receptionist' },
  { id: 'f008', referenceNo: 'NICE-2024-0008', guestId: 'g007', roomId: 'r305', checkIn: today, checkOut: tomorrow, mealPlan: 'EP', status: 'inhouse', adults: 1, children: 0, pickupRequired: false, advancePaid: 1000, createdAt: today + 'T11:00:00Z', createdBy: 'receptionist' },
  { id: 'f009', referenceNo: 'NICE-2024-0009', guestId: 'g002', roomId: 'r104', checkIn: tomorrow, checkOut: threeDays, mealPlan: 'CP', status: 'reserved', adults: 1, children: 0, pickupRequired: false, advancePaid: 1000, createdAt: today + 'T10:00:00Z', createdBy: 'receptionist' },
  { id: 'f010', referenceNo: 'NICE-2024-0010', guestId: 'g003', roomId: 'r206', checkIn: tomorrow, checkOut: new Date(Date.now() + 345600000).toISOString().split('T')[0], mealPlan: 'AP', status: 'reserved', adults: 2, children: 0, pickupRequired: true, arrivalMode: 'Flight', flightBusNo: 'BG405', advancePaid: 8000, createdAt: today + 'T11:00:00Z', createdBy: 'manager' },
  { id: 'f011', referenceNo: 'NICE-2024-0011', guestId: 'g005', roomId: 'r307', checkIn: tomorrow, checkOut: threeDays, mealPlan: 'MAP', status: 'reserved', adults: 2, children: 1, pickupRequired: false, advancePaid: 4000, createdAt: today + 'T14:00:00Z', createdBy: 'receptionist' },
  { id: 'f012', referenceNo: 'NICE-2024-0012', guestId: 'g006', roomId: 'r407', checkIn: yesterday, checkOut: dayAfter, mealPlan: 'EP', status: 'inhouse', adults: 2, children: 0, pickupRequired: false, advancePaid: 6000, createdAt: yesterday + 'T16:00:00Z', createdBy: 'manager' },
  { id: 'f013', referenceNo: 'NICE-2024-0013', guestId: 'g007', roomId: 'r308', checkIn: today, checkOut: dayAfter, mealPlan: 'CP', status: 'inhouse', adults: 1, children: 0, pickupRequired: false, advancePaid: 2500, createdAt: today + 'T08:30:00Z', createdBy: 'receptionist' },
  { id: 'f014', referenceNo: 'NICE-2024-0014', guestId: 'g004', roomId: 'r410', checkIn: yesterday, checkOut: tomorrow, mealPlan: 'EP', status: 'inhouse', adults: 1, children: 0, pickupRequired: false, advancePaid: 1500, createdAt: yesterday + 'T13:00:00Z', createdBy: 'receptionist' },
];

export const initialTransactions: Transaction[] = [
  { id: 't001', folioId: 'f001', date: yesterday, category: 'Room Rent', description: 'Room 101 - Single - 1 Night', amount: 2500, type: 'charge', postedBy: 'system', timestamp: yesterday + 'T23:59:00Z', printed: true },
  { id: 't002', folioId: 'f001', date: yesterday, category: 'Payment', description: 'Advance Payment - Cash', amount: -2500, type: 'payment', postedBy: 'receptionist', timestamp: yesterday + 'T10:00:00Z', printed: true },
  { id: 't003', folioId: 'f001', date: today, category: 'Restaurant', description: 'Breakfast - 2 persons (Auto-hit)', amount: 600, type: 'charge', postedBy: 'restaurant', timestamp: today + 'T08:30:00Z', printed: true },
  { id: 't004', folioId: 'f002', date: yesterday, category: 'Room Rent', description: 'Room 201 - Deluxe - 1 Night', amount: 5000, type: 'charge', postedBy: 'system', timestamp: yesterday + 'T23:59:00Z', printed: true },
  { id: 't005', folioId: 'f002', date: yesterday, category: 'Payment', description: 'Advance Payment - Card', amount: -10000, type: 'payment', postedBy: 'manager', timestamp: yesterday + 'T12:00:00Z', printed: true },
  { id: 't006', folioId: 'f002', date: today, category: 'Restaurant', description: 'Lunch - 3 persons (Auto-hit)', amount: 1800, type: 'charge', postedBy: 'restaurant', timestamp: today + 'T13:00:00Z', printed: false },
  { id: 't007', folioId: 'f002', date: today, category: 'Spa', description: 'Spa Service (Auto-hit)', amount: 2500, type: 'charge', postedBy: 'spa', timestamp: today + 'T11:00:00Z', printed: false },
  { id: 't008', folioId: 'f003', date: today, category: 'Payment', description: 'Advance Payment - Cash', amount: -1500, type: 'payment', postedBy: 'receptionist', timestamp: today + 'T08:00:00Z', printed: true },
  { id: 't009', folioId: 'f004', date: yesterday, category: 'Room Rent', description: 'Room 106 - Single - 1 Night', amount: 2500, type: 'charge', postedBy: 'system', timestamp: yesterday + 'T23:59:00Z', printed: true },
  { id: 't010', folioId: 'f004', date: yesterday, category: 'Payment', description: 'Advance Payment - Cash', amount: -2000, type: 'payment', postedBy: 'receptionist', timestamp: yesterday + 'T14:00:00Z', printed: true },
  { id: 't011', folioId: 'f005', date: yesterday, category: 'Room Rent', description: 'Room 301 - Suite - 1 Night', amount: 8000, type: 'charge', postedBy: 'system', timestamp: yesterday + 'T23:59:00Z', printed: true },
  { id: 't012', folioId: 'f005', date: yesterday, category: 'Payment', description: 'Advance Payment - Card', amount: -5000, type: 'payment', postedBy: 'receptionist', timestamp: yesterday + 'T15:00:00Z', printed: true },
  { id: 't013', folioId: 'f006', date: today, category: 'Payment', description: 'Advance Payment - bKash', amount: -3000, type: 'payment', postedBy: 'receptionist', timestamp: today + 'T09:00:00Z', printed: true },
  { id: 't014', folioId: 'f006', date: today, category: 'Restaurant', description: 'Dinner - 1 person (Auto-hit)', amount: 800, type: 'charge', postedBy: 'restaurant', timestamp: today + 'T20:00:00Z', printed: false },
  { id: 't015', folioId: 'f007', date: today, category: 'Payment', description: 'Advance Payment - Cash', amount: -2000, type: 'payment', postedBy: 'receptionist', timestamp: today + 'T10:30:00Z', printed: true },
  { id: 't016', folioId: 'f008', date: today, category: 'Payment', description: 'Advance Payment - Nagad', amount: -1000, type: 'payment', postedBy: 'receptionist', timestamp: today + 'T11:00:00Z', printed: true },
  { id: 't017', folioId: 'f012', date: yesterday, category: 'Room Rent', description: 'Room 407 - Suite - 1 Night', amount: 8000, type: 'charge', postedBy: 'system', timestamp: yesterday + 'T23:59:00Z', printed: true },
  { id: 't018', folioId: 'f012', date: yesterday, category: 'Payment', description: 'Advance Payment - Card', amount: -6000, type: 'payment', postedBy: 'manager', timestamp: yesterday + 'T16:00:00Z', printed: true },
  { id: 't019', folioId: 'f013', date: today, category: 'Payment', description: 'Advance Payment - Cash', amount: -2500, type: 'payment', postedBy: 'receptionist', timestamp: today + 'T08:30:00Z', printed: true },
  { id: 't020', folioId: 'f014', date: yesterday, category: 'Room Rent', description: 'Room 410 - Deluxe - 1 Night', amount: 5000, type: 'charge', postedBy: 'system', timestamp: yesterday + 'T23:59:00Z', printed: true },
  { id: 't021', folioId: 'f014', date: yesterday, category: 'Payment', description: 'Advance Payment - Cash', amount: -1500, type: 'payment', postedBy: 'receptionist', timestamp: yesterday + 'T13:00:00Z', printed: true },
];

export const initialInventory: InventoryItem[] = [
  { id: 'i001', code: 'HK001', name: 'Bed Sheet (Single)', category: 'Housekeeping', unit: 'Piece', currentStock: 45, reorderLevel: 10, unitPrice: 350 },
  { id: 'i002', code: 'HK002', name: 'Towel (Bath)', category: 'Housekeeping', unit: 'Piece', currentStock: 60, reorderLevel: 15, unitPrice: 250 },
  { id: 'i003', code: 'HK003', name: 'Soap (Bar)', category: 'Housekeeping', unit: 'Piece', currentStock: 200, reorderLevel: 50, unitPrice: 35 },
  { id: 'i004', code: 'HK004', name: 'Shampoo (Sachet)', category: 'Housekeeping', unit: 'Piece', currentStock: 4, reorderLevel: 40, unitPrice: 25 },
  { id: 'i005', code: 'FB001', name: 'Rice (kg)', category: 'Food', unit: 'KG', currentStock: 80, reorderLevel: 20, unitPrice: 70 },
  { id: 'i006', code: 'FB002', name: 'Cooking Oil (L)', category: 'Food', unit: 'Litre', currentStock: 30, reorderLevel: 10, unitPrice: 175 },
  { id: 'i007', code: 'BV001', name: 'Mineral Water (500ml)', category: 'Beverage', unit: 'Bottle', currentStock: 300, reorderLevel: 100, unitPrice: 20 },
  { id: 'i008', code: 'BV002', name: 'Tea Bags', category: 'Beverage', unit: 'Box', currentStock: 3, reorderLevel: 5, unitPrice: 120 },
  { id: 'i009', code: 'EN001', name: 'Light Bulb (LED)', category: 'Engineering', unit: 'Piece', currentStock: 40, reorderLevel: 10, unitPrice: 150 },
  { id: 'i010', code: 'ST001', name: 'A4 Paper (Ream)', category: 'Stationery', unit: 'Ream', currentStock: 15, reorderLevel: 5, unitPrice: 450 },
];

export const initialCompanies: Company[] = [
  { id: 'c001', name: 'Grameenphone Ltd.', contactPerson: 'Tanvir Ahmed', contactPersonBirthday: '1985-03-15', personalPhone: '01711900001', officePhone: '09600000001', email: 'tanvir@gp.com.bd', address: 'GP House, Bashundhara, Dhaka', discountRate: 15, creditLimit: 500000, notes: 'Corporate account. Monthly invoice.', createdAt: '2024-01-01T00:00:00Z' },
  { id: 'c002', name: 'BRAC', contactPerson: 'Nasrin Sultana', contactPersonBirthday: '1979-07-22', personalPhone: '01711900002', officePhone: '02-8824180', email: 'nasrin@brac.net', address: 'BRAC Centre, Mohakhali, Dhaka', discountRate: 10, creditLimit: 300000, notes: 'NGO rate. Tax exemption applicable.', createdAt: '2024-01-15T00:00:00Z' },
  { id: 'c003', name: 'Square Group', contactPerson: 'Rahim Chowdhury', personalPhone: '01711900003', discountRate: 20, creditLimit: 1000000, createdAt: '2024-02-01T00:00:00Z' },
];

export const initialAgents: Agent[] = [
  { id: 'a001', name: 'Booking.com', type: 'OTA', commissionRate: 15, contactPerson: 'Online Portal', email: 'partner@booking.com', totalBookings: 24, totalCommission: 48000, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'a002', name: 'Expedia', type: 'OTA', commissionRate: 12, contactPerson: 'Online Portal', email: 'partner@expedia.com', totalBookings: 12, totalCommission: 22000, createdAt: '2024-01-01T00:00:00Z' },
  { id: 'a003', name: 'Cox Travel Agency', type: 'TA', commissionRate: 8, contactPerson: 'Kabir Hassan', phone: '01811000001', totalBookings: 18, totalCommission: 15000, createdAt: '2024-02-01T00:00:00Z' },
];

export const initialCommissions: CommissionEntry[] = [
  { id: 'cm001', agentId: 'a001', folioId: 'f002', date: yesterday, amount: 15000, commissionAmount: 2250, status: 'pending' },
  { id: 'cm002', agentId: 'a002', folioId: 'f005', date: yesterday, amount: 8000, commissionAmount: 960, status: 'pending' },
  { id: 'cm003', agentId: 'a001', folioId: 'f012', date: yesterday, amount: 8000, commissionAmount: 1200, status: 'paid', paidDate: today },
];

export const initialHKRecords: HousekeepingRecord[] = [
  { id: 'hk001', roomId: 'r103', date: today, amStatus: 'dirty', pmStatus: 'clean', eveStatus: 'inspected', assignedTo: 'Amina Begum' },
  { id: 'hk002', roomId: 'r110', date: today, amStatus: 'dirty', pmStatus: 'dirty', eveStatus: 'dirty', assignedTo: 'Rina Akter' },
  { id: 'hk003', roomId: 'r204', date: today, amStatus: 'dirty', pmStatus: 'clean', eveStatus: 'clean', assignedTo: 'Amina Begum' },
  { id: 'hk004', roomId: 'r108', date: today, amStatus: 'ooo', pmStatus: 'ooo', eveStatus: 'ooo', oooReason: 'AC repair in progress', oooExpectedReturn: tomorrow },
  { id: 'hk005', roomId: 'r303', date: today, amStatus: 'ooo', pmStatus: 'ooo', eveStatus: 'ooo', oooReason: 'Bathroom renovation', oooExpectedReturn: threeDays },
  { id: 'hk006', roomId: 'r310', date: today, amStatus: 'dirty', pmStatus: 'clean', eveStatus: 'inspected', assignedTo: 'Rina Akter' },
  { id: 'hk007', roomId: 'r409', date: today, amStatus: 'dirty', pmStatus: 'dirty', eveStatus: 'clean', assignedTo: 'Amina Begum' },
];

export const initialConfig = {
  hotelName: 'নাইস হোটেল এন্ড রিসোর্ট',
  hotelAddress: '১২৩ মতিঝিল বাণিজ্যিক এলাকা, ঢাকা-১০০০',
  hotelPhone: '+880 2-9551234',
  hotelEmail: 'info@nicehotel.com.bd',
  systemDate: new Date().toISOString().split('T')[0],
  lastDayClose: new Date(Date.now() - 86400000).toISOString().split('T')[0],
  taxRate: 7.5,
  currency: 'BDT',
  currentUser: 'Front Desk',
  currentRole: 'receptionist' as const,
};
