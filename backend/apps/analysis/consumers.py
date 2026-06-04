import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)

import json
import logging
import asyncio
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from apps.authentication.models import Usuario

logger = logging.getLogger(__name__)

# Diccionario global para rastrear tareas de desconexión pendientes
# Clave: user_id, Valor: asyncio.Task
pending_disconnects = {}

class NotificacionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            query_string = self.scope.get('query_string', b'').decode('utf-8')
            params = dict(x.split('=') for x in query_string.split('&') if '=' in x)
            self.user_id = params.get('user_id')

            # SEGURIDAD: Rechazo inmediato si la identidad es sospechosa o nula
            if not self.user_id or self.user_id in ['undefined', 'null', 'None', '']:
                await self.close()
                return

            self.group_name = f"user_{self.user_id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            
            # NOTA: Ya no cambiamos el estado a 'online' aquí. 
            # El estado se maneja por Login/Logout explícito.
            
            await self.send(text_data=json.dumps({
                "type": "connection_established",
                "mensaje": "Enlace forense activo (Modo Pasivo)"
            }))
        except Exception as e:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)
            # NOTA: Ya no ponemos al usuario como 'offline' al desconectar.
            # Daphne puede cerrar el socket por timeout durante análisis pesados,
            # pero el usuario sigue "vivo" en su sesión.

    async def send_notification(self, event):
        try:
            # Ignoramos pings/pongs, ya no son necesarios para la lógica de presencia
            if event.get("type") == "ping": return
            await self.send(text_data=json.dumps(event["data"]))
        except: pass


class AdminBitacoraConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        try:
            self.group_name = "admin_bitacora"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
            
            await self.send(text_data=json.dumps({
                "type": "connection_established",
                "mensaje": "Sincronización de bitácora global activa."
            }))
            print("WS: [OK] Admin conectado a la bitácora.")
        except Exception as e:
            print(f"WS_ADMIN_ERROR: {e}")
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def new_log(self, event):
        try:
            await self.send(text_data=json.dumps(event["data"]))
        except Exception as e:
            print(f"WS_ADMIN_SEND_ERROR: {e}")

    async def presence_update(self, event):
        try:
            # Re-enviar la actualización de presencia al frontend del admin
            await self.send(text_data=json.dumps({
                "type": "presence_update",
                "data": event["data"]
            }))
        except Exception as e:
            print(f"WS_PRESENCE_SEND_ERROR: {e}")
