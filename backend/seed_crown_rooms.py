"""
Seed the database with Crown Hotel's 4 canonical room types.
Run: venv/Scripts/python seed_crown_rooms.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from rooms.models import RoomType, Room

CROWN_ROOMS = [
    {
        'name': 'Crown Classic',
        'slug': 'crown-classic',
        'description': (
            'Enjoy a peaceful stay in the Crown Classic, a well-designed room created for solo travelers. '
            'With stylish décor, modern facilities, and a comfortable setting, it offers the perfect space '
            'to relax and recharge during your visit.'
        ),
        'price_per_night': 3499,
        'max_guests': 1,
        'beds': 1,
        'size': 180,
        'view_type': 'City View',
        'is_featured': True,
    },
    {
        'name': 'Crown Double',
        'slug': 'crown-double',
        'description': (
            'The Crown Double combines comfort, style, and convenience in a welcoming space designed for two guests. '
            'With a cozy double bed, contemporary facilities, and a relaxing ambiance, it offers everything needed '
            'for a memorable stay.'
        ),
        'price_per_night': 4999,
        'max_guests': 2,
        'beds': 1,
        'size': 220,
        'view_type': 'City View',
        'is_featured': True,
    },
    {
        'name': 'Crown Twin',
        'slug': 'crown-twin',
        'description': (
            'Enjoy a comfortable and refreshing stay in our Crown Twin room. Featuring two cozy twin beds, '
            'modern amenities, and a warm setting, this room is ideal for friends, colleagues, or companions '
            'seeking both comfort and convenience throughout their visit.'
        ),
        'price_per_night': 4999,
        'max_guests': 2,
        'beds': 2,
        'size': 220,
        'view_type': 'Garden View',
        'is_featured': True,
    },
    {
        'name': 'Crown Signature',
        'slug': 'crown-signature',
        'description': (
            'Designed with elegance and comfort in mind, the Crown Signature offers a welcoming space for two guests. '
            'Enjoy premium amenities, stylish décor, and a relaxing ambiance that makes every stay both comfortable '
            'and memorable.'
        ),
        'price_per_night': 6499,
        'max_guests': 2,
        'beds': 1,
        'size': 300,
        'view_type': 'Premium View',
        'is_featured': True,
    },
]

# Room numbers to create per room type (3 rooms each)
ROOM_NUMBERS = {
    'crown-classic':   ['101', '102', '103'],
    'crown-double':    ['201', '202', '203'],
    'crown-twin':      ['301', '302', '303'],
    'crown-signature': ['401', '402', '403'],
}

FLOOR_MAP = {
    'crown-classic':   1,
    'crown-double':    2,
    'crown-twin':      3,
    'crown-signature': 4,
}

created_types = 0
updated_types = 0
created_rooms = 0

for data in CROWN_ROOMS:
    slug = data['slug']
    rt, created = RoomType.objects.update_or_create(
        slug=slug,
        defaults={
            'name':            data['name'],
            'description':     data['description'],
            'price_per_night': data['price_per_night'],
            'max_guests':      data['max_guests'],
            'beds':            data['beds'],
            'size':            data['size'],
            'view_type':       data['view_type'],
            'is_featured':     data['is_featured'],
        }
    )
    if created:
        created_types += 1
        print(f"  [CREATED] RoomType: {rt.name} (slug={rt.slug})")
    else:
        updated_types += 1
        print(f"  [UPDATED] RoomType: {rt.name} (slug={rt.slug})")

    # Create physical rooms for this room type if they don't exist
    floor = FLOOR_MAP[slug]
    for room_number in ROOM_NUMBERS[slug]:
        room, r_created = Room.objects.get_or_create(
            room_number=room_number,
            defaults={
                'room_type': rt,
                'floor': floor,
                'status': 'AVAILABLE',
                'housekeeping_status': 'CLEAN',
            }
        )
        if r_created:
            created_rooms += 1
            print(f"    [ROOM] Created Room {room_number} -> {rt.name}")

print()
print(f"Done. Room types created={created_types}, updated={updated_types}. Rooms created={created_rooms}.")
print()
print("Room types now in DB:")
for rt in RoomType.objects.all():
    print(f"  id={rt.id}  slug={rt.slug}  name={rt.name}  price={rt.price_per_night}")
