from django.urls import path
from .views import (
    AnalizarTextoView, 
    AnalizarCodigoView, 
    AnalizarSmsView, 
    AnalizarImagenView, 
    AnalizarAudioView,
    AnalizarLlamadaView,
    AnalizarVideoView,
    AnalizarURLView,
    AnalizarArchivoView,
    HistorialAnalisisView, 
    AdminBitacoraView,
    NotificacionesView,
    MarcarNotificacionLeidaView,
    PreferenciasNotificacionView
)

urlpatterns = [
    path('texto/', AnalizarTextoView.as_view(), name='analizar_texto'),
    path('codigo/', AnalizarCodigoView.as_view(), name='analizar_codigo'),
    path('sms/', AnalizarSmsView.as_view(), name='analizar_sms'),
    path('imagen/', AnalizarImagenView.as_view(), name='analizar_imagen'),
    path('audio/', AnalizarAudioView.as_view(), name='analizar_audio'),
    path('llamada/', AnalizarLlamadaView.as_view(), name='analizar_llamada'),
    path('video/', AnalizarVideoView.as_view(), name='analizar_video'),
    path('url/', AnalizarURLView.as_view(), name='analizar_url'),
    path('archivo/', AnalizarArchivoView.as_view(), name='analizar_archivo'),
    path('historial/', HistorialAnalisisView.as_view(), name='historial_analisis'),
    path('admin/bitacora/', AdminBitacoraView.as_view(), name='admin_bitacora'),
    path('notificaciones/', NotificacionesView.as_view(), name='notificaciones'),
    path('notificaciones/<str:notif_id>/leida/', MarcarNotificacionLeidaView.as_view(), name='notificacion_leida'),
    path('notificaciones/preferencias/', PreferenciasNotificacionView.as_view(), name='notificaciones_preferencias'),    
]
