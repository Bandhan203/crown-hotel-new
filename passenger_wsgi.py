import os
import sys

# Add the backend directory to the Python path
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, BACKEND_DIR)

os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.production'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
