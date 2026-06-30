from django.core.management.base import BaseCommand

from restaurant.models import MenuCategory, MenuItem

SEED = [
    ('Breakfast', 1, [
        ('Continental Breakfast', 'Toast, butter, jam, tea/coffee', 450),
        ('Bangladeshi Breakfast', 'Paratha, egg, dal, vegetables', 550),
        ('Omelette', 'Cheese or vegetable omelette with toast', 350),
    ]),
    ('Main Course', 2, [
        ('Grilled Chicken', 'Served with rice and salad', 650),
        ('Beef Kala Bhuna', 'Traditional spicy beef curry', 750),
        ('Fish Curry', 'Fresh river fish in light gravy', 600),
        ('Vegetable Khichuri', 'Comfort rice and lentil dish', 400),
    ]),
    ('Beverages', 3, [
        ('Mineral Water', '500ml bottle', 50),
        ('Fresh Lime', 'Freshly squeezed lime juice', 120),
        ('Mango Lassi', 'Traditional yogurt drink', 180),
        ('Tea / Coffee', 'Hot beverage', 80),
    ]),
    ('Desserts', 4, [
        ('Roshogolla', '2 pcs traditional sweet', 120),
        ('Ice Cream', 'Vanilla or chocolate scoop', 150),
        ('Fruit Salad', 'Seasonal fresh fruits', 200),
    ]),
]


class Command(BaseCommand):
    help = 'Seed restaurant menu categories and items'

    def handle(self, *args, **options):
        created = 0
        for cat_name, order, items in SEED:
            cat, _ = MenuCategory.objects.get_or_create(name=cat_name, defaults={'order': order})
            if cat.order != order:
                cat.order = order
                cat.save(update_fields=['order'])
            for name, desc, price in items:
                _, was_created = MenuItem.objects.get_or_create(
                    category=cat,
                    name=name,
                    defaults={'description': desc, 'price': price, 'is_available': True},
                )
                if was_created:
                    created += 1
        self.stdout.write(self.style.SUCCESS(
            f'Restaurant seed done — {created} new items, '
            f'{MenuCategory.objects.count()} categories, {MenuItem.objects.count()} total items'
        ))
