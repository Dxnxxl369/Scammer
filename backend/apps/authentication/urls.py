from django.urls import path
from .views import (
    HealthCheckView,
    RegistroView,
    YoView,
    LoginView,
    GoogleLoginUrlView,
    IniciarSesionSessionView,
    SuscripcionView,
    CrearSesionAnonimaView,
    SesionAnonimaView,
    IncrementarIntentosAnonimoView,
    LogoutView,
    RegistrarFCMTokenView,
)
from .views_admin import (
    ListarUsuariosView,
    BloquearUsuarioView,
    DesbloquearUsuarioView,
    CambiarPlanView,
    CambiarRolView,
    EstadisticasView,
)

urlpatterns = [
    path('health/', HealthCheckView.as_view(), name='health'),
    path('auth/registro/', RegistroView.as_view(), name='registro'),
    path('auth/yo/', YoView.as_view(), name='yo'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/google-url/', GoogleLoginUrlView.as_view(), name='google_url'),
    path('auth/session-sync/', IniciarSesionSessionView.as_view(), name='session_sync'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/suscripcion/', SuscripcionView.as_view(), name='suscripcion'),
    path('auth/fcm/', RegistrarFCMTokenView.as_view(), name='registrar_fcm'),
    path('anonimos/sesion/', CrearSesionAnonimaView.as_view(), name='crear_sesion_anonima'),
    path('anonimos/sesion/<str:id_sesion>/', SesionAnonimaView.as_view(), name='sesion_anonima'),
    path('anonimos/sesion/<str:id_sesion>/intento/', IncrementarIntentosAnonimoView.as_view(), name='incrementar_intentos_anonimo'),
    path('admin/usuarios/', ListarUsuariosView.as_view(), name='admin_listar_usuarios'),
    path('admin/usuarios/<str:id_supabase>/bloquear/', BloquearUsuarioView.as_view(), name='admin_bloquear'),
    path('admin/usuarios/<str:id_supabase>/desbloquear/', DesbloquearUsuarioView.as_view(), name='admin_desbloquear'),
    path('admin/usuarios/<str:id_supabase>/plan/', CambiarPlanView.as_view(), name='admin_cambiar_plan'),
    path('admin/usuarios/<str:id_supabase>/rol/', CambiarRolView.as_view(), name='admin_cambiar_rol'),
    path('admin/estadisticas/', EstadisticasView.as_view(), name='admin_estadisticas'),
]
