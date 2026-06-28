import random
import uuid
from datetime import timedelta
from django.utils import timezone
from django.db import transaction

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model
from accounts.models import GuestProfile
from rooms.models import RoomType, Room, RoomAmenity
from bookings.models import Booking, RatePlan, FolioCharge
from spa.models import SpaService
from services.models import HotelService, Facility

User = get_user_model()

@transaction.atomic
def populate_dummy_data():
    print("Starting data generation...")
    now = timezone.now()
    today = now.date()

    # 1. Create Spa Services
    print("Creating Spa Services...")
    spa_services_data = [
        {"name": "Deep Tissue Massage", "price": 5500, "duration": 60, "description": "Relieve severe tension."},
        {"name": "Aromatherapy Facial", "price": 3500, "duration": 45, "description": "Soothing facial therapy."},
        {"name": "Hot Stone Therapy", "price": 6000, "duration": 90, "description": "Warm stones for muscle relaxation."},
        {"name": "Full Body Scrub", "price": 4000, "duration": 60, "description": "Exfoliating skin treatment."},
    ]
    for s_data in spa_services_data:
        SpaService.objects.get_or_create(name=s_data['name'], defaults=s_data)

    # 2. Create Hotel Services & Facilities
    print("Creating Hotel Services...")
    hotel_services = ["24/7 Room Service", "Airport Shuttle", "Laundry Service", "Valet Parking"]
    for idx, name in enumerate(hotel_services):
        HotelService.objects.get_or_create(name=name, defaults={"order": idx})

    facilities = ["Swimming Pool", "Gym & Fitness Center", "Conference Room", "Restaurant"]
    for idx, name in enumerate(facilities):
        Facility.objects.get_or_create(name=name, defaults={"order": idx})

    # 3. Create Amenities, Room Types, and Rooms
    print("Creating Room Data...")
    wifi, _ = RoomAmenity.objects.get_or_create(name="Free Wi-Fi", defaults={"icon": "FaWifi"})
    tv, _ = RoomAmenity.objects.get_or_create(name="Smart TV", defaults={"icon": "FaTv"})
    ac, _ = RoomAmenity.objects.get_or_create(name="Air Conditioning", defaults={"icon": "FaSnowflake"})

    # Room Type: Deluxe
    deluxe_type, created = RoomType.objects.get_or_create(
        name="Deluxe Room",
        defaults={
            "price_per_night": 12000,
            "max_guests": 2,
            "beds": 1,
            "size": 350,
        }
    )
    if created:
        deluxe_type.amenities.add(wifi, tv, ac)

    # Room Type: Suite
    suite_type, created = RoomType.objects.get_or_create(
        name="Executive Suite",
        defaults={
            "price_per_night": 25000,
            "max_guests": 4,
            "beds": 2,
            "size": 750,
        }
    )
    if created:
        suite_type.amenities.add(wifi, tv, ac)

    # Create some rooms if they don't exist
    for i in range(101, 106):
        Room.objects.get_or_create(room_number=str(i), defaults={"room_type": deluxe_type, "floor": 1})
    for i in range(201, 204):
        Room.objects.get_or_create(room_number=str(i), defaults={"room_type": suite_type, "floor": 2})

    # Rate Plan
    standard_rate, _ = RatePlan.objects.get_or_create(
        code="STD",
        defaults={"name": "Standard Rate", "discount_type": "PERCENTAGE", "discount_value": 0}
    )
    standard_rate.room_types.add(deluxe_type, suite_type)

    # 4. Create Users (5 Registrations)
    print("Creating Users & Profiles...")
    guests = []
    sample_users = [
        {"email": "guest1@example.com", "full_name": "John Doe", "phone": "01711111111"},
        {"email": "guest2@example.com", "full_name": "Jane Smith", "phone": "01822222222"},
        {"email": "guest3@example.com", "full_name": "Michael Brown", "phone": "01933333333"},
        {"email": "guest4@example.com", "full_name": "Emily Davis", "phone": "01644444444"},
        {"email": "guest5@example.com", "full_name": "Chris Wilson", "phone": "01555555555"},
    ]

    for u_data in sample_users:
        user, created = User.objects.get_or_create(email=u_data["email"], defaults={
            "full_name": u_data["full_name"],
            "phone": u_data["phone"],
            "role": "GUEST"
        })
        if created:
            user.set_password("Guest1234!")
            user.save()
        
        # Profile might have been created via signals, so update or create
        profile, _ = GuestProfile.objects.get_or_create(user=user)
        
        first_last = user.full_name.split(' ', 1)
        profile.first_name = first_last[0]
        if len(first_last) > 1:
            profile.last_name = first_last[1]
        profile.gender = "MALE" if "John" in user.full_name or "Michael" in user.full_name or "Chris" in user.full_name else "FEMALE"
        profile.city = "Dhaka"
        profile.save()
        
        guests.append(user)

    # 5. Create 5 Bookings
    print("Creating Bookings...")
    rooms_available = list(Room.objects.all())
    
    # We will make bookings across the 5 guests
    for i, guest in enumerate(guests):
        check_in = today + timedelta(days=i)
        check_out = check_in + timedelta(days=random.randint(1, 3))
        
        room = rooms_available[i % len(rooms_available)]
        
        booking_ref = f"BK-{uuid.uuid4().hex[:6].upper()}"
        
        nights = (check_out - check_in).days
        total_price = room.room_type.price_per_night * nights
        
        booking, created = Booking.objects.get_or_create(
            guest=guest,
            check_in_date=check_in,
            defaults={
                "booking_ref": booking_ref,
                "room": room,
                "room_type": room.room_type,
                "rate_plan": standard_rate,
                "check_out_date": check_out,
                "adults": random.randint(1, room.room_type.max_guests),
                "total_price": total_price,
                "status": "CONFIRMED" if i % 2 == 0 else "PENDING",
                "payment_status": "UNPAID",
                "grand_total": total_price
            }
        )

        if created:
            # Create a folio charge for room
            FolioCharge.objects.create(
                booking=booking,
                charge_type="ROOM",
                description=f"Room Charge ({nights} nights)",
                amount=room.room_type.price_per_night,
                quantity=nights,
                total=total_price,
                charge_date=check_in
            )

    print("Dummy data generation completed successfully!")

if __name__ == "__main__":
    populate_dummy_data()
