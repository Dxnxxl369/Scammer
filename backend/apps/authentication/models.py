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
