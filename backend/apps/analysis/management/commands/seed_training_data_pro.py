import os
import django
from django.core.management.base import BaseCommand
from apps.analysis.models import DatoEntrenamiento
import requests

class Command(BaseCommand):
    help = 'Carga datos masivos y multilingües (Español/Inglés) para mejorar el detector'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('--- INICIANDO SEEDER MULTILINGÜE PRO ---'))
        
        # 1. Dataset HC3 (Más volumen, inglés técnico/informativo)
        # Cargamos 1000 registros (500 IA, 500 Humano aprox)
        self.seed_from_huggingface(
            dataset="Hello-SimpleAI/HC3",
            config="all",
            limit=1000,
            label_mapping={'human_answers': 0, 'chatgpt_answers': 1}
        )

        # 2. Dataset Multilingüe (Incluye Español)
        # Este dataset es específico para detección de IA
        self.seed_from_huggingface(
            dataset="Sven91/multilingual-ai-generated-text-detection",
            config="default",
            limit=1000,
            label_mapping={'text': 'contenido', 'label': 'etiqueta'} 
        )

        self.stdout.write(self.style.SUCCESS('--- SEEDER PRO FINALIZADO ---'))

    def seed_from_huggingface(self, dataset, config, limit, label_mapping):
        self.stdout.write(f'Intentando cargar muestra de {dataset}...')
        # Usamos la API de datasets-server para no descargar archivos pesados
        url = f"https://datasets-server.huggingface.co/rows?dataset={dataset.replace('/', '%2F')}&config={config}&split=train&offset=0&limit={limit}"
        
        try:
            response = requests.get(url, timeout=20)
            if response.status_code != 200:
                self.stdout.write(self.style.WARNING(f"No se pudo acceder a {dataset}. Status: {response.status_code}"))
                return

            data = response.json()
            count = 0
            
            for row in data.get('rows', []):
                item = row['row']
                
                # Caso HC3 (Estructura de listas: question, human_answers, chatgpt_answers)
                if 'human_answers' in item:
                    # Guardamos la primera respuesta de cada uno para balancear
                    h_ans = item['human_answers'][0] if item['human_answers'] else None
                    ai_ans = item['chatgpt_answers'][0] if item['chatgpt_answers'] else None
                    
                    if h_ans and not DatoEntrenamiento.objects(contenido=h_ans[:5000]).first():
                        DatoEntrenamiento(contenido=h_ans[:5000], etiqueta=0, fuente=f'PRO_{dataset}').save()
                        count += 1
                    if ai_ans and not DatoEntrenamiento.objects(contenido=ai_ans[:5000]).first():
                        DatoEntrenamiento(contenido=ai_ans[:5000], etiqueta=1, fuente=f'PRO_{dataset}').save()
                        count += 1
                
                # Caso Genérico (texto y etiqueta directa)
                elif 'text' in item:
                    txt = item['text']
                    # Mapeo de etiquetas (algunos datasets usan 'label', otros 'labels', etc.)
                    lbl = item.get('label', item.get('labels', 0))
                    
                    # Normalizar etiqueta si es necesario (algunos usan 1 para Humano, 2 para IA, etc.)
                    # Aquí asumimos 0=Humano, 1=IA como base
                    if not DatoEntrenamiento.objects(contenido=txt[:5000]).first():
                        DatoEntrenamiento(contenido=txt[:5000], etiqueta=int(lbl), fuente=f'PRO_{dataset}').save()
                        count += 1
                
                if count >= limit: break
            
            self.stdout.write(self.style.SUCCESS(f'Añadidos {count} registros desde {dataset}.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error cargando {dataset}: {e}'))
