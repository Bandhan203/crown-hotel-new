"""Generate Crown HMS System Documentation PDF."""
import io
import os
import sys
from datetime import date

# Setup Django path for optional imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUTPUT_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'docs',
    'Crown_HMS_System_Documentation.pdf',
)


def build_pdf():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    doc = SimpleDocTemplate(
        OUTPUT_PATH,
        pagesize=A4,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        title='Crown HMS System Documentation',
    )

    styles = getSampleStyleSheet()
    title = ParagraphStyle('DocTitle', parent=styles['Title'], fontSize=22,
                           textColor=colors.HexColor('#0f766e'), spaceAfter=6)
    subtitle = ParagraphStyle('DocSub', parent=styles['Normal'], fontSize=11,
                              textColor=colors.HexColor('#64748b'), alignment=TA_CENTER, spaceAfter=14)
    h1 = ParagraphStyle('H1', parent=styles['Heading1'], fontSize=16,
                        textColor=colors.HexColor('#0f766e'), spaceBefore=14, spaceAfter=8)
    h2 = ParagraphStyle('H2', parent=styles['Heading2'], fontSize=12,
                        textColor=colors.HexColor('#334155'), spaceBefore=10, spaceAfter=6)
    body = ParagraphStyle('Body', parent=styles['Normal'], fontSize=9.5,
                          leading=14, alignment=TA_JUSTIFY, spaceAfter=6)
    bullet = ParagraphStyle('Bullet', parent=body, leftIndent=14, bulletIndent=0, spaceAfter=3)
    mono = ParagraphStyle('Mono', parent=body, fontName='Courier', fontSize=8.5, backColor=colors.HexColor('#f8fafc'))
    small = ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=colors.grey)

    story = []

  # Cover
    story.append(Spacer(1, 30 * mm))
    story.append(Paragraph('Crown Hotel Management System', title))
    story.append(Paragraph('Crown HMS — Complete System Documentation', subtitle))
    story.append(Paragraph(f'Generated: {date.today().strftime("%B %d, %Y")}', subtitle))
    story.append(Spacer(1, 8 * mm))
    story.append(HRFlowable(width='100%', thickness=1, color=colors.HexColor('#0f766e')))
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(
        'Django REST API + React 19 / TypeScript / Vite<br/>'
        'Property Management System (PMS) + Public Website + Online Booking',
        ParagraphStyle('CoverBody', parent=body, alignment=TA_CENTER),
    ))
    story.append(PageBreak())

    def section(title_text, items):
        story.append(Paragraph(title_text, h1))
        for item in items:
            story.append(Paragraph(f'• {item}', bullet))

    def table(headers, rows, col_widths=None):
        data = [headers] + rows
        t = Table(data, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0f766e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8.5),
            ('GRID', (0, 0), (-1, -1), 0.4, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        story.append(t)
        story.append(Spacer(1, 6))

    # 1. Overview
    story.append(Paragraph('1. System Overview', h1))
    story.append(Paragraph(
        'Crown HMS is a full hotel management platform combining a public marketing website, '
        'online guest booking with SSLCommerz payments, and a comprehensive admin PMS for '
        'front desk, folio billing, checkout, night audit, housekeeping, and reporting.',
        body,
    ))
    table(
        ['Layer', 'Technology'],
        [
            ['Backend', 'Django + Django REST Framework'],
            ['Authentication', 'JWT (access / refresh tokens)'],
            ['Frontend', 'React 19, TypeScript, Vite, Tailwind CSS'],
            ['Database', 'SQLite (development)'],
            ['Payments', 'SSLCommerz gateway'],
            ['PDF Generation', 'ReportLab'],
            ['API Base URL', '/api/'],
        ],
        [80, 360],
    )

    # 2. Architecture
    story.append(Paragraph('2. System Architecture', h1))
    story.append(Paragraph(
        '<b>Public Layer:</b> Marketing pages, room catalog, online booking, guest portal (My Bookings).<br/>'
        '<b>Admin PMS Layer:</b> Dashboard, Front Desk, Registration, Folio, Checkout, Night Audit, Reports.<br/>'
        '<b>Backend Layer:</b> 11 Django apps under /api/ — bookings and dashboard are the core PMS engines.',
        body,
    ))
    table(
        ['Django App', 'Purpose'],
        [
            ['accounts', 'Users, JWT auth, guest profiles'],
            ['bookings', 'Reservations, folio, payments, checkout, registration'],
            ['dashboard', 'Stats, room grid, night audit, reports, HotelConfig'],
            ['rooms', 'Room types, inventory, housekeeping'],
            ['cms', 'Website content (news, FAQ, hero, gallery)'],
            ['restaurant / spa / services', 'Amenity & F&B content'],
            ['contact', 'Contact form inbox'],
            ['staff', 'Staff profiles & module permissions'],
            ['inventory', 'Stock, requisitions, ledger'],
        ],
        [90, 350],
    )

    # 3. Data model
    story.append(PageBreak())
    story.append(Paragraph('3. Database Architecture & Financial Model', h1))
    story.append(Paragraph('3.1 Core Entities', h2))
    table(
        ['Entity', 'Role'],
        [
            ['Booking', 'Reservation master — dates, status, room, pricing'],
            ['Registration', 'Guest registration card — check-in source of truth'],
            ['FolioCharge', 'Posted charges (room, F&B, deposit, tax) — up to 8 windows'],
            ['Payment', 'Cash/card/credit settlements; is_refund for payouts'],
            ['FolioWindow', 'Up to 8 folio windows per booking'],
            ['FolioAuditLog', 'Immutable transfer & void/adjustment audit'],
            ['HotelConfig', 'Singleton — business date, hotel name, night audit PIN'],
            ['NightAuditLog', 'Daily close snapshot'],
            ['Room / RoomType', 'Physical inventory & categories'],
            ['CustomUser / GuestProfile', 'Authentication & guest identity'],
        ],
        [100, 340],
    )

    story.append(Paragraph('3.2 Revenue Guard Formula', h2))
    story.append(Paragraph(
        'Folio Balance = Sum(FolioCharge, non-void) − Net Payments<br/>'
        'Net Payments = Receipts − Refunds (Payment.is_refund=True)<br/>'
        'Checkout blocked unless |balance| ≤ BDT 0.01<br/>'
        'All checkout transactions recorded against HotelConfig.business_date (not OS clock).',
        mono,
    ))

    story.append(Paragraph('3.3 Booking Status Lifecycle', h2))
    story.append(Paragraph(
        'PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT<br/>'
        'Branches: CANCELLED (from PENDING/CONFIRMED), NO_SHOW (from CONFIRMED)<br/>'
        'Direct status PATCH to CHECKED_IN is blocked — Registration workflow required.',
        body,
    ))

    story.append(Paragraph('3.4 Room Status Lifecycle', h2))
    story.append(Paragraph(
        'AVAILABLE ↔ RESERVED (expected arrival) → OCCUPIED (check-in) → AVAILABLE (checkout)<br/>'
        'After checkout: housekeeping_status = DIRTY (orange on dashboard grid)<br/>'
        'HK flow: DIRTY → INSPECTED → CLEAN → AVAILABLE (Room Ready button)',
        body,
    ))

    # 4. Admin modules
    story.append(PageBreak())
    story.append(Paragraph('4. Admin Module Catalog', h1))
    table(
        ['Module', 'Route', 'Purpose'],
        [
            ['Dashboard', '/admin', 'Room grid, guest panel, KPIs, folio preview'],
            ['Front Desk', '/admin/front-desk', 'Arrivals, departures, in-house'],
            ['Check-out', '/admin/checkout', 'Revenue Guard settlement module'],
            ['Calendar', '/admin/reservations/calendar', 'Room-wise booking calendar'],
            ['Res. Control', '/admin/reservation-control', 'Availability matrix'],
            ['Rate Plans', '/admin/rate-plans', 'Discount rules, meal plans'],
            ['Bookings', '/admin/bookings', 'All bookings management (AG Grid)'],
            ['Guests', '/admin/guests', 'Guest profiles & stay history'],
            ['Housekeeping', '/admin/housekeeping', 'Room HK status board'],
            ['Night Audit', '/admin/night-audit', 'End-of-day close, business date +1'],
            ['Reports', '/admin/reports', 'Occupancy, revenue, ledger, police export'],
            ['Rooms', '/admin/rooms', 'Room types & physical rooms'],
            ['Corporate CRM', '/admin/corporate', 'Company accounts'],
            ['Inventory', '/admin/inventory', 'Stock & requisitions'],
            ['Staff', '/admin/staff', 'Staff users & permissions'],
            ['CMS / Branding', '/admin/cms/*', 'Website content management'],
            ['Settings', '/admin/settings', 'Hotel configuration'],
        ],
        [85, 115, 240],
    )

    story.append(Paragraph('4.1 Public Website Modules', h2))
    table(
        ['Module', 'Route', 'Purpose'],
        [
            ['Home / About / Team', '/', '/about', '/team', 'Marketing'],
            ['Rooms', '/rooms', '/room-details', 'Catalog + online booking'],
            ['Restaurant / Spa / Services', '/restaurant, /spa, /services', 'Amenities'],
            ['Gallery / News / FAQ', '/gallery, /news, /faq', 'CMS content'],
            ['Contact', '/contact', 'Inquiry form'],
            ['Guest Portal', '/my-bookings', 'Bookings + invoice download'],
            ['Auth', '/login', '/register', 'Guest account (not hotel check-in)'],
        ],
        [90, 130, 220],
    )

    # 5. Workflows
    story.append(PageBreak())
    story.append(Paragraph('5. Core Workflows', h1))

    story.append(Paragraph('5.1 Online Guest Booking (Public)', h2))
    section('', [
        'Guest browses /rooms → /room-details',
        'GET /api/check-availability/ — verify dates & room type',
        'POST /api/bookings/ — create booking (PENDING/CONFIRMED)',
        'POST /api/payments/initiate/ — SSLCommerz payment session',
        'Callback: /payment/success | fail | cancel',
        'Guest views bookings at /my-bookings, downloads invoice PDF',
    ])

    story.append(Paragraph('5.2 Advance Reservation (Admin)', h2))
    section('', [
        'Entry: Front Desk, Reservation Control, or Dashboard',
        'ReservationModal — guest details, room type, rate plan, pricing',
        'ReservationWorkflowDialogs — multi-room split, currency (USD/BDT), voucher PDF',
        'API: POST /api/admin/reservations/create/ → finalize/ → confirmation/pdf/',
        'Creates Booking (CONFIRMED) + linked Registration record',
        'Room may show RESERVED (orange) on dashboard grid',
    ])

    story.append(Paragraph('5.3 Walk-in Registration & Check-in', h2))
    section('', [
        'Entry: Front Desk → Walk-in (F2 shortcut)',
        'RegistrationModule (mode=walk-in) — guest + room + rate in one flow',
        'API: POST /api/admin/registrations/ → PUT → POST .../check-in/',
        'Result: Booking CHECKED_IN, Room OCCUPIED, folio opened',
        'Registration card PDF + optional ID document upload',
    ])

    story.append(Paragraph('5.4 Advance Check-in (Reserved Guest)', h2))
    section('', [
        'Entry: Front Desk → Arrivals tab → Check-in icon',
        'RegistrationModule (mode=advance) hydrates from Registration + Booking',
        'Verify guest ID, assign room, complete registration',
        'API: POST /api/admin/registrations/{id}/check-in/',
        'Alternative: No-show via PATCH /api/admin/reservations/{id}/no-show/',
    ])

    story.append(PageBreak())
    story.append(Paragraph('5.5 In-Stay Folio Management', h2))
    section('', [
        'Entry: Dashboard (select room) or BookingManagement → GuestFolio modal',
        'Up to 8 folio windows (W1–W8) per booking',
        'Post charges: Room, F&B, Service, Tax, Deposit, etc.',
        'Transfer charges between windows — FolioAuditLog recorded',
        'Void/Adjustment only (no delete) — Reason Code + Manager Note required',
        'API: /folio-windows/, /folio-transfer/, /folio/{id}/adjust/',
    ])

    story.append(Paragraph('5.6 Guest Check-out (Revenue Guard)', h2))
    section('', [
        'Entry: /admin/checkout or Front Desk → Check-out icon',
        'Step A: Room number + Enter — validate OCCUPIED, load folio summary',
        'Step B: Invoice Preview PDF, transfer charges between windows',
        'Step C: If balance > 0 → Receive Payment (Cash/Card/Company Credit)',
        'Step C: If balance < 0 → Post Refund (Cash/Card)',
        'Two-step payment confirmation dialogs',
        'Step D: Authorization (CHECKOUT phrase or login password)',
        'Step D: Execute Checkout — booking CHECKED_OUT, room DIRTY',
        'Post-checkout: Duplicate Bill PDF, Room Ready (HK)',
        'API: /checkout/lookup/, /payment/, /execute/, /duplicate-bill/',
    ])

    story.append(Paragraph('5.7 Night Audit (End of Day)', h2))
    section('', [
        'Entry: /admin/night-audit (F4 shortcut)',
        'Preview: room charges, no-shows, overdue checkouts, revenue',
        'Enter Night Audit PIN → POST /api/admin/night-audit/run/',
        'Business date advances by 1 day (HotelConfig.business_date)',
        'NightAuditLog saved with occupancy & revenue snapshot',
    ])

    story.append(Paragraph('5.8 Housekeeping', h2))
    section('', [
        'Housekeeping Board: view/update all room HK statuses',
        'PATCH /api/admin/rooms/{id}/housekeeping-status/',
        'Post-checkout: POST /api/admin/rooms/{id}/room-ready/',
        'Flow: DIRTY → INSPECTED → CLEAN → AVAILABLE',
    ])

    # 6. API summary
    story.append(PageBreak())
    story.append(Paragraph('6. API Reference Summary', h1))
    table(
        ['Domain', 'Prefix', 'Key Endpoints'],
        [
            ['Auth', '/api/auth/', 'register, login, logout, me, profile'],
            ['Bookings', '/api/admin/bookings/', 'CRUD, folio, invoice, payments'],
            ['Front Desk', '/api/admin/reservations/', 'create, check-in, check-out, arrivals'],
            ['Checkout', '/api/admin/checkout/', 'lookup, payment, execute, invoice'],
            ['Registration', '/api/admin/registrations/', 'create, detail, check-in'],
            ['Dashboard', '/api/dashboard/', 'stats, room-grid, night-audit, reports'],
            ['Config', '/api/admin/config/', 'HotelConfig (business date)'],
            ['Rooms / HK', '/api/admin/rooms/', 'CRUD, housekeeping, room-ready'],
            ['Payments', '/api/payments/', 'SSLCommerz initiate, IPN, callbacks'],
            ['CMS', '/api/', 'hero, news, faq, gallery, site-settings'],
            ['Inventory', '/api/inventory/', 'items, requisitions, stock-in'],
        ],
        [75, 115, 250],
    )

    # 7. PDF documents
    story.append(Paragraph('7. Generated PDF Documents', h1))
    table(
        ['Document', 'When', 'API Endpoint'],
        [
            ['Reservation voucher', 'After reservation save', '/admin/reservations/{id}/confirmation/pdf/'],
            ['Registration card', 'After check-in', '/admin/reservations/{id}/registration/pdf/'],
            ['Invoice preview', 'During checkout', '/admin/checkout/{id}/invoice-preview/'],
            ['Duplicate bill', 'After checkout', '/admin/checkout/duplicate-bill/?ref='],
            ['Guest invoice', 'My Bookings portal', '/bookings/my/{id}/invoice/pdf/'],
            ['Reservation control', 'Reports', '/admin/reports/reservation-control/pdf/'],
            ['Police export', 'Compliance', '/admin/reports/police-export/'],
        ],
        [100, 130, 210],
    )

    # 8. Roles & shortcuts
    story.append(Paragraph('8. User Roles & Keyboard Shortcuts', h1))
    table(
        ['Role', 'Access'],
        [
            ['GUEST', 'Public site, My Bookings, online payment'],
            ['STAFF', 'API IsStaffUser — front desk operations'],
            ['ADMIN', 'Full admin UI (ProtectedRoute)'],
        ],
        [80, 360],
    )
    story.append(Spacer(1, 4))
    story.append(Paragraph('Admin Keyboard Shortcuts (AdminLayout):', h2))
    table(
        ['Key', 'Action'],
        [
            ['F1', 'Dashboard'],
            ['F2', 'Walk-in (Front Desk)'],
            ['F3', 'New Reservation'],
            ['F4', 'Night Audit'],
            ['F5–F11', 'Bookings, Guests, Reports, Inventory, HK, etc.'],
        ],
        [60, 380],
    )

    # 9. Design principles
    story.append(Paragraph('9. Key Design Principles', h1))
    section('', [
        'Registration table = single source of truth for check-in guest data',
        'Revenue Guard: checkout blocked unless folio balance is zero (±BDT 0.01)',
        'Business date from HotelConfig — not server OS clock',
        'Charges never deleted — void/adjustment with mandatory reason code',
        '8 folio windows for corporate / split billing',
        'Normalized payments: receipts vs refunds via Payment.is_refund',
        'Immutable FolioAuditLog for transfers and adjustments',
    ])

    # 10. End-to-end journey
    story.append(PageBreak())
    story.append(Paragraph('10. End-to-End Guest Journey', h1))
    story.append(Paragraph(
        '<b>Phase 1 — Book:</b> Reservation or online booking → Booking CONFIRMED<br/>'
        '<b>Phase 2 — Arrive:</b> Registration Module → Check-in → Room OCCUPIED + Folio opened<br/>'
        '<b>Phase 3 — Stay:</b> Post F&B/Service charges, transfer windows, collect deposits<br/>'
        '<b>Phase 4 — Depart:</b> Checkout Module → Settle balance = 0 → CHECKED_OUT → Room DIRTY<br/>'
        '<b>Phase 5 — Close Day:</b> Night Audit → Business date +1 → Reports',
        body,
    ))

    story.append(Spacer(1, 12))
    story.append(HRFlowable(width='100%', thickness=0.5, color=colors.grey))
    story.append(Paragraph(
        'Crown HMS System Documentation — Hotel Crown<br/>'
        'For technical support, refer to the development team.',
        ParagraphStyle('Footer', parent=small, alignment=TA_CENTER, spaceBefore=8),
    ))

    doc.build(story)
    return OUTPUT_PATH


if __name__ == '__main__':
    path = build_pdf()
    print(f'PDF generated: {path}')
