import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

try:
    u = User.objects.get(email='admin@hotel.local')
    u.set_password('admin12345')
    u.save()
    print("Password for admin@hotel.local reset to admin12345!")
except Exception as e:
    print("Error:", e)
