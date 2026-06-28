"""
Seed CMS gallery, hero slides, and room images from the project images/ folder.

Usage (from backend/):
    python seed_hotel_images.py
"""
import os
import sys
from pathlib import Path

import django
from django.core.files import File
from django.db import transaction

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from cms.models import GalleryImage, HeroSlide  # noqa: E402
from rooms.models import RoomImage, RoomType  # noqa: E402

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
SOURCE_DIR = PROJECT_ROOT / 'images'

GALLERY_CATEGORIES = [
    GalleryImage.Category.ROOMS,
    GalleryImage.Category.RESTAURANT,
    GalleryImage.Category.SPA,
    GalleryImage.Category.POOL,
    GalleryImage.Category.EXTERIOR,
]

HERO_SLIDES = [
    {
        'subtitle': 'Experience Comfort, Luxury & Hospitality',
        'title': 'The Best Hotel Crown in Rajshahi City',
        'cta_text': 'Book Your Room',
        'cta_link': '/rooms',
    },
    {
        'subtitle': 'Padma Abasik, Rajshahi, Bangladesh',
        'title': 'Refined Hospitality in the Heart of Rajshahi',
        'cta_text': 'Explore Facilities',
        'cta_link': '/facilities',
    },
    {
        'subtitle': 'Hotel Crown',
        'title': 'Elegant Accommodations & Attentive Service',
        'cta_text': 'Book Your Room',
        'cta_link': '/rooms',
    },
]

ROOM_IMAGE_MAP = {
    'crown-classic': 'DSC07110.jpg',
    'crown-double': 'DSC07150.jpg',
    'crown-twin': 'DSC07201.jpg',
    'crown-signature': 'DSC07250.jpg',
    'deluxe-room': 'DSC07110.jpg',
    'executive-suite': 'DSC07250.jpg',
}


def image_files() -> list[Path]:
    if not SOURCE_DIR.is_dir():
        print(f'Images folder not found: {SOURCE_DIR}')
        sys.exit(1)
    return sorted(SOURCE_DIR.glob('*.jpg'))


@transaction.atomic
def seed_gallery(files: list[Path]) -> int:
    GalleryImage.objects.all().delete()
    created = 0
    for index, path in enumerate(files):
        category = GALLERY_CATEGORIES[index % len(GALLERY_CATEGORIES)]
        with path.open('rb') as handle:
            item = GalleryImage(
                category=category,
                title=f'Hotel Crown {path.stem}',
                caption=path.stem,
                alt_text=f'Hotel Crown — {path.stem}',
                is_published=True,
                order=index,
            )
            item.image.save(path.name, File(handle), save=True)
            created += 1
    return created


@transaction.atomic
def seed_hero_slides(files: list[Path]) -> int:
    HeroSlide.objects.all().delete()
    created = 0
    for index, meta in enumerate(HERO_SLIDES):
        path = files[index % len(files)]
        with path.open('rb') as handle:
            slide = HeroSlide(
                subtitle=meta['subtitle'],
                title=meta['title'],
                cta_text=meta['cta_text'],
                cta_link=meta['cta_link'],
                order=index,
                is_active=True,
            )
            slide.background_image.save(path.name, File(handle), save=True)
            created += 1
    return created


@transaction.atomic
def seed_room_images(files: list[Path]) -> int:
    RoomImage.objects.all().delete()
    created = 0
    file_by_name = {path.name: path for path in files}

    for slug, filename in ROOM_IMAGE_MAP.items():
        room_type = RoomType.objects.filter(slug=slug).first()
        if not room_type:
            continue
        path = file_by_name.get(filename)
        if not path:
            continue
        with path.open('rb') as handle:
            image = RoomImage(room_type=room_type, is_primary=True, order=0)
            image.image.save(path.name, File(handle), save=True)
            created += 1

    # Attach a few extra room photos per type when available
    extras = [f for f in files if f.name.startswith('DSC071') or f.name.startswith('DSC072')]
    for room_type in RoomType.objects.all():
        existing = room_type.images.count()
        for offset, path in enumerate(extras[existing:existing + 2]):
            with path.open('rb') as handle:
                image = RoomImage(room_type=room_type, is_primary=False, order=existing + offset + 1)
                image.image.save(path.name, File(handle), save=False)
                image.save()
                created += 1
    return created


def main() -> None:
    files = image_files()
    if not files:
        print('No .jpg files found in images folder.')
        sys.exit(1)

    print(f'Found {len(files)} images in {SOURCE_DIR}')
    gallery_count = seed_gallery(files)
    hero_count = seed_hero_slides(files)
    room_count = seed_room_images(files)
    print(f'Seeded {gallery_count} gallery images, {hero_count} hero slides, {room_count} room images.')


if __name__ == '__main__':
    main()
