from .base import *  # noqa: F401,F403

DEBUG = False

# ──────────────────────────────────────────────
# Security — SSL is terminated by cPanel/Apache
# ──────────────────────────────────────────────
SECURE_SSL_REDIRECT = False  # cPanel handles SSL termination
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

CSRF_TRUSTED_ORIGINS = [
    'https://hotel.royalaromabd.com',
]

# ──────────────────────────────────────────────
# WhiteNoise — serve static files without Apache config
# ──────────────────────────────────────────────
MIDDLEWARE.insert(
    MIDDLEWARE.index('django.middleware.security.SecurityMiddleware') + 1,
    'whitenoise.middleware.WhiteNoiseMiddleware',
)

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedStaticFilesStorage",
    },
}

# ──────────────────────────────────────────────
# Frontend — Serve React SPA built with Vite
# ──────────────────────────────────────────────
TEMPLATES[0]['DIRS'] = [BASE_DIR.parent / 'frontend' / 'dist']

STATICFILES_DIRS = [
    d for d in [
        BASE_DIR / 'static',
        ('frontend', BASE_DIR.parent / 'frontend' / 'dist'),
    ]
    if isinstance(d, tuple) or d.is_dir()
]

# Production email
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
