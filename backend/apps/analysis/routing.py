from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/notificaciones/', consumers.NotificacionConsumer.as_asgi()),
    path('ws/admin/bitacora/', consumers.AdminBitacoraConsumer.as_asgi()),
]
