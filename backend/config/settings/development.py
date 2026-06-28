from .base import *  # noqa: F401,F403
from .base import REST_FRAMEWORK as _BASE_REST_FRAMEWORK

DEBUG = True

# In development, allow all hosts
ALLOWED_HOSTS = ['*']

# Use console email backend
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Local dev makes many API calls per page load; disable throttling to avoid 429 errors.
REST_FRAMEWORK = {
    **_BASE_REST_FRAMEWORK,
    'DEFAULT_THROTTLE_CLASSES': [],
}
