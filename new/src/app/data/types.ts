export type RoomStatus = 'vacant' | 'occupied' | 'dirty' | 'reserved' | 'maintenance';
export type MealPlan = 'EP' | 'CP' | 'MAP' | 'AP';
export type TransactionType = 'charge' | 'payment' | 'void';
export type FolioStatus = 'reserved' | 'inhouse' | 'checkedout';
export type UserRole = 'admin' | 'manager' | 'receptionist' | 'storekeeper';

export interface Room {
  id: string;
  number: string;
  type: 'Single' | 'Double' | 'Suite' | 'Deluxe';
  floor: number;
  status: RoomStatus;
  ratePerNight: number;
  maxOccupancy: number;
}

export interface Guest {
  id: string;
  phone: string;
  name: string;
  fatherName?: string;
  motherName?: string;
  nid?: string;
  passport?: string;
  nationality: string;
  address?: string;
  email?: string;
  photo?: string;
  preferences?: string;
  vipLevel: 0 | 1 | 2 | 3;
  createdAt: string;
}

export interface Folio {
  id: string;
  referenceNo: string;
  guestId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  mealPlan: MealPlan;
  status: FolioStatus;
  adults: number;
  children: number;
  company?: string;
  arrivalMode?: string;
  flightBusNo?: string;
  pickupRequired: boolean;
  advancePaid: number;
  notes?: string;
  createdAt: string;
  createdBy: string;
  groupId?: string;
}

export interface Transaction {
  id: string;
  folioId: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  type: TransactionType;
  voidRef?: string;
  voidReason?: string;
  postedBy: string;
  timestamp: string;
  printed: boolean;
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: 'Food' | 'Beverage' | 'Housekeeping' | 'Engineering' | 'Stationery' | 'Other';
  unit: string;
  currentStock: number;
  reorderLevel: number;
  unitPrice: number;
}

export interface StockTransaction {
  id: string;
  itemId: string;
  date: string;
  type: 'purchase' | 'requisition' | 'adjustment';
  quantity: number;
  unitPrice?: number;
  totalAmount?: number;
  department?: string;
  requestedBy?: string;
  approvedBy?: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  timestamp: string;
}

export interface SystemConfig {
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
  systemDate: string;
  lastDayClose: string;
  taxRate: number;
  currency: string;
  currentUser: string;
  currentRole: UserRole;
}

export interface DayCloseRecord {
  id: string;
  date: string;
  totalRevenue: number;
  roomRevenue: number;
  fbRevenue: number;
  otherRevenue: number;
  totalArrivals: number;
  totalDepartures: number;
  occupiedRooms: number;
  totalRooms: number;
  closedBy: string;
  timestamp: string;
}
