# Crown Hotel ERP - System Workflow & Module Documentation

This document provides a comprehensive overview of the workflows, modules, and data structures implemented in the Crown Hotel ERP system, meeting both local high-speed operational needs and OPERA PMS global standards.

## 1. Core Architecture & Engines
- **Business Date Engine**: The system does not rely on the OS clock for operations. Instead, it uses a centralized `HotelConfig.business_date`. This ensures that room rates, daily audits, and night-time turnovers are strictly controlled by the manager executing the Night Audit.
- **Multi-Folio Billing**: A single guest booking can contain up to 8 independent billing windows (folios). This allows front-desk staff to easily separate room charges, F&B charges, and company payments into different printable invoices.
- **Revenue Guard (Void-not-Delete)**: To prevent fraud, folio charges can never be permanently deleted from the database. Instead, they are marked as "Void" (Adjustment) and require a `Reason Code` (e.g., BILLING_ERROR, MANAGER_APPROVAL) and a mandatory `Manager Note`, ensuring a strict audit trail.

---

## 2. Front Desk Operations

### 2.1 Interactive 40-Room Grid Dashboard
- **Navigation**: The dashboard uses a visual grid layout for rooms.
- **Status Indicators**: Rooms are color-coded (Green: Available, Red: Occupied, Purple/OOO: Out of Order, Orange: Dirty).
- **Occupied Rooms**: Show the Guest's First Name and Nights Remaining (e.g., "3 Nts" or "Dpt Today").
- **Guest Panel**: Clicking a room populates the right sidebar with quick actions (Invoice, Folio Billing, Check-Out).

### 2.2 Keyboard-Driven Workflow
- **F-Keys**: Global shortcuts implemented for rapid navigation:
  - `F1`: Dashboard
  - `F2`: Walk-In Registration
  - `F3`: Quick Reservation
  - `F4`: Night Audit
  - `F5`: Bookings List
- **Enter-Key Navigation**: Inside modals (Walk-In, Reservation, Check-In), pressing `Enter` moves the cursor to the next input field, bypassing the need for mouse clicks (Bangladeshi fast-typing style).

---

## 3. Reservation & Registration Forms

### 3.1 Walk-In Registration Modal (`WalkInModal.tsx`)
This module combines Guest Profile creation, Reservation creation, and Check-In into a single rapid process.

**Required Fields (*):**
- First Name
- Email (for digital invoicing/contact)
- Room Type
- Check-in Date
- Check-out Date

**Available Data Fields:**
- **Personal**: Designation (Title), First Name*, Last Name, Gender, Date of Birth, Nationality, Country, Occupation.
- **Contact**: Email*, Mobile No, Address, Company Name, Business Source (Walk-in, Phone, OTA, etc.).
- **Identity (Dynamic)**: 
  - If foreigner: Passport No, Place of Issue, Visa No.
  - If local: ID Type (NID/Passport/Driving License), ID Number.
- **Stay**: Room Type*, Check-in/out Dates*, Room No (auto-assigned), Type of Guest (FIT, Corporate, VIP), Arrival Time, Purpose of Visit, Coming From.
- **Rates**: PAX (Adults, Child, Extra Bed), Rack Rate, Offer Rate, Discount Amount, Deposit Amount. (Total Price is auto-calculated).
- **Remarks**: Special requests textarea.

### 3.2 Advanced Reservation Entry (`ReservationModal.tsx`)
A classic PMS-style reservation form allowing comprehensive pre-arrival data entry.

**Required Fields (*):**
- First Name
- Email
- Room Type
- Check-out Date

**Available Data Fields:**
- *Includes all fields from Walk-In, plus:*
- **Status**: Confirmed or Pending.
- **Transport details**: Pickup Required (Y/N), Flight ETA, Drop Required (Y/N), Flight ETD.
- **Discounts**: Discount Percentage (%) or fixed amount logic, which auto-adjusts Net Rate.
- **Taxes**: Service Charge %, VAT % (Calculates the Grand Total dynamically).
- **Billing Flags**: DNM (Do Not Move), No Post (Prevent F&B POS charges), Travel Agency indicator.

### 3.3 Check-In Modal (`CheckInModal.tsx`)
Used for guests who have a prior reservation and are arriving at the property.

**Data Fields:**
- Room Assignment (Auto-selects best available room)
- ID Type & ID Number verification
- Security Deposit Amount ($)
- Internal Notes (for staff)

---

## 4. Multi-Folio Billing Module (`GuestFolio.tsx`)

This module handles all guest accounting and ledger operations.

**Features:**
- **Window Tabs**: Dynamically create up to 8 windows (e.g., Window 1: Room Rent, Window 2: Spa & Minibar).
- **Posting Charges**: Select Type (Room, Food, Spa, Tax), add Description, Amount, and Qty.
- **Transfers**: Transfer a charge from one window to another (e.g., routing room rent to a company folio).
- **Adjustments/Voids**: Clicking the "Block" icon triggers the Revenue Guard modal. The user must provide a valid `Reason Code` and text note to authorize the void.

---

## 5. Night Audit Engine
- The Night Audit freezes the day's operations, posts recurring room charges automatically, verifies zero-balance check-outs, and rolls the `business_date` forward to the next day.
- Generates the Daily Revenue Report and Shift summaries.

---
## Summary of Transformation
The system now blends the speed required by high-volume local environments (keyboard navigation, Enter-key forms, minimal mouse usage) with the stringent financial controls and dynamic data capabilities expected from a global PMS like OPERA (multi-folio, business dates, strict audit logs).
