from django.core.management.base import BaseCommand

from inventory.models import Item, ItemCategory


SEED = [
  ('Housekeeping', 'HK001', 'Bed Sheet (Single)', 'Piece', 350, 45, 10),
  ('Housekeeping', 'HK002', 'Towel (Bath)', 'Piece', 250, 60, 15),
  ('Housekeeping', 'HK003', 'Soap (Bar)', 'Piece', 35, 200, 50),
  ('Housekeeping', 'HK004', 'Shampoo (Sachet)', 'Piece', 25, 4, 40),
  ('Food', 'FB001', 'Rice (kg)', 'KG', 70, 80, 20),
  ('Food', 'FB002', 'Cooking Oil (L)', 'Litre', 175, 30, 10),
  ('Beverage', 'BV001', 'Mineral Water (500ml)', 'Bottle', 20, 300, 100),
  ('Beverage', 'BV002', 'Tea Bags', 'Box', 120, 3, 5),
  ('Engineering', 'EN001', 'Light Bulb (LED)', 'Piece', 150, 40, 10),
  ('Stationery', 'ST001', 'A4 Paper (Ream)', 'Ream', 450, 15, 5),
]


class Command(BaseCommand):
  help = 'Seed default inventory categories and items'

  def handle(self, *args, **options):
    created_items = 0
    for cat_name, code, name, unit, price, stock, min_level in SEED:
      cat, _ = ItemCategory.objects.get_or_create(name=cat_name)
      _, created = Item.objects.get_or_create(
        code=code,
        defaults={
          'category': cat,
          'name': name,
          'unit': unit,
          'unit_price': price,
          'current_stock': stock,
          'min_stock_level': min_level,
        },
      )
      if created:
        created_items += 1
    self.stdout.write(self.style.SUCCESS(f'Seed complete — {created_items} new items'))
