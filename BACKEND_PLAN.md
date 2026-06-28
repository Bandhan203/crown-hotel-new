# Navy Hotel Management System — Backend Implementation Plan

> **Tech Stack:** Python (Django), Django REST Framework, MySQL, Redis, Celery, JWT Auth  
> **Frontend:** React 19 + TypeScript + Tailwind CSS (already built)

---

## Phase 1: Project Setup & Configuration

### Step 1.1 — Django Project Scaffolding
- Initialize Django project: `django-admin startproject config .` inside `backend/`
- Create a virtual environment (`venv`) and `requirements.txt`
- Core packages to install:
  ```
  django
  djangorestframework
  djangorestframework-simplejwt
  django-cors-headers
  mysqlclient
  celery
  redis
  django-filter
  Pillow              # image handling
  python-decouple     # env variables
  ```
- Create `.env` file for secrets (DB creds, SECRET_KEY, allowed hosts, etc.)

### Step 1.2 — Django Apps Structure
Create these Django apps (modular, one responsibility each):

| App | Responsibility |
|-----|----------------|
| `accounts` | User model, registration, login, JWT, roles (Guest/Staff/Admin) |
| `rooms` | Room types, room instances, amenities, pricing |
| `bookings` | Reservations, check-in/out, availability, payment |
| `restaurant` | Menu items, categories, gallery |
| `spa` | Spa services, pricing |
| `services` | General hotel services, facilities |
| `cms` | News/blog posts, FAQ, testimonials, team, gallery, hero slides |
| `contact` | Contact form submissions |
| `staff` | Staff management, permission-based module access |
| `dashboard` | Admin & guest dashboard aggregation endpoints |

### Step 1.3 — Settings & Configuration
- Split settings: `base.py`, `development.py`, `production.py`
- Configure:
  - MySQL database connection
  - Redis as cache + Celery broker
  - CORS (allow frontend origin `http://localhost:5173`)
  - JWT settings (access: 30min, refresh: 7days)
  - Media/static file handling
  - Security middleware (XSS, CSRF, Clickjacking, Host Header validation)

---

## Phase 2: Database Models & Migrations

### Step 2.1 — Custom User Model (`accounts`)
```
CustomUser
├── id (PK)
├── email (unique, used as USERNAME_FIELD)
├── full_name
├── phone (optional)
├── role (enum: GUEST, STAFF, ADMIN)
├── is_active, is_staff, is_superuser
├── avatar (ImageField, optional)
├── date_joined
└── last_login
```

### Step 2.2 — Room Models (`rooms`)
```
RoomType
├── id (PK)
├── name (e.g., "Junior Suite")
├── slug
├── description (rich text)
├── price_per_night (Decimal)
├── max_guests
├── beds
├── size (sq ft)
├── view_type (e.g., "City View", "Sea View")
├── is_featured
├── created_at / updated_at

RoomImage
├── id (PK)
├── room_type (FK → RoomType)
├── image (ImageField)
├── is_primary (bool)
├── order (int)

RoomAmenity
├── id (PK)
├── name (e.g., "WiFi", "Breakfast")
├── icon (CharField — icon class name)

RoomType ↔ RoomAmenity (M2M through table)

Room (physical room instances)
├── id (PK)
├── room_type (FK → RoomType)
├── room_number (unique, e.g., "301")
├── floor
├── status (enum: AVAILABLE, OCCUPIED, MAINTENANCE, RESERVED)
```

### Step 2.3 — Booking Models (`bookings`)
```
Booking
├── id (PK)
├── booking_ref (unique, auto-generated)
├── guest (FK → CustomUser)
├── room (FK → Room)
├── room_type (FK → RoomType)
├── check_in_date
├── check_out_date
├── adults (1-4)
├── children (0-3)
├── total_price (Decimal)
├── status (enum: PENDING, CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED)
├── special_requests (text, optional)
├── created_at / updated_at

Payment
├── id (PK)
├── booking (FK → Booking)
├── amount (Decimal)
├── payment_method (enum: CARD, CASH, ONLINE)
├── transaction_id (from gateway)
├── status (enum: PENDING, COMPLETED, FAILED, REFUNDED)
├── paid_at
```

### Step 2.4 — Restaurant Models (`restaurant`)
```
MenuCategory
├── id (PK)
├── name (e.g., "Starters", "Main Course")
├── order (int)

MenuItem
├── id (PK)
├── category (FK → MenuCategory)
├── name
├── description
├── price (Decimal)
├── image (optional)
├── is_available (bool)

RestaurantGallery
├── id (PK)
├── image (ImageField)
├── caption (optional)
├── order (int)
```

### Step 2.5 — Spa Models (`spa`)
```
SpaService
├── id (PK)
├── name
├── description
├── price (Decimal)
├── duration (minutes)
├── image (ImageField)
├── is_available (bool)
```

### Step 2.6 — Services & Facilities (`services`)
```
HotelService
├── id (PK)
├── name
├── description
├── icon (CharField — icon class)
├── order (int)

Facility
├── id (PK)
├── name
├── description
├── icon (CharField)
├── image (ImageField, optional)
├── order (int)
```

### Step 2.7 — CMS Models (`cms`)
```
HeroSlide
├── id (PK)
├── subtitle, title
├── background_image
├── cta_text, cta_link
├── order (int)
├── is_active (bool)

NewsPost
├── id (PK)
├── title, slug
├── category
├── content (rich text)
├── excerpt
├── image
├── author (FK → CustomUser)
├── is_published (bool)
├── published_at
├── created_at / updated_at

FAQ
├── id (PK)
├── question
├── answer
├── order (int)
├── is_active (bool)

Testimonial
├── id (PK)
├── guest_name
├── guest_role (e.g., "Business Traveler")
├── content (text)
├── avatar (ImageField, optional)
├── rating (1-5)
├── is_active (bool)

TeamMember
├── id (PK)
├── name
├── role (e.g., "General Manager")
├── image
├── bio (optional)
├── social_links (JSONField: {facebook, twitter, instagram, linkedin})
├── order (int)

GalleryImage
├── id (PK)
├── image
├── category (enum: ROOMS, RESTAURANT, SPA, POOL, EXTERIOR)
├── caption (optional)
├── order (int)

SiteSetting (singleton/key-value)
├── key (unique: "hotel_name", "phone", "email", "address", etc.)
├── value (text)
```

### Step 2.8 — Contact Model (`contact`)
```
ContactMessage
├── id (PK)
├── name
├── email
├── phone (optional)
├── subject (optional)
├── message (text)
├── is_read (bool, default=False)
├── created_at
```

### Step 2.9 — Staff Model (`staff`)
```
StaffProfile
├── id (PK)
├── user (OneToOne → CustomUser where role=STAFF)
├── department
├── position
├── hire_date
├── is_active (bool)

StaffPermission
├── id (PK)
├── staff (FK → StaffProfile)
├── module (enum: ROOMS, BOOKINGS, GUESTS, RESTAURANT, SPA, CMS, STAFF)
├── can_view, can_create, can_edit, can_delete (booleans)
```

---

## Phase 3: Authentication & Authorization

### Step 3.1 — JWT Authentication Setup
- Configure `djangorestframework-simplejwt`
- Endpoints:
  ```
  POST /api/auth/register/          → Create guest account
  POST /api/auth/login/             → Returns {access, refresh} tokens
  POST /api/auth/token/refresh/     → Refresh access token
  POST /api/auth/logout/            → Blacklist refresh token
  POST /api/auth/forgot-password/   → Send reset email (Celery task)
  POST /api/auth/reset-password/    → Confirm password reset
  GET  /api/auth/me/                → Current user profile
  PUT  /api/auth/me/                → Update profile
  ```

### Step 3.2 — Role-Based Permissions
- Custom permission classes:
  - `IsAdmin` — full access
  - `IsStaff` — module-based access (check StaffPermission)
  - `IsGuest` — own bookings/profile only
  - `IsAdminOrStaff` — combined
- Apply per-view or per-viewset

### Step 3.3 — Security Hardening
- Django middleware: `SecurityMiddleware`, `XFrameOptionsMiddleware`
- CSRF protection for session views (admin panel)
- CORS whitelist (only frontend origin)
- Rate limiting on auth endpoints (django-ratelimit or DRF throttling)
- Input sanitization (bleach for rich text fields)
- Host header validation in ALLOWED_HOSTS

---

## Phase 4: REST API Endpoints

### Step 4.1 — Public APIs (no auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rooms/` | List all room types (filterable, paginated) |
| GET | `/api/rooms/{slug}/` | Room type detail with images & amenities |
| POST | `/api/check-availability/` | Check room availability for date range |
| GET | `/api/restaurant/menu/` | Menu items grouped by category |
| GET | `/api/restaurant/gallery/` | Restaurant gallery images |
| GET | `/api/spa/services/` | Spa services list |
| GET | `/api/services/` | Hotel services list |
| GET | `/api/facilities/` | Facilities list |
| GET | `/api/gallery/` | Gallery images (filterable by category) |
| GET | `/api/news/` | Published blog posts (paginated) |
| GET | `/api/news/{slug}/` | Single blog post detail |
| GET | `/api/faq/` | Active FAQs |
| GET | `/api/team/` | Team members |
| GET | `/api/testimonials/` | Active testimonials |
| GET | `/api/hero-slides/` | Active hero slides (ordered) |
| GET | `/api/site-settings/` | Public site settings (phone, email, address) |
| POST | `/api/contact/` | Submit contact form (rate-limited) |

### Step 4.2 — Guest APIs (JWT auth required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/me/` | Get own profile |
| PUT | `/api/auth/me/` | Update own profile |
| POST | `/api/bookings/` | Create a booking |
| GET | `/api/bookings/my/` | List own bookings |
| GET | `/api/bookings/my/{id}/` | Own booking detail |
| PATCH | `/api/bookings/my/{id}/cancel/` | Cancel own booking |
| POST | `/api/payments/initiate/` | Initiate payment for booking |
| GET | `/api/payments/verify/{txn_id}/` | Verify payment callback |

### Step 4.3 — Admin APIs (Admin role required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| **Dashboard** | | |
| GET | `/api/admin/dashboard/` | Stats (occupancy, revenue, bookings, guests) |
| **Rooms** | | |
| CRUD | `/api/admin/room-types/` | Manage room types |
| CRUD | `/api/admin/rooms/` | Manage physical rooms |
| CRUD | `/api/admin/amenities/` | Manage amenities |
| **Bookings** | | |
| GET | `/api/admin/bookings/` | All bookings (filterable, sortable — AG Grid) |
| PATCH | `/api/admin/bookings/{id}/status/` | Update booking status (check-in/out) |
| **Guests** | | |
| GET | `/api/admin/guests/` | All guest accounts |
| GET | `/api/admin/guests/{id}/` | Guest detail + booking history |
| **CMS** | | |
| CRUD | `/api/admin/news/` | Manage blog posts |
| CRUD | `/api/admin/faq/` | Manage FAQs |
| CRUD | `/api/admin/testimonials/` | Manage testimonials |
| CRUD | `/api/admin/team/` | Manage team members |
| CRUD | `/api/admin/gallery/` | Manage gallery images |
| CRUD | `/api/admin/hero-slides/` | Manage hero slides |
| CRUD | `/api/admin/site-settings/` | Manage site settings |
| **Restaurant & Spa** | | |
| CRUD | `/api/admin/menu-categories/` | Manage menu categories |
| CRUD | `/api/admin/menu-items/` | Manage menu items |
| CRUD | `/api/admin/spa-services/` | Manage spa services |
| **Staff** | | |
| CRUD | `/api/admin/staff/` | Manage staff accounts |
| CRUD | `/api/admin/staff/{id}/permissions/` | Manage staff permissions |
| **Contact** | | |
| GET | `/api/admin/contacts/` | View contact submissions |
| PATCH | `/api/admin/contacts/{id}/read/` | Mark as read |
| **Settings** | | |
| GET/PUT | `/api/admin/settings/` | System settings |

### Step 4.4 — Staff APIs (Staff role + permission check)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/staff/dashboard/` | Staff-specific dashboard |
| * | `/api/staff/bookings/` | If has BOOKINGS permission |
| * | `/api/staff/rooms/` | If has ROOMS permission |
| * | `/api/staff/guests/` | If has GUESTS permission |
| etc. | (mirrors admin but filtered by StaffPermission) | |

---

## Phase 5: Serializers & Validation

### Step 5.1 — Serializer Strategy
- **List serializers** — minimal fields (for cards/grids)
- **Detail serializers** — full nested data (for detail pages)
- **Create/Update serializers** — with write validation
- Example:
  ```
  RoomTypeListSerializer   → id, name, slug, price, primary_image, beds, max_guests, size
  RoomTypeDetailSerializer → all fields + images[] + amenities[] + hotel_rules
  BookingCreateSerializer  → room_type, check_in, check_out, adults, children, special_requests
  ```

### Step 5.2 — Validation Rules
- Booking: check_out > check_in, no overlapping bookings, max guests
- Registration: unique email, password strength, phone format
- Payment: amount matches booking total
- Contact: rate limit per IP (max 5/hour)
- CMS: slug uniqueness, image size limits

---

## Phase 6: Background Tasks (Celery + Redis)

### Step 6.1 — Celery Configuration
- `celery.py` in config module
- Redis as broker and result backend
- Beat scheduler for periodic tasks

### Step 6.2 — Async Tasks
| Task | Trigger | Description |
|------|---------|-------------|
| `send_booking_confirmation_email` | After booking created | Email with booking details |
| `send_booking_confirmation_sms` | After booking created | SMS notification |
| `send_password_reset_email` | Forgot password request | Reset link email |
| `send_welcome_email` | After registration | Welcome email to guest |
| `send_contact_notification` | Contact form submitted | Notify admin of new message |
| `send_checkout_reminder` | Celery Beat (daily) | Remind guests of upcoming checkout |
| `generate_daily_report` | Celery Beat (daily) | Revenue/occupancy summary for admin |
| `cleanup_expired_bookings` | Celery Beat (hourly) | Cancel unpaid pending bookings after timeout |

---

## Phase 7: Payment Gateway Integration

### Step 7.1 — Payment Flow
1. Guest creates booking → status = PENDING
2. Frontend calls `POST /api/payments/initiate/` → returns gateway redirect URL
3. Guest completes payment on gateway
4. Gateway sends webhook/callback → `POST /api/payments/webhook/`
5. Verify payment → update Booking status to CONFIRMED
6. Celery sends confirmation email + SMS

### Step 7.2 — Gateway Options
- **SSLCommerz** or **Stripe** (choose based on region)
- Abstract payment gateway behind an interface for swapability

---

## Phase 8: Admin Dashboard Data Endpoints

### Step 8.1 — Dashboard Stats
```json
GET /api/admin/dashboard/
{
  "total_rooms": 200,
  "occupied_rooms": 145,
  "occupancy_rate": 72.5,
  "total_bookings_today": 12,
  "total_revenue_month": 125000.00,
  "total_guests": 500,
  "pending_checkouts_today": 8,
  "recent_bookings": [...],       // last 5
  "revenue_chart_data": {...},    // for Chart.js
  "occupancy_chart_data": {...}   // for Chart.js
}
```

### Step 8.2 — AG Grid Compatible Responses
- All list endpoints support:
  - **Pagination:** `?page=1&page_size=25`
  - **Sorting:** `?ordering=-created_at`
  - **Filtering:** `?status=CONFIRMED&check_in_date__gte=2026-03-01`
  - **Search:** `?search=john`
- Return format compatible with AG Grid server-side model

---

## Phase 9: Testing

### Step 9.1 — Unit Tests
- Model tests (creation, constraints, methods)
- Serializer tests (validation, output format)
- Permission tests (role-based access)

### Step 9.2 — API Integration Tests
- Auth flow (register → login → access protected → refresh → logout)
- Booking flow (check availability → book → pay → confirm)
- CRUD operations for all admin endpoints
- Permission denied scenarios

### Step 9.3 — Tools
- `pytest` + `pytest-django`
- `factory_boy` for test fixtures
- `coverage` for test coverage reports

---

## Phase 10: Deployment Preparation

### Step 10.1 — Docker Setup
```
backend/
├── Dockerfile
├── docker-compose.yml    (Django + MySQL + Redis + Celery)
├── .env.example
```

### Step 10.2 — Production Checklist
- DEBUG = False
- Proper ALLOWED_HOSTS
- HTTPS enforcement
- Static files via whitenoise or nginx
- Media files via cloud storage (S3) or local with nginx
- Gunicorn as WSGI server
- Celery worker + beat as separate services
- Database backups (mysqldump cron)

---

## Implementation Order (Recommended)

| Order | Phase | Estimated Scope |
|-------|-------|-----------------|
| 1 | Phase 1: Project Setup | Scaffolding, settings, DB connection |
| 2 | Phase 2 (Steps 2.1-2.2): User + Room models | Core models + migrations |
| 3 | Phase 3: Authentication | JWT, register, login, permissions |
| 4 | Phase 4.1: Public APIs | Room list, details, CMS content endpoints |
| 5 | Phase 2 (Steps 2.3): Booking models | Booking + payment models |
| 6 | Phase 4.2: Guest APIs | Create booking, my bookings |
| 7 | Phase 5: Serializers & validation | Polish all serializers |
| 8 | Phase 2 (Steps 2.4-2.9): Remaining models | Restaurant, spa, CMS, contact, staff |
| 9 | Phase 4.1 (remaining): All public APIs | Menu, spa, gallery, news, FAQ, etc. |
| 10 | Phase 4.3: Admin APIs | Full CRUD for admin panel |
| 11 | Phase 4.4: Staff APIs | Permission-gated staff access |
| 12 | Phase 6: Celery tasks | Email, SMS, scheduled jobs |
| 13 | Phase 7: Payment gateway | Payment flow integration |
| 14 | Phase 8: Dashboard endpoints | Stats, charts, AG Grid data |
| 15 | Phase 9: Testing | Unit + integration tests |
| 16 | Phase 10: Deployment | Docker, production settings |

---

## Folder Structure (Final)

```
backend/
├── manage.py
├── requirements.txt
├── .env
├── config/
│   ├── __init__.py
│   ├── celery.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── settings/
│       ├── __init__.py
│       ├── base.py
│       ├── development.py
│       └── production.py
├── accounts/
│   ├── models.py         (CustomUser)
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── permissions.py
│   ├── managers.py       (CustomUserManager)
│   └── admin.py
├── rooms/
│   ├── models.py         (RoomType, Room, RoomImage, RoomAmenity)
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── filters.py
│   └── admin.py
├── bookings/
│   ├── models.py         (Booking, Payment)
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   ├── services.py       (availability check logic)
│   └── admin.py
├── restaurant/
│   ├── models.py         (MenuCategory, MenuItem, RestaurantGallery)
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
├── spa/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
├── services/
│   ├── models.py         (HotelService, Facility)
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
├── cms/
│   ├── models.py         (NewsPost, FAQ, Testimonial, TeamMember, GalleryImage, HeroSlide, SiteSetting)
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
├── contact/
│   ├── models.py
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
├── staff/
│   ├── models.py         (StaffProfile, StaffPermission)
│   ├── serializers.py
│   ├── views.py
│   ├── urls.py
│   └── admin.py
├── dashboard/
│   ├── views.py
│   ├── urls.py
│   └── services.py       (aggregation queries)
└── common/
    ├── pagination.py     (custom pagination class)
    ├── throttles.py      (rate limiting)
    └── utils.py          (shared helpers)
```
