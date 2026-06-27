# Plan: Nice Hotel Management System — Full 1:1 Clone

## Context
The user wants a complete, production-ready Hotel Management System modeled after "Nice Software" — a keyboard-driven, real-time, revenue-secure hotel management platform tailored for Bangladeshi hospitality business logic. The app must handle room monitoring, guest CRM, reservations, service billing, night audit, and inventory — all with strict audit trails, keyboard-first UX, and PDF/print reporting.

The project is a blank React + Tailwind CSS v4 app (src/app/App.tsx is empty). No @make-kits packages exist. We use react-router (already installed), recharts, lucide-react, date-fns, react-hook-form, and sonner for toasts.

---

## Architecture Overview

### Routing (react-router v7)
Single-page app with sidebar navigation. Routes:
- `/` → Dashboard (room grid)
- `/reservations` → Reservations list + new booking
- `/guests` → Guest CRM profiles
- `/service-entry` → Service/charge posting
- `/billing` → Invoice & checkout
- `/night-audit` → Day close & top sheet
- `/inventory` → Store & requisitions
- `/reports` → All reports (arrivals, departures, guest list, revenue)
- `/settings` → Hotel config, user management

### State Management
Local React state + context for:
- `HotelContext` — system date, hotel config
- `RoomsContext` — room statuses, live updates
- `GuestContext` — in-house guests & profiles
- All data stored in localStorage for persistence across reloads (simulating a real backend)

---

## Module-by-Module Implementation Plan

### Module 1: Layout & Navigation Shell
**File**: `src/app/App.tsx`, `src/app/components/Layout.tsx`, `src/app/components/Sidebar.tsx`

- Sidebar with icons + labels for each module
- Top header showing system date, hotel name, logged-in user, and a clock
- Color scheme: deep navy/dark theme (professional hotel software aesthetic)
- Keyboard shortcut hints in sidebar (F1=Dashboard, F2=Reservations, etc.)

### Module 2: Dashboard — Visual Room Grid
**File**: `src/app/components/dashboard/RoomGrid.tsx`, `RoomCard.tsx`, `GuestPanel.tsx`

Room card color coding:
- **Green** = Vacant (clean, ready)
- **Red** = Occupied
- **Orange** = Dirty/Housekeeping needed
- **Blue** = Reserved (not yet arrived)
- **Yellow** = Due checkout today

Clicking a room opens a right-side panel with:
- Guest name, phone, nationality, check-in/out dates
- Current balance due
- Quick actions: Post Service, Checkout, Move Room, Print Invoice

Stats bar at top: Total rooms, Occupied, Vacant, Arrivals today, Departures today, Revenue today

### Module 3: Guest Profile & CRM
**File**: `src/app/components/guests/GuestSearch.tsx`, `GuestProfile.tsx`, `GuestForm.tsx`

- Phone-number-based search (primary key)
- Guest fields: Name, Phone, NID/Passport, Nationality, Photo (base64 upload), VIP status, Preferences notes
- Stay history tab (all past visits)
- Police-format data export button
- Auto-popup of guest preferences during check-in

### Module 4: Reservations & Logistics
**File**: `src/app/components/reservations/ReservationList.tsx`, `ReservationForm.tsx`, `BookingConfirmation.tsx`

- Create reservation with: guest profile link, room type, meal plan (CP/MAP/AP/EP), arrival/departure dates
- Logistics fields: arrival mode (flight/bus/car), flight/bus number, pickup required (Y/N), vehicle assigned
- Advance payment → auto-generate Reference Number + Money Receipt (printable PDF)
- Email confirmation template (mock)
- Group reservation: link multiple rooms under one folio/company

### Module 5: Check-in / Check-out Flow
**File**: `src/app/components/checkin/CheckinWizard.tsx`, `CheckoutModal.tsx`

Check-in wizard steps:
1. Search guest by phone → create or select profile
2. Assign room
3. Confirm dates & meal plan
4. Collect advance / record payment
5. Print registration card

Checkout validation:
- Block checkout if balance > 0
- Calculate: Room rent × nights + all posted charges - payments
- Print final invoice (A4 PDF)
- Mark room as Dirty automatically

### Module 6: Service Entry & Billing
**File**: `src/app/components/billing/ServiceEntry.tsx`, `BillingLedger.tsx`, `VoucherPrint.tsx`

Keyboard-driven entry:
- Room number → Enter → Category select → Enter → Amount → Enter → Save
- Categories: Room Rent, Restaurant, Laundry, Telephone, Transport, Minibar, Damage, Miscellaneous
- Auto-generate bill number
- Each post creates a printable voucher for guest signature
- POSTED entries cannot be deleted — only Void with reason (admin only)
- Void creates a reverse entry with audit trail (who, when, why)

Ledger view: chronological list of all charges, payments, voids for a folio

### Module 7: Night Audit & Finance
**File**: `src/app/components/audit/NightAudit.tsx`, `TopSheet.tsx`, `DayClose.tsx`

- System Date (independent of server clock) — shown prominently
- Day Close: password-protected, irreversible
- On Day Close:
  - Post room rent for all in-house guests automatically
  - Generate Top Sheet report: Occupancy %, Revenue breakdown by department, Arrivals/Departures count
  - Advance system date by 1
- Top Sheet printable as A4 PDF

### Module 8: Reports
**File**: `src/app/components/reports/ReportViewer.tsx`

Reports list:
- Daily Guest List (in-house)
- Arrival List (today/date range)
- Departure List
- Revenue Report (by department, date range)
- Occupancy Report
- Guest History (by guest)
- Invoice copy reprint

All reports: filterable by date, printable as A4 PDF via `window.print()` with a print-specific CSS

### Module 9: Inventory & Store
**File**: `src/app/components/inventory/ItemList.tsx`, `RequisitionForm.tsx`, `StockLedger.tsx`

- Item master with category (Food, Beverage, Housekeeping, Engineering)
- Stock-in (Purchase) entry
- Requisition from department → Manager approval flow
- Price hidden from requester role (only Manager/GM sees price)
- Stock balance auto-updated on approval

---

## Data Models (localStorage schema)

```typescript
// Rooms
interface Room { id: string; number: string; type: 'Single'|'Double'|'Suite'; floor: number; status: 'vacant'|'occupied'|'dirty'|'reserved'|'maintenance' }

// Guests
interface Guest { id: string; phone: string; name: string; nid?: string; passport?: string; nationality: string; photo?: string; preferences?: string; vipLevel?: number }

// Folios (one per stay)
interface Folio { id: string; guestId: string; roomId: string; checkIn: string; checkOut: string; mealPlan: 'EP'|'CP'|'MAP'|'AP'; status: 'reserved'|'inhouse'|'checkedout' }

// Transactions
interface Transaction { id: string; folioId: string; date: string; category: string; description: string; amount: number; type: 'charge'|'payment'|'void'; voidRef?: string; postedBy: string; timestamp: string }

// System
interface SystemConfig { hotelName: string; systemDate: string; lastDayClose: string }
```

---

## Critical Implementation Details

### Revenue Security
- `Transaction` records are immutable once written
- Void creates a NEW negative transaction referencing original
- Day Close lock: any transaction dated before system date cannot be added post-close
- Admin-only Void requires password re-entry

### Keyboard Navigation
- All forms: Tab between fields, Enter to submit
- Room grid: Arrow keys to navigate, Enter to open panel
- Service entry: After each Enter, focus auto-moves to next field
- Global shortcuts: F1-F8 to jump between modules

### PDF/Print
- Use `window.print()` with a `@media print` stylesheet
- Each report/invoice has a print-ready layout component
- A4 format with hotel letterhead

### Police Portal Format
- Export guest data as structured JSON/CSV matching BD police portal requirements
- Fields: Name, Father Name, Mother Name, NID, Nationality, Address, Check-in, Check-out, Room

---

## File Structure

```
src/app/
├── App.tsx                          (router + providers)
├── contexts/
│   ├── HotelContext.tsx
│   ├── RoomsContext.tsx
│   └── GuestContext.tsx
├── data/
│   └── mockData.ts                  (seed data for 20 rooms, sample guests)
├── hooks/
│   ├── useLocalStorage.ts
│   └── useKeyboardNav.ts
├── components/
│   ├── Layout.tsx
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   ├── dashboard/
│   │   ├── RoomGrid.tsx
│   │   ├── RoomCard.tsx
│   │   ├── GuestPanel.tsx
│   │   └── StatsBar.tsx
│   ├── guests/
│   │   ├── GuestSearch.tsx
│   │   ├── GuestProfile.tsx
│   │   └── GuestForm.tsx
│   ├── reservations/
│   │   ├── ReservationList.tsx
│   │   ├── ReservationForm.tsx
│   │   └── BookingConfirmation.tsx
│   ├── checkin/
│   │   ├── CheckinWizard.tsx
│   │   └── CheckoutModal.tsx
│   ├── billing/
│   │   ├── ServiceEntry.tsx
│   │   ├── BillingLedger.tsx
│   │   └── VoucherPrint.tsx
│   ├── audit/
│   │   ├── NightAudit.tsx
│   │   ├── TopSheet.tsx
│   │   └── DayClose.tsx
│   ├── reports/
│   │   └── ReportViewer.tsx
│   ├── inventory/
│   │   ├── ItemList.tsx
│   │   ├── RequisitionForm.tsx
│   │   └── StockLedger.tsx
│   └── ui/
│       ├── Modal.tsx
│       ├── PrintLayout.tsx
│       └── KeyboardHint.tsx
```

---

## Visual Design

- **Theme**: Dark navy professional (like legacy hotel PMS software but modern)
- **Primary**: Deep blue `#1a2744` sidebar, white content area
- **Status colors**: Green `#22c55e`, Red `#ef4444`, Orange `#f97316`, Blue `#3b82f6`, Yellow `#eab308`
- **Font**: System font stack (fast, no external load)
- **Room grid**: ~6 columns on desktop, card ~120px wide
- **Typography**: Uppercase labels, monospace numbers for amounts

---

## Verification Plan
1. Dashboard loads with 20 mock rooms in correct color states
2. Click a room → guest panel slides in with guest info and balance
3. Check-in wizard: search phone → fill form → assign room → room turns red
4. Post service charge → appears in ledger → cannot be deleted (void only)
5. Checkout: balance 0 → success; balance > 0 → blocked with alert
6. Day Close: advances system date, room rents auto-posted
7. Reports: all filter and print correctly
8. Keyboard navigation: Tab/Enter flow works through service entry

---

## Implementation Order
1. App.tsx with router + all contexts + seed data
2. Layout shell (Sidebar, Header)
3. Dashboard Room Grid (most visible, validates data model)
4. Service Entry (core revenue feature)
5. Check-in / Checkout flows
6. Guest CRM
7. Reservations
8. Night Audit
9. Reports (print)
10. Inventory
