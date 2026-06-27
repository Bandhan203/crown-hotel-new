export type HKStatus = 'clean' | 'dirty' | 'inspected' | 'ooo';
export type HKShift = 'am' | 'pm' | 'eve';

export interface HousekeepingRecord {
  id: string;
  roomId: string;
  date: string;
  amStatus: HKStatus;
  pmStatus: HKStatus;
  eveStatus: HKStatus;
  assignedTo?: string;
  notes?: string;
  oooReason?: string;
  oooExpectedReturn?: string;
}

export interface Company {
  id: string;
  name: string;
  contactPerson: string;
  contactPersonBirthday?: string;
  personalPhone: string;
  officePhone?: string;
  email?: string;
  address?: string;
  discountRate: number;
  creditLimit: number;
  notes?: string;
  createdAt: string;
}

export interface Agent {
  id: string;
  name: string;
  type: 'OTA' | 'TA' | 'Corporate' | 'Walk-in';
  commissionRate: number;
  contactPerson?: string;
  phone?: string;
  email?: string;
  bankAccount?: string;
  totalBookings: number;
  totalCommission: number;
  createdAt: string;
}

export interface CommissionEntry {
  id: string;
  agentId: string;
  folioId: string;
  date: string;
  amount: number;
  commissionAmount: number;
  status: 'pending' | 'paid';
  paidDate?: string;
  notes?: string;
}

export interface AutoHitConfig {
  department: 'restaurant' | 'spa' | 'minibar' | 'laundry';
  enabled: boolean;
  defaultCategory: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  phone: string;
}
