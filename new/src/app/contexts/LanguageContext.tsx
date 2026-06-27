import { createContext, useContext, useState } from 'react';

type Lang = 'en' | 'bn';

const translations = {
  en: {
    // Nav
    dashboard: 'Dashboard', reservations: 'Reservations', guests: 'Guests',
    checkin: 'Check-In', serviceEntry: 'Service Entry', nightAudit: 'Night Audit',
    reports: 'Reports', inventory: 'Inventory', housekeeping: 'Housekeeping',
    corporateCRM: 'Corporate CRM', settings: 'Settings', commissions: 'Commissions',
    // Status
    vacant: 'Vacant', occupied: 'Occupied', dirty: 'Dirty', reserved: 'Reserved',
    maintenance: 'Maintenance', outOfOrder: 'Out of Order',
    inhouse: 'In-House', checkedout: 'Checked Out',
    // Dashboard
    totalRooms: 'Total Rooms', occupancy: 'Occupancy', arrivals: 'Arrivals',
    departures: 'Departures', todayRevenue: 'Today Revenue', pickupRequired: 'Pickup Required',
    systemDate: 'SYSTEM DATE',
    // Billing
    roomRent: 'Room Rent', restaurant: 'Restaurant', laundry: 'Laundry',
    transport: 'Transport', telephone: 'Telephone', minibar: 'Minibar',
    spa: 'Spa', damage: 'Damage', miscellaneous: 'Miscellaneous',
    payment: 'Payment', adjustment: 'Adjustment',
    postCharge: 'Post Charge', voidEntry: 'Void Entry',
    balance: 'Balance', totalCharges: 'Total Charges', totalPayments: 'Total Payments',
    // Checkin
    checkIn: 'Check-In', checkOut: 'Check-Out', mealPlan: 'Meal Plan',
    adults: 'Adults', children: 'Children', nights: 'Nights',
    advance: 'Advance', referenceNo: 'Reference No', nationality: 'Nationality',
    searchGuest: 'Search Guest', newGuest: 'New Guest', assignRoom: 'Assign Room',
    confirm: 'Confirm', cancel: 'Cancel', save: 'Save',
    // Guest
    name: 'Name', phone: 'Phone', nid: 'NID', passport: 'Passport',
    address: 'Address', email: 'Email', preferences: 'Preferences',
    fatherName: 'Father Name', motherName: 'Mother Name', vipLevel: 'VIP Level',
    stayHistory: 'Stay History', totalSpend: 'Total Spend',
    // Reports
    dailyGuestList: 'Daily Guest List', arrivalList: 'Arrival List',
    departureList: 'Departure List', revenueReport: 'Revenue Report',
    occupancyReport: 'Occupancy Report', guestHistory: 'Guest History',
    topSheet: 'Top Sheet', adr: 'ADR', revPAR: 'RevPAR',
    // Housekeeping
    amStatus: 'AM Status', pmStatus: 'PM Status', eveningStatus: 'Eve Status',
    clean: 'Clean', dirtyRoom: 'Dirty', inspected: 'Inspected',
    ooo: 'OOO', oooReason: 'OOO Reason', assignHK: 'Assign HK',
    // Common
    print: 'Print', download: 'Download', export: 'Export',
    total: 'Total', date: 'Date', description: 'Description',
    amount: 'Amount', status: 'Status', action: 'Action',
    yes: 'Yes', no: 'No', close: 'Close', back: 'Back', next: 'Next',
    search: 'Search', filter: 'Filter', add: 'Add', edit: 'Edit', delete: 'Delete',
    floor: 'Floor', room: 'Room', type: 'Type', rate: 'Rate/Night',
    company: 'Company', agent: 'Agent', commission: 'Commission',
    approved: 'Approved', pending: 'Pending', rejected: 'Rejected',
    nightAuditTitle: 'Night Audit & Day Close', dayClose: 'Day Close',
    checkoutBlocked: 'Checkout blocked — pending balance must be settled.',
    postSuccess: 'Posted successfully',
    voidSuccess: 'Entry voided',
    checkinSuccess: 'Check-in complete',
    checkoutSuccess: 'Check-out complete',
    reservationConfirmed: 'Reservation confirmed',
  },
  bn: {
    // Nav
    dashboard: 'ড্যাশবোর্ড', reservations: 'রিজার্ভেশন', guests: 'গেস্ট',
    checkin: 'চেক-ইন', serviceEntry: 'সার্ভিস এন্ট্রি', nightAudit: 'নাইট অডিট',
    reports: 'রিপোর্ট', inventory: 'ইনভেন্টরি', housekeeping: 'হাউসকিপিং',
    corporateCRM: 'কর্পোরেট CRM', settings: 'সেটিংস', commissions: 'কমিশন',
    // Status
    vacant: 'খালি', occupied: 'অকুপাইড', dirty: 'ডার্টি', reserved: 'রিজার্ভড',
    maintenance: 'মেইনটেন্যান্স', outOfOrder: 'আউট অব অর্ডার',
    inhouse: 'ইন-হাউস', checkedout: 'চেক-আউট',
    // Dashboard
    totalRooms: 'মোট রুম', occupancy: 'অকুপেন্সি', arrivals: 'আগমন',
    departures: 'প্রস্থান', todayRevenue: 'আজকের আয়', pickupRequired: 'পিকআপ',
    systemDate: 'সিস্টেম তারিখ',
    // Billing
    roomRent: 'রুম ভাড়া', restaurant: 'রেস্টুরেন্ট', laundry: 'লন্ড্রি',
    transport: 'ট্রান্সপোর্ট', telephone: 'টেলিফোন', minibar: 'মিনিবার',
    spa: 'স্পা', damage: 'ড্যামেজ', miscellaneous: 'বিবিধ',
    payment: 'পেমেন্ট', adjustment: 'অ্যাডজাস্টমেন্ট',
    postCharge: 'চার্জ পোস্ট করুন', voidEntry: 'ভয়েড এন্ট্রি',
    balance: 'ব্যালেন্স', totalCharges: 'মোট চার্জ', totalPayments: 'মোট পেমেন্ট',
    // Checkin
    checkIn: 'চেক-ইন', checkOut: 'চেক-আউট', mealPlan: 'মিল প্ল্যান',
    adults: 'প্রাপ্তবয়স্ক', children: 'শিশু', nights: 'রাত',
    advance: 'অ্যাডভান্স', referenceNo: 'রেফারেন্স নং', nationality: 'জাতীয়তা',
    searchGuest: 'গেস্ট খুঁজুন', newGuest: 'নতুন গেস্ট', assignRoom: 'রুম বরাদ্দ',
    confirm: 'নিশ্চিত করুন', cancel: 'বাতিল', save: 'সংরক্ষণ',
    // Guest
    name: 'নাম', phone: 'ফোন', nid: 'NID', passport: 'পাসপোর্ট',
    address: 'ঠিকানা', email: 'ইমেইল', preferences: 'পছন্দ',
    fatherName: 'পিতার নাম', motherName: 'মাতার নাম', vipLevel: 'VIP স্তর',
    stayHistory: 'স্টে হিস্ট্রি', totalSpend: 'মোট ব্যয়',
    // Reports
    dailyGuestList: 'ডেইলি গেস্ট লিস্ট', arrivalList: 'আগমন তালিকা',
    departureList: 'প্রস্থান তালিকা', revenueReport: 'রাজস্ব রিপোর্ট',
    occupancyReport: 'অকুপেন্সি রিপোর্ট', guestHistory: 'গেস্ট হিস্ট্রি',
    topSheet: 'টপশিট', adr: 'ADR', revPAR: 'RevPAR',
    // Housekeeping
    amStatus: 'সকাল স্ট্যাটাস', pmStatus: 'দুপুর স্ট্যাটাস', eveningStatus: 'সন্ধ্যা স্ট্যাটাস',
    clean: 'পরিষ্কার', dirtyRoom: 'ময়লা', inspected: 'পরিদর্শন',
    ooo: 'OOO', oooReason: 'OOO কারণ', assignHK: 'HK বরাদ্দ',
    // Common
    print: 'প্রিন্ট', download: 'ডাউনলোড', export: 'এক্সপোর্ট',
    total: 'মোট', date: 'তারিখ', description: 'বিবরণ',
    amount: 'পরিমাণ', status: 'স্ট্যাটাস', action: 'অ্যাকশন',
    yes: 'হ্যাঁ', no: 'না', close: 'বন্ধ', back: 'পেছনে', next: 'পরবর্তী',
    search: 'খুঁজুন', filter: 'ফিল্টার', add: 'যোগ করুন', edit: 'এডিট', delete: 'মুছুন',
    floor: 'তলা', room: 'রুম', type: 'ধরন', rate: 'রেট/রাত',
    company: 'কোম্পানি', agent: 'এজেন্ট', commission: 'কমিশন',
    approved: 'অ্যাপ্রুভড', pending: 'পেন্ডিং', rejected: 'বাতিল',
    nightAuditTitle: 'নাইট অডিট ও ডে ক্লোজ', dayClose: 'ডে ক্লোজ',
    checkoutBlocked: 'চেক-আউট ব্লক — বাকি ব্যালেন্স পরিশোধ করতে হবে।',
    postSuccess: 'সফলভাবে পোস্ট হয়েছে',
    voidSuccess: 'ভয়েড সম্পন্ন',
    checkinSuccess: 'চেক-ইন সম্পন্ন',
    checkoutSuccess: 'চেক-আউট সম্পন্ন',
    reservationConfirmed: 'রিজার্ভেশন নিশ্চিত',
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem('hotel_lang') as Lang) || 'bn';
  });

  const toggleLang = () => {
    const next = lang === 'bn' ? 'en' : 'bn';
    setLang(next);
    localStorage.setItem('hotel_lang', next);
  };

  const t = (key: TranslationKey): string => translations[lang][key] as string;

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be inside LanguageProvider');
  return ctx;
}
