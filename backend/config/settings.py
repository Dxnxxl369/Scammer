from pathlib import Path
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'channels',
    'apps.authentication',
    'apps.analysis',
]

# ASGI y Channels
ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels.layers.InMemoryChannelLayer',
    },
}

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    # 'django.middleware.csrf.CsrfViewMiddleware', # Desactivado para evitar bloqueos en API JWT
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# MongoDB
MONGO_URI = config('MONGO_URI', default='mongodb://localhost:27017')
MONGO_DB_NAME = config('MONGO_DB_NAME', default='scammer_ia')

import mongoengine
mongoengine.connect(db=MONGO_DB_NAME, host=MONGO_URI)

# Supabase
SUPABASE_URL = config('SUPABASE_URL', default='')
SUPABASE_JWT_SECRET = config('SUPABASE_JWT_SECRET', default='')
SUPABASE_SECRET_KEY = config('SUPABASE_SECRET_KEY', default='')

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
STATIC_URL = 'static/'

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = False

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5180',
    'http://127.0.0.1:5180',
]

from corsheaders.defaults import default_headers
CORS_ALLOW_HEADERS = list(default_headers) + [
    'x-session-id',
    'x-user-id',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.authentication.simple_auth.SimpleIDAuthentication',
        'apps.authentication.supabase_auth.SupabaseAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# ─── Stripe (pagos / monetización) ───
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_PUBLISHABLE_KEY = config('STRIPE_PUBLISHABLE_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')
# A dónde redirige Stripe tras pagar / cancelar (cambiar por tu dominio o deep link)
STRIPE_SUCCESS_URL = config('STRIPE_SUCCESS_URL', default='https://scammer.app/pago-exitoso')
STRIPE_CANCEL_URL = config('STRIPE_CANCEL_URL', default='https://scammer.app/pago-cancelado')
# Si True: al "pagar", si Stripe no está configurado o falla, igual se activa el
# plan SIN cobro (modo demo). Poner en False en producción para exigir pago real.
PAGOS_PERMITIR_BYPASS = config('PAGOS_PERMITIR_BYPASS', default=True, cast=bool)

# ── OpenAI (reportes por voz/texto): Whisper para transcribir + GPT para
# interpretar el pedido en lenguaje natural. Si OPENAI_API_KEY está vacía,
# el generador cae a un modo por palabras clave (sin IA).
OPENAI_API_KEY = config('OPENAI_API_KEY', default='')
OPENAI_CHAT_MODEL = config('OPENAI_CHAT_MODEL', default='gpt-4o-mini')
OPENAI_WHISPER_MODEL = config('OPENAI_WHISPER_MODEL', default='whisper-1')

