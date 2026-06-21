from datetime import datetime
from mongoengine import Document, StringField, FloatField, DateTimeField, ListField, DictField, IntField, BooleanField

class Analisis(Document):
    id_supabase = StringField(required=True)
    tipo = StringField(choices=['texto', 'imagen', 'audio', 'url', 'video', 'documento', 'codigo', 'sms', 'llamada'], required=True)
    contenido = StringField()  # Texto analizado o URL
    id_archivo = StringField()  # ID en almacenamiento
    
    probabilidad_ia = FloatField(required=True)
    veredicto = StringField(required=True)
    detalles = StringField()
    nombre_archivo = StringField()
    extension = StringField()
    puntos_criticos = ListField(DictField())
    
    fecha_creacion = DateTimeField(default=datetime.utcnow)
    
    meta = {
        'collection': 'analisis',
        'indexes': ['id_supabase', 'tipo', '-fecha_creacion']
    }

    def to_dict(self):
        return {
            'id': str(self.id),
            'tipo': self.tipo,
            'contenido': self.contenido,
            'probabilidadIA': self.probabilidad_ia,
            'veredicto': self.veredicto,
            'detalles': self.detalles,
            'nombreArchivo': self.nombre_archivo,
            'extension': self.extension,
            'puntosCriticos': self.puntos_criticos,
            'fecha': self.fecha_creacion.isoformat()
        }

class Bitacora(Document):
    usuario_id = StringField(required=True) # id_supabase o 'ANONIMO'
    accion = StringField(required=True)
    modulo = StringField()
    ip = StringField()
    estado = StringField(choices=['EXITO', 'ERROR', 'ADVERTENCIA'], default='EXITO')
    detalles = StringField()
    fecha_creacion = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'bitacora',
        'indexes': ['usuario_id', '-fecha_creacion']
    }

    def to_dict(self):
        return {
            'id': str(self.id),
            'usuario': self.usuario_id,
            'accion': self.accion,
            'modulo': self.modulo,
            'ip': self.ip,
            'estado': self.estado,
            'detalles': self.detalles,
            'fecha': self.fecha_creacion.isoformat()
        }

class DatoEntrenamiento(Document):
    contenido = StringField(required=True)
    etiqueta = IntField(required=True) # 1 = IA, 0 = Humano
    fuente = StringField(default='USUARIO') # 'USUARIO' o 'SEEDER'
    confianza_original = FloatField()
    fecha_creacion = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'training_data',
        'indexes': ['etiqueta', 'fuente']
    }

class Notificacion(Document):
    usuario_id = StringField(required=True) # id_supabase del admin o destinatario
    titulo = StringField(required=True)
    mensaje = StringField(required=True)
    tipo = StringField(choices=['pago', 'seguridad', 'registro', 'sistema', 'analisis_pesado', 'analisis_liviano'], default='sistema')
    analisis_id = StringField() # Para navegación directa
    leido = BooleanField(default=False)
    fecha_creacion = DateTimeField(default=datetime.utcnow)

    meta = {
        'collection': 'notificaciones',
        'indexes': ['usuario_id', '-fecha_creacion', 'leido']
    }

    def to_dict(self):
        return {
            'id': str(self.id),
            'titulo': self.titulo,
            'mensaje': self.mensaje,
            'tipo': self.tipo,
            'analisis_id': self.analisis_id,
            'leido': self.leido,
            'fecha': self.fecha_creacion.isoformat()
        }

class PreferenciaNotificacion(Document):
    usuario_id = StringField(required=True, unique=True)
    global_push = BooleanField(default=True)
    # Canales definidos en 3.html:
    # analisis_liviano, analisis_pesado, seguridad, pago, registro, sistema
    canales = DictField(default={
        'analisis_liviano': {'mostrar': True, 'notificar': False, 'sonar': True},
        'analisis_pesado': {'mostrar': True, 'notificar': True, 'sonar': True},
        'seguridad': {'mostrar': True, 'notificar': True, 'sonar': True},
        'pago': {'mostrar': True, 'notificar': True, 'sonar': True},
        'registro': {'mostrar': True, 'notificar': False, 'sonar': True},
        'sistema': {'mostrar': True, 'notificar': False, 'sonar': False}
    })

    meta = {
        'collection': 'preferencias_notificacion'
    }
