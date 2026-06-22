from datetime import datetime
import json

import stripe
from django.conf import settings
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Usuario, ConfiguracionPlan, Pago
from .permissions import EsAdmin
from .services import UsuarioService
from .responses import respuesta_exitosa, respuesta_error

stripe.api_key = settings.STRIPE_SECRET_KEY

PLANES_PAGABLES = ['starter', 'pro', 'elite']

# Valores por defecto si el admin todavía no configuró nada (se siembran a la BD).
DEFAULTS_PLAN = {
    'gratis': {'precio_centavos': 0, 'limite_livianos': 10, 'limite_pesados': 3},
    'starter': {'precio_centavos': 0, 'limite_livianos': 50, 'limite_pesados': 15},
    'pro': {'precio_centavos': 0, 'limite_livianos': 999999, 'limite_pesados': 50},
    'elite': {'precio_centavos': 0, 'limite_livianos': 999999, 'limite_pesados': 999999},
}


def _config_plan(plan):
    """Config del plan desde la BD; si no existe, la siembra con los defaults."""
    cfg = ConfiguracionPlan.objects(plan=plan).first()
    if cfg:
        return cfg
    d = DEFAULTS_PLAN.get(plan, DEFAULTS_PLAN['gratis'])
    cfg = ConfiguracionPlan(
        plan=plan,
        precio_centavos=d['precio_centavos'],
        limite_livianos=d['limite_livianos'],
        limite_pesados=d['limite_pesados'],
    )
    cfg.save()
    return cfg


class PlanesView(APIView):
    """Lista pública de planes con precio y límites (para mostrar en la app)."""
    permission_classes = [AllowAny]

    def get(self, request):
        planes = [_config_plan(p).to_dict() for p in ['gratis'] + PLANES_PAGABLES]
        return respuesta_exitosa(planes, mensaje='Planes disponibles')


class AdminConfigurarPlanView(APIView):
    """El administrador define precio y límites de un plan."""
    permission_classes = [EsAdmin]

    def put(self, request, plan):
        if plan not in ['gratis'] + PLANES_PAGABLES:
            return respuesta_error('PLAN_INVALIDO', 'Plan inválido', status.HTTP_400_BAD_REQUEST)
        cfg = _config_plan(plan)
        try:
            if 'precio_centavos' in request.data:
                cfg.precio_centavos = max(0, int(request.data.get('precio_centavos')))
            if 'moneda' in request.data:
                cfg.moneda = str(request.data.get('moneda'))[:3].lower()
            if 'limite_livianos' in request.data:
                cfg.limite_livianos = max(0, int(request.data.get('limite_livianos')))
            if 'limite_pesados' in request.data:
                cfg.limite_pesados = max(0, int(request.data.get('limite_pesados')))
            if 'activo' in request.data:
                cfg.activo = bool(request.data.get('activo'))
        except (TypeError, ValueError):
            return respuesta_error('DATO_INVALIDO', 'Precio/límites deben ser números enteros', status.HTTP_400_BAD_REQUEST)
        cfg.fecha_actualizacion = datetime.utcnow()
        cfg.save()
        return respuesta_exitosa(cfg.to_dict(), mensaje='Plan actualizado')

    patch = put


class CrearCheckoutView(APIView):
    """Crea una sesión de Stripe Checkout para el plan elegido y devuelve la URL."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan = request.data.get('plan')
        if plan not in PLANES_PAGABLES:
            return respuesta_error('PLAN_INVALIDO', 'Plan inválido', status.HTTP_400_BAD_REQUEST)

        usuario = UsuarioService.obtener_por_supabase_id(request.user.id)
        if not usuario:
            return respuesta_error('NO_ENCONTRADO', 'Usuario no encontrado', status.HTTP_404_NOT_FOUND)

        bypass = getattr(settings, 'PAGOS_PERMITIR_BYPASS', True)
        cfg = _config_plan(plan)

        # Stripe no configurado o sin precio definido.
        if not settings.STRIPE_SECRET_KEY or cfg.precio_centavos <= 0:
            if bypass:
                return self._activar_directo(usuario, plan, 'Stripe no disponible (modo demo)')
            return respuesta_error('STRIPE_NO_CONFIGURADO',
                                   'Pagos no disponibles en este momento',
                                   status.HTTP_503_SERVICE_UNAVAILABLE)

        # Crear (o reutilizar) el cliente de Stripe para este usuario.
        try:
            if not usuario.stripe_customer_id:
                cliente = stripe.Customer.create(
                    email=usuario.correo,
                    name=usuario.nombre_usuario,
                    metadata={'usuario_id': usuario.id_supabase},
                )
                usuario.stripe_customer_id = cliente.id
                usuario.save()

            session = stripe.checkout.Session.create(
                mode='subscription',
                customer=usuario.stripe_customer_id,
                line_items=[{
                    'price_data': {
                        'currency': cfg.moneda or 'usd',
                        'product_data': {'name': f'Plan {plan.upper()} · Scammer'},
                        'unit_amount': cfg.precio_centavos,
                        'recurring': {'interval': 'month'},
                    },
                    'quantity': 1,
                }],
                success_url=settings.STRIPE_SUCCESS_URL,
                cancel_url=settings.STRIPE_CANCEL_URL,
                client_reference_id=usuario.id_supabase,
                metadata={'usuario_id': usuario.id_supabase, 'plan': plan},
                subscription_data={'metadata': {'usuario_id': usuario.id_supabase, 'plan': plan}},
            )
        except Exception as e:
            # Stripe falló: si el bypass está activo, activar igual (el usuario lo pidió).
            if bypass:
                return self._activar_directo(usuario, plan, f'Stripe falló: {e}')
            return respuesta_error('STRIPE_ERROR', f'No se pudo crear el checkout: {e}', status.HTTP_502_BAD_GATEWAY)

        try:
            Pago(id_supabase=usuario.id_supabase, plan=plan, monto_centavos=cfg.precio_centavos,
                 moneda=cfg.moneda, stripe_session_id=session.id, estado='pendiente').save()
        except Exception:
            pass

        return respuesta_exitosa({'url': session.url, 'session_id': session.id}, mensaje='Checkout creado')

    def _activar_directo(self, usuario, plan, motivo=''):
        """Activa el plan SIN cobro real (modo demo / Stripe no disponible).
        OJO: en producción esto regala planes. Controlar con PAGOS_PERMITIR_BYPASS."""
        usuario.plan = plan
        usuario.intentos_pesados = 0
        usuario.intentos_livianos = 0
        usuario.save()
        try:
            Pago(id_supabase=usuario.id_supabase, plan=plan, monto_centavos=0,
                 stripe_session_id='BYPASS', estado='completado').save()
        except Exception:
            pass
        try:
            from apps.analysis.services import BitacoraService
            BitacoraService.registrar(
                usuario_id=usuario.id_supabase,
                accion=f'Plan activado sin cobro · {plan.upper()}',
                modulo='Pagos',
                ip='bypass',
                detalles=motivo,
            )
        except Exception:
            pass
        return respuesta_exitosa(
            {'activado_directo': True, 'plan': plan},
            mensaje=f'Plan {plan.upper()} activado'
        )


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """Stripe llama aquí tras el pago. Verifica la firma y activa el plan."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        payload = request.body
        sig = request.META.get('HTTP_STRIPE_SIGNATURE')
        secret = settings.STRIPE_WEBHOOK_SECRET

        try:
            if secret:
                event = stripe.Webhook.construct_event(payload, sig, secret)
            else:
                # Sin secret (SOLO desarrollo): parsea sin verificar firma. Inseguro.
                event = json.loads(payload)
        except Exception:
            return HttpResponse(status=400)

        tipo = event['type'] if isinstance(event, dict) else event.type
        obj = event['data']['object']

        if tipo == 'checkout.session.completed':
            meta = obj.get('metadata') or {}
            usuario_id = meta.get('usuario_id') or obj.get('client_reference_id')
            plan = meta.get('plan')
            self._activar_plan(usuario_id, plan, obj.get('id'), obj.get('subscription'))
        elif tipo in ('invoice.paid', 'invoice.payment_succeeded'):
            # Renovación mensual: reiniciar los contadores de intentos.
            self._renovar(obj.get('subscription'))
        elif tipo == 'customer.subscription.deleted':
            # La suscripción terminó o se canceló: bajar a gratis.
            self._cancelar(obj.get('id'))

        return HttpResponse(status=200)

    def _activar_plan(self, usuario_id, plan, session_id, subscription_id=None):
        if not usuario_id or plan not in PLANES_PAGABLES:
            return
        usuario = Usuario.objects(id_supabase=usuario_id).first()
        if not usuario:
            return
        usuario.plan = plan
        usuario.intentos_pesados = 0
        usuario.intentos_livianos = 0
        if subscription_id:
            usuario.stripe_subscription_id = subscription_id
        usuario.save()

        try:
            if session_id:
                pago = Pago.objects(stripe_session_id=session_id).first()
                if pago:
                    pago.estado = 'completado'
                    pago.save()
        except Exception:
            pass

        try:
            from apps.analysis.services import BitacoraService, NotificacionService
            BitacoraService.registrar(
                usuario_id=usuario.id_supabase,
                accion=f'Pago confirmado · Plan {plan.upper()}',
                modulo='Pagos',
                ip='stripe-webhook',
                detalles=f'Stripe confirmó el pago. Plan activado: {plan}',
            )
            for admin in Usuario.objects(rol='administrador'):
                NotificacionService.crear(
                    u_id=admin.id_supabase,
                    t='Pago recibido',
                    m=f'{usuario.nombre_usuario} pagó y subió al plan {plan.upper()}.',
                    tp='pago',
                )
        except Exception:
            pass

    def _renovar(self, subscription_id):
        """Renovación mensual confirmada: reinicia los contadores de intentos."""
        if not subscription_id:
            return
        usuario = Usuario.objects(stripe_subscription_id=subscription_id).first()
        if not usuario:
            return
        usuario.intentos_pesados = 0
        usuario.intentos_livianos = 0
        usuario.save()

    def _cancelar(self, subscription_id):
        """La suscripción terminó o se canceló: baja el usuario a gratis."""
        if not subscription_id:
            return
        usuario = Usuario.objects(stripe_subscription_id=subscription_id).first()
        if not usuario:
            return
        usuario.plan = 'gratis'
        usuario.stripe_subscription_id = None
        usuario.save()
        try:
            from apps.analysis.services import NotificacionService
            NotificacionService.crear(
                u_id=usuario.id_supabase,
                t='Suscripción finalizada',
                m='Tu suscripción terminó. Volviste al plan gratis.',
                tp='pago',
            )
        except Exception:
            pass


class CancelarSuscripcionView(APIView):
    """Cancela la suscripción al final del período (el usuario mantiene el plan hasta entonces)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        usuario = UsuarioService.obtener_por_supabase_id(request.user.id)
        if not usuario or not usuario.stripe_subscription_id:
            return respuesta_error('SIN_SUSCRIPCION', 'No tenés una suscripción activa', status.HTTP_400_BAD_REQUEST)
        try:
            stripe.Subscription.modify(usuario.stripe_subscription_id, cancel_at_period_end=True)
        except Exception as e:
            return respuesta_error('STRIPE_ERROR', f'No se pudo cancelar: {e}', status.HTTP_502_BAD_GATEWAY)
        return respuesta_exitosa(
            {'cancelada': True},
            mensaje='Suscripción cancelada. Mantenés el plan hasta el fin del período pagado.'
        )
