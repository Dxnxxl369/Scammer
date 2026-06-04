import os
import django
from datetime import datetime, timedelta
from decouple import config

# Configuración de entorno Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.analysis.models import Analisis
from apps.analysis.services import StorageService
from apps.authentication.models import Usuario

def ejecutar_purga_forense():
    """
    Script de mantenimiento para limpiar Supabase Storage y MongoDB 
    según los protocolos de retención de cada plan.
    """
    print(f"[{datetime.now()}] INICIANDO PROTOCOLO DE PURGA...")
    
    ahora = datetime.utcnow()
    total_purgados = 0

    # 1. Obtener todos los análisis que tienen contenido físico (URL pública)
    # Filtramos por aquellos que contienen 'supabase.co' en el contenido
    analisis_con_archivos = Analisis.objects(contenido__contains='supabase.co')

    for analisis in analisis_con_archivos:
        usuario = Usuario.objects(id_supabase=analisis.id_supabase).first()
        plan = usuario.plan if usuario else 'gratis'
        
        # Protocolos de Retención
        dias_retencion = 3 # Default FREE
        if plan == 'starter': dias_retencion = 15
        elif plan == 'pro': dias_retencion = 30
        elif plan == 'elite': dias_retencion = 9999 # Persistente
        
        fecha_limite = analisis.fecha_creacion + timedelta(days=dias_retencion)
        
        # ¿Ha expirado el rastro?
        if ahora > fecha_limite:
            print(f"  > EXPIRADO: ID {analisis.id} | Plan: {plan} | Creado: {analisis.fecha_creacion}")
            
            # Borrar de Supabase Storage
            StorageService.borrar(analisis.contenido)
            
            # Actualizar MongoDB (Dejar solo el rastro nominal)
            analisis.contenido = "[PURGADO POR PROTOCOLO DE TIEMPO]"
            analisis.save()
            total_purgados += 1

    print(f"[{datetime.now()}] PURGA FINALIZADA. TOTAL EVIDENCIAS ELIMINADAS: {total_purgados}")

if __name__ == "__main__":
    ejecutar_purga_forense()
