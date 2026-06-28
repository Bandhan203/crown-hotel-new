# Crown Hotel ERP — Complete Workflow & Module Documentation

---

## 1. Core ERP Architecture & Engines

The system has been transformed into a professional Industrial Hotel ERP, meeting global operational standards (OPERA PMS parity) combined with high-speed local workflows.

### 1.1 Business Date Engine
- **Decoupled from OS Clock:** The system does not rely on the server's OS clock for operations. 
- **Centralized Control:** It uses a centralized `HotelConfig.business_date`. This ensures that room rates, daily audits, and night-time turnovers are strictly controlled by the manager executing the Night Audit, independent of the actual midnight crossover.

### 1.2 Multi-Folio Billing
- **Window Tabs:** A single guest booking can contain up to 8 independent billing windows (folios).
- **Separation of Charges:** This allows front-desk staff to easily route and separate room charges, F&B charges, and company payments into different printable invoices.
- **Folio Transfers:** Charges can be seamlessly transferred between windows (e.g., routing room rent to a corporate folio).

### 1.3 Immutable Revenue Guard
- **Void-not-Delete:** To prevent fraud and ensure strict financial integrity, folio charges can never be permanently deleted from the database. 
- **Audit Trail:** Instead, they are marked as "Void" (Adjustment) and require a strict `Reason Code` (e.g., BILLING_ERROR, MANAGER_APPROVAL) and a mandatory `Manager Note`, ensuring a complete audit trail.

### 1.4 High-Speed Keyboard Workflow
- **Enter-Key Navigation:** Form fields are optimized for rapid data entry without a mouse. Inside modals (Walk-In, Reservation, Check-In), pressing `Enter` moves the cursor to the next input field and triggers submission at the end.
- **F-Key Navigation:** Optimized shortcuts allow instant routing (e.g., F2 for immediate Walk-In).

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + Vite)                  │
│  Port: 5173  │  Tailwind CSS  │  React Router  │  Chart.js  │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP/REST API (JWT Auth)
┌────────────────────────────▼────────────────────────────────┐
│                   BACKEND (Django + DRF)                     │
│  Port: 8000  │  SimpleJWT  │  django-filters  │  Pillow     │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────┐
│              DATABASE (SQLite dev / MySQL prod)              │
└─────────────────────────────────────────────────────────────┘
```

**Tech Stack:**
- Backend: Python 3.14, Django 5.x, Django REST Framework, SimpleJWT
- Frontend: React 18, Vite, Tailwind CSS, Chart.js, React Router v6
- Database: SQLite (development), MySQL (production via cPanel)
- Payment: SSLCommerz gateway integration
- Auth: JWT (access token: 30 min, refresh: 7 days)

---

## 2. Django Apps & Their Roles

| App | Purpose |
|-----|---------|
| `accounts` | Custom user model (admin/staff/guest roles), guest profile CRM |
| `bookings` | Core PMS: reservations, check-in/out, folio charges, payments |
| `rooms` | Room catalogue, room types, housekeeping status |
| `restaurant` | Restaurant menu items & categories |
| `spa` | Spa services & treatment catalogue |
| `services` | Hotel services (laundry, transport, etc.) |
| `inventory` | Store management: item master, requisitions, stock ledger |
| `dashboard` | Night audit engine, KPI reports, revenue analytics |
| `staff` | Staff accounts, shift scheduling |
| `cms` | Website content: hero slides, gallery, FAQs, news, testimonials |
| `contact` | Guest inquiry form & message management |

---

## 3. User Roles & Access Control

| Role | Access |
|------|--------|
| `ADMIN` | Full access to all admin modules |
| `STAFF` | Front desk: check-in/out, folio posting, reservations |
| `GUEST` | Public booking, my bookings, payment |

**Authentication Flow:**
```
POST /api/token/          → returns access_token + refresh_token
POST /api/token/refresh/  → returns new access_token
POST /api/token/blacklist/ → logout (invalidates refresh token)
```

---

## 5. Frontend Admin Module Navigation

Keyboard shortcuts F1–F10 are mapped to admin pages for rapid PMS navigation:

| Key | Route | Module |
|-----|-------|--------|
| F1 | `/admin` | Dashboard |
| F2 | `/admin/front-desk?action=walkin` | Walk-In Registration |
| F3 | `/admin/front-desk?action=reserve`| Quick Reservation |
| F4 | `/admin/night-audit` | Night Audit |
| F5 | `/admin/bookings` | Booking Management |
| F6 | `/admin/guests` | Guest CRM |
| F7 | `/admin/service-entry` | Service Entry |
| F8 | `/admin/reports` | Reports |
| F9 | `/admin/inventory` | Inventory & Store |
| F10| `/admin/housekeeping`| Housekeeping Board |

---


## 6. Module Workflows

---

### MODULE A: Interactive 40-Room Grid Dashboard
- **Navigation**: The dashboard utilizes a responsive 40-room visual grid layout.
- **Status Indicators**: Rooms are color-coded (Green: Available, Red: Occupied, Purple: OOO, Orange: Dirty).
- **Occupied Display**: Directly shows the Guest's First Name and Nights Remaining (e.g., "3 Nts" or "Dpt Today") on the room card.
- **Guest Panel**: Clicking a room populates the right sidebar with quick actions (Invoice, Folio Billing, Check-Out, Transfer).

---

### MODULE B: Booking / Reservation Lifecycle

```
[New Booking Request]
        │
        ▼
[Check Availability] → /api/check-availability/
        │
   ┌────▼────────────────────┐
   │  Walk-in (same day)     │  Walk-in: auto check-in immediately
   │  Reservation (future)   │  Reservation: CONFIRMED/PENDING status
   └────┬────────────────────┘
        │
        ▼
[Guest Profile Created/Updated]
 - Name, email, phone
 - NID/Passport/Driving License
 - Nationality, DOB, gender, address
        │
        ▼
[Room Assignment]
 - Auto-assign from available pool
 - OR manually select specific room
        │
        ▼
[Status: CHECKED_IN]
 - Room status → OCCUPIED
 - actual_check_in timestamp recorded
 - Security deposit posted to folio (if any)
        │
        ▼
[Active Stay]
 - Post service charges to folio (F&B, spa, laundry, etc.)
 - Daily Night Audit posts room charges automatically
        │
        ▼
[Check-Out]
 - Folio balance validated (must be settled)
 - Final payment recorded
 - Room status → AVAILABLE
 - Housekeeping status → DIRTY
 - Invoice email auto-sent to guest
        │
        ▼
[Archived in History / Reports]
```

---

### MODULE C: Walk-In Registration Form

**API Endpoint:** `POST /api/admin/reservations/walk-in/`

| Field | Required | Type | Choices / Notes |
|-------|----------|------|-----------------|
| `guest_email` | ✅ YES | Email | Unique — used to find or create guest account |
| `first_name` | ✅ YES | String | Guest first name |
| `room_type` | ✅ YES | Integer | Room type ID |
| `check_in_date` | ✅ YES | Date | Format: YYYY-MM-DD |
| `check_out_date` | ✅ YES | Date | Must be after check-in |
| `adults` | ✅ YES | Integer | Min: 1, Max: room capacity |
| `guest_phone` | No | String | Mobile/contact number |
| `last_name` | No | String | Guest last name |
| `designation` | No | Choice | MR, MRS, MS, DR, PROF |
| `date_of_birth` | No | Date | YYYY-MM-DD |
| `gender` | No | Choice | MALE, FEMALE, OTHER |
| `nationality` | No | String | e.g. Bangladeshi |
| `country` | No | String | Country of residence |
| `address` | No | String | Full home address |
| `occupation` | No | String | Profession/job |
| `id_type` | No | Choice | PASSPORT, NID, DRIVING_LICENSE |
| `id_number` | No | String | Document serial number |
| `visa_no` | No | String | Visa number (foreign guests) |
| `place_of_issue` | No | String | Where passport/NID was issued |
| `company_name` | No | String | Corporate billing company |
| `booking_source` | No | Choice | WEBSITE, PHONE, WALK_IN, OTA, AGENT, CORPORATE |
| `guest_type` | No | Choice | FIT, GROUP, CORPORATE, VIP, GOVERNMENT, DIPLOMATIC |
| `purpose_of_visit` | No | String | Tourism, Business, Medical, etc. |
| `coming_from` | No | String | City/place guest is coming from |
| `extra_bed` | No | Integer | Number of extra beds requested |
| `children` | No | Integer | Number of children |
| `arrival_time` | No | Time | Expected arrival time HH:MM |
| `rack_rate` | No | Decimal | Published room rate |
| `offer_rate` | No | Decimal | Discounted negotiated rate |
| `deposit_amount` | No | Decimal | Security deposit collected |
| `discount_amount` | No | Decimal | Total discount amount |
| `special_requests` | No | Text | Pillow preference, view, allergies, etc. |
| `room_id` | No | Integer | Pre-assign a specific room |

---

### MODULE D: Reservation Form (Future Booking)

**API Endpoint:** `POST /api/admin/reservations/create/`

All Walk-In fields are supported, PLUS the following additional fields:

| Field | Required | Type | Choices / Notes |
|-------|----------|------|-----------------|
| `status` | No | Choice | PENDING, CONFIRMED (default: CONFIRMED) |
| `rate_plan` | No | Integer | Rate plan ID (e.g. weekend package) |
| `meal_plan` | No | Choice | EP (Room Only), CP (+ Breakfast), MAP (+ 1 Meal), AP (All Inclusive) |
| `arrival_mode` | No | String | Flight / Bus / Train / Car |
| `vehicle_assigned` | No | String | Hotel car plate, driver details |
| `pickup_required` | No | Choice | YES, NO (default: NO) |
| `flight_pickup_no` | No | String | Arrival flight number |
| `flight_eta` | No | String | Estimated time of arrival |
| `drop_required` | No | Choice | YES, NO (default: NO) |
| `flight_drop_no` | No | String | Departure flight number |
| `flight_etd` | No | String | Estimated time of departure |
| `infants` | No | Integer | Number of infants |
| `num_rooms` | No | Integer | Rooms requested (group bookings), default: 1 |
| `contact_person` | No | String | Emergency contact name |
| `discount_pct` | No | Decimal | Discount percentage (e.g. 10 = 10%) |
| `service_charge_pct` | No | Decimal | Service charge % (e.g. 5 = 5%) |
| `vat_pct` | No | Decimal | VAT percentage (e.g. 15 = 15%) |
| `payment_amount` | No | Decimal | Advance payment on booking |
| `payment_method` | No | Choice | CASH, CARD, ONLINE, BANK_TRANSFER, POS |
| `profile_note` | No | Text | Permanent VIP note on guest profile |
| `notes_internal` | No | Text | Internal staff-only reservation notes |
| `dnm` | No | Boolean | Do Not Move — locks room assignment |
| `no_post` | No | Boolean | Block extra charge posting to folio |
| `is_travel_agency` | No | Boolean | Flags booking as travel agency sourced |
| `non_smoking` | No | Boolean | Non-smoking room preference |

---

### MODULE E: Check-In Form

**API Endpoint:** `POST /api/admin/reservations/<id>/check-in/`

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `room_id` | No | Integer | Override/assign specific room at check-in |
| `id_type` | No | Choice | PASSPORT, NID, DRIVING_LICENSE |
| `id_number` | No | String | ID document number verification |
| `deposit_amount` | No | Decimal | Collect deposit at desk |
| `guest_type` | No | Choice | FIT, VIP, CORPORATE, etc. |
| `purpose_of_visit` | No | String | Reason for stay |
| `coming_from` | No | String | Originating city/country |
| `extra_bed` | No | Integer | Extra beds added at check-in |
| `notes_internal` | No | Text | Handover/shift notes |

---

### MODULE F: Check-Out Form

**API Endpoint:** `POST /api/admin/reservations/<id>/check-out/`

| Field | Required | Type | Notes |
|-------|----------|------|-------|
| `payment_amount` | No | Decimal | Final balance settlement amount |
| `payment_method` | No | Choice | CASH, CARD, BANK_TRANSFER, POS |
| `notes_internal` | No | Text | Handover notes for next shift |

**Check-out Validation:**
- System calculates: `Total Charges (Room + Folio) - Total Payments`
- If balance > 0.01, check-out is BLOCKED until full payment is collected
- After success: room status → AVAILABLE, housekeeping → DIRTY

---

### MODULE G: Multi-Folio Charge Posting & Revenue Guard

**API Endpoint:** `POST /api/admin/bookings/<id>/folio/` (Posting to a specific window)

| Field | Required | Type | Choices / Notes |
|-------|----------|------|-----------------|
| `charge_type` | ✅ YES | Choice | ROOM, FOOD, BEVERAGE, PHONE, LAUNDRY, MINIBAR, SPA, SERVICE, TAX, DISCOUNT, DEPOSIT, REFUND |
| `description` | ✅ YES | String | Brief description (e.g. "Lunch – 2 persons") |
| `amount` | ✅ YES | Decimal | Unit price (cannot be zero) |
| `quantity` | ✅ YES | Integer | Quantity (auto-calculates total = amount × quantity) |
| `charge_date` | ✅ YES | Date | Date of charge |
| `reference` | No | String | POS bill number / receipt reference |

**Void / Adjustment (Revenue Guard):** `POST /api/admin/folio/<charge_id>/adjust/`
- Creates an immutable audit trail.
- Requires `reason_code` and `reason_note` (e.g. "MANAGER_APPROVAL").
- Charge is marked `is_adjustment=True`, not permanently deleted.

**Folio Transfer:** `POST /api/admin/bookings/<id>/folio-transfer/`
- Move a charge from one window to another window.

---

### MODULE H: Inventory & Requisition Module

#### Item Master
**API:** `GET/POST /api/inventory/items/`

| Field | Required | Notes |
|-------|----------|-------|
| `category` | ✅ YES | Category ID (Housekeeping, Food, Engineering, etc.) |
| `name` | ✅ YES | Item name (e.g. "Bath Towel") |
| `unit` | ✅ YES | kg, pieces, liters, bottles, reams |
| `unit_price` | No | Cost per unit in BDT |
| `current_stock` | No | Present on-hand quantity |
| `min_stock_level` | No | Low-stock alert threshold |

#### Requisition (Department Request)
**API:** `POST /api/inventory/requisitions/`

| Field | Required | Notes |
|-------|----------|-------|
| `department` | ✅ YES | e.g. Housekeeping, Restaurant, Engineering |
| `items` | ✅ YES | Array of `{item: ID, quantity: N}` |
| `notes` | No | Reason or additional instructions |

**Approval:** `POST /api/inventory/requisitions/<id>/approve/`
- Deducts stock from item inventory
- Posts a `StockTransaction` with type `OUT`
- Sets requisition status to `APPROVED`

**Rejection:** `POST /api/inventory/requisitions/<id>/reject/`
- Sets status to `REJECTED` — no stock deduction

#### Stock In (Purchase Entry)
**API:** `POST /api/inventory/stock-in/`

| Field | Required | Notes |
|-------|----------|-------|
| `item` | ✅ YES | Item ID |
| `quantity` | ✅ YES | Must be positive |
| `reference` | No | Invoice / challan number |

---

### MODULE I: Night Audit Engine

**API:** `GET /api/admin/night-audit/preview/` and `POST /api/admin/night-audit/execute/`

**Nightly Steps Executed:**
1. Identifies all `CHECKED_IN` bookings
2. Posts a `ROOM` folio charge to each guest's account for that night
3. Flags departures whose actual check-out is today
4. Rolls the hotel operational date forward
5. Generates a daily revenue summary (Top Sheet)

---

### MODULE J: Police Portal Export (BD Police Format)

**API:** `GET /api/admin/reports/police-export/?date=YYYY-MM-DD&format=json`

To export as CSV: `?format=csv`

**Fields included per guest record:**
- Sl. No., Hotel Name, Room Number
- Guest Name, Date of Birth, Gender
- Nationality, NID/Passport number, ID type
- Phone, Address, Occupation
- Check-in Date, Check-out Date
- Coming From, Purpose of Visit
- Guest Type, Visa No.

---

## 7. Room Model & Status Lifecycle

```
AVAILABLE → [Check-in] → OCCUPIED → [Check-out] → AVAILABLE
                                                         ↓
                                                    (Housekeeping assigned)
                                                    DIRTY → INSPECTED → AVAILABLE
```

**Room Housekeeping Statuses:** `CLEAN`, `DIRTY`, `INSPECTED`, `OUT_OF_ORDER`
**Room Statuses:** `AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `BLOCKED`

---

## 8. Public Website Booking Flow (Guest-Facing)

```
/rooms → Browse Room Types
       → Select dates + guests
       → POST /api/check-availability/
       → POST /api/bookings/ (creates PENDING booking)
       → POST /api/payments/initiate/ (SSLCommerz redirect)
       → SSLCommerz processes payment
       → POST /api/payments/success/ (webhook) → status = CONFIRMED
       → /booking-confirmation page shown
```

---

## 9. CMS Module (Website Content Management)

| Section | API Endpoint | Notes |
|---------|-------------|-------|
| Hero Slides | `/api/cms/hero-slides/` | Homepage carousel images & text |
| Gallery | `/api/cms/gallery/` | Photo gallery categories & images |
| FAQs | `/api/cms/faqs/` | Accordion Q&A content |
| News | `/api/cms/news/` | Hotel news & announcements |
| Testimonials | `/api/cms/testimonials/` | Guest review cards |
| Team | `/api/cms/team/` | Staff profile cards |
| Site Settings | `/api/cms/settings/` | Logo, hotel name, contact, map embed |
| Pages | `/api/cms/pages/` | Custom content pages |

---

## 10. Payment Integration (SSLCommerz)

| Step | Endpoint | Action |
|------|---------|--------|
| Initiate | `POST /api/payments/initiate/` | Creates SSLCommerz session, returns payment URL |
| Success | `POST /api/payments/success/` | Validates & marks payment COMPLETED |
| Fail | `POST /api/payments/fail/` | Marks payment FAILED |
| Cancel | `POST /api/payments/cancel/` | Marks payment cancelled |
| IPN | `POST /api/payments/ipn/` | Server-to-server instant payment notification |

**Config (via Django Admin):**
- `PaymentGatewayConfig` model stores Store ID, Store Password, Sandbox mode toggle

---

## 11. Key Business Validation Rules

1. **Business Date Adherence**: Operations (Folios, Night Audit) strictly align with `HotelConfig.business_date`.
2. **Check-in before Check-out**: `check_out_date > check_in_date` — enforced on all booking forms.
3. **Room Capacity**: `adults + children ≤ room_type.max_guests` — validated server-side.
4. **No Double Booking**: Availability check queries for overlapping date ranges with active bookings.
5. **Folio Settlement Required**: Check-out blocked if outstanding balance > BDT 0.01.
6. **Void Not Delete**: Folio charges are never hard-deleted; they're adjusted with audit trails and manager notes.
7. **Police Export**: Only `CHECKED_IN` or `CHECKED_OUT` bookings where `check_in_date ≤ date ≤ check_out_date` are included.

---

*Document generated: 2026-06-28 | Crown Hotel Management System*
