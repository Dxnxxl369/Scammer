from datetime import datetime
from mongoengine import (
    Document, StringField, EmailField, BooleanField,
    DateTimeField, IntField
)


class Usuario(Document):
    id_supabase = StringField(required=True, unique=True, max_length=64)
    correo = EmailField(required=True, unique=True, max_length=120)
    nombre_usuario = StringField(required=True, unique=True, max_length=50, min_length=3)
    nombre_completo = StringField(max_length=120)
    rol = StringField(choices=['administrador', 'usuario'], default='usuario')
    plan = StringField(choices=['gratis', 'starter', 'pro', 'elite'], default='gratis')
    fcm_token = StringField() # Token para notificaciones push de Firebase
    pais = StringField(default='BO', max_length=2)
    activo = BooleanField(default=True)
    bloqueado = BooleanField(default=False)
    
    intentos_livianos = IntField(default=0, min_value=0)
    intentos_pesados = IntField(default=0, min_value=0)
    
    fecha_creacion = DateTimeField(default=datetime.utcnow)
    fecha_actualizacion = DateTimeField(default=datetime.utcnow)
    ultima_conexion = DateTimeField(default=datetime.utcnow)
    esta_online = BooleanField(default=False)

    meta = {
        'collection': 'usuarios',
        'indexes': [
            {'fields': ['id_supabase'], 'unique': True, 'name': 'id_supabase_unico'},
            {'fields': ['correo'], 'unique': True, 'name': 'correo_unico'},
            {'fields': ['nombre_usuario'], 'unique': True, 'name': 'nombre_usuario_unico'},
            {'fields': ['rol']},
            {'fields': ['plan']},
            {'fields': ['esta_online']},
            {'fields': ['-fecha_creacion']},
            {'fields': ['-ultima_conexion']},
        ]
    }

    def save(self, *args, **kwargs):
        if self.correo:
            self.correo = self.correo.lower().strip()
        if self.nombre_usuario:
            self.nombre_usuario = self.nombre_usuario.lower().strip()
        self.fecha_actualizacion = datetime.utcnow()
        return super().save(*args, **kwargs)

    def to_dict(self):
        return {
            'id': str(self.id),
            'id_supabase': self.id_supabase,
            'correo': self.correo,
            'nombre_usuario': self.nombre_usuario,
            'nombre_completo': self.nombre_completo,
            'rol': self.rol,
            'plan': self.plan,
            'pais': self.pais,
            'activo': self.activo,
            'bloqueado': self.bloqueado,
            'esta_online': self.esta_online,
            'intentos_livianos': self.intentos_livianos,
            'intentos_pesados': self.intentos_pesados,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'ultima_conexion': self.ultima_conexion.isoformat() if self.ultima_conexion else None,
        }


class Anonimo(Document):
    id_sesion = StringField(required=True, unique=True, max_length=64)
    ip = StringField(max_length=45)
    navegador = StringField(max_length=500)
    pais = StringField(max_length=2)
    
    intentos_livianos = IntField(default=0, min_value=0)
    intentos_pesados = IntField(default=0, min_value=0)
    
    fecha_creacion = DateTimeField(default=datetime.utcnow)
    fecha_expiracion = DateTimeField(required=True)

    meta = {
        'collection': 'anonimos',
        'indexes': [
            {'fields': ['id_sesion'], 'unique': True, 'name': 'id_sesion_unico'},
            {'fields': ['fecha_expiracion'], 'expireAfterSeconds': 0, 'name': 'borrado_automatico'},
            {'fields': ['ip']},
        ]
    }

    def to_dict(self):
        return {
            'id': str(self.id),
            'id_sesion': self.id_sesion,
            'ip': self.ip,
            'navegador': self.navegador,
            'pais': self.pais,
            'intentos_livianos': self.intentos_livianos,
            'intentos_pesados': self.intentos_pesados,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_expiracion': self.fecha_expiracion.isoformat() if self.fecha_expiracion else None,
        }


# Precios y límites por plan, editables por el administrador.
# Los límites se leen desde aquí (con fallback a valores por defecto en el código).
class ConfiguracionPlan(Document):
    plan = StringField(required=True, unique=True, choices=['gratis', 'starter', 'pro', 'elite'])
    precio_centavos = IntField(default=0, min_value=0)   # Stripe cobra en centavos (ej. 999 = $9.99)
    moneda = StringField(default='usd', max_length=3)
    limite_livianos = IntField(default=10, min_value=0)
    limite_pesados = IntField(default=3, min_value=0)
    activo = BooleanField(default=True)
    fecha_actualizacion = DateTimeField(default=datetime.utcnow)

    meta = {'collection': 'configuracion_planes'}

    def to_dict(self):
        return {
            'plan': self.plan,
            'precio_centavos': self.precio_centavos,
            'precio': round((self.precio_centavos or 0) / 100, 2),
            'moneda': self.moneda,
            'limite_livianos': self.limite_livianos,
            'limite_pesados': self.limite_pesados,
            'activo': self.activo,
        }


# Registro de cada pago confirmado por Stripe (auditoría).
class Pago(Document):
    id_supabase = StringField(required=True, max_length=64)
    plan = StringField(required=True)
    monto_centavos = IntField(default=0)
    moneda = StringField(default='usd', max_length=3)
    stripe_session_id = StringField(max_length=255)
    estado = StringField(default='completado')  # completado / pendiente / fallido
    fecha_creacion = DateTimeField(default=datetime.utcnow)

    meta = {'collection': 'pagos', 'ordering': ['-fecha_creacion']}

    def to_dict(self):
        return {
            'id': str(self.id),
            'id_supabase': self.id_supabase,
            'plan': self.plan,
            'monto_centavos': self.monto_centavos,
            'monto': round((self.monto_centavos or 0) / 100, 2),
            'moneda': self.moneda,
            'estado': self.estado,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
        }
