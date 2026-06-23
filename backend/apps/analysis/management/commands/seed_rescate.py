import os
import django
from django.core.management.base import BaseCommand
from apps.analysis.models import DatoEntrenamiento
import requests
import time

class Command(BaseCommand):
    help = 'Seeder de choque: Carga masiva desde fuentes estables'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('--- INICIANDO RESCATE DE DATOS (MASSIVE SEEDER) ---'))
        
        # Dataset 1: Detección general (Estable)
        # 1000 registros
        self.fetch_and_save(
            dataset="artitw/iris-dataset-ai-generated-text-vs-human-text",
            limit=1000
        )

        # Dataset 2: HC3 (Volvemos por más, pero con offset para variar)
        self.fetch_and_save(
            dataset="Hello-SimpleAI/HC3",
            limit=1000,
            offset=100
        )

        self.stdout.write(self.style.SUCCESS('--- SEEDER COMPLETADO ---'))

    def fetch_and_save(self, dataset, limit, offset=0):
        self.stdout.write(f'Cargando registros de {dataset}...')
        url = f"https://datasets-server.huggingface.co/rows?dataset={dataset.replace('/', '%2F')}&config=default&split=train&offset={offset}&limit={limit}"
        
        # HC3 a veces usa config 'all'
        if "HC3" in dataset:
            url = url.replace("config=default", "config=all")

        try:
            response = requests.get(url, timeout=30)
            if response.status_code != 200:
                self.stdout.write(self.style.ERROR(f"Error {response.status_code} en {dataset}"))
                return

            rows = response.json().get('rows', [])
            count = 0
            for row in rows:
                item = row['row']
                
                # Lógica para IRIS dataset (text, label)
                if 'text' in item and 'label' in item:
                    txt = item['text']
                    lbl = int(item['label']) # 0=Human, 1=AI en este dataset
                    if not DatoEntrenamiento.objects(contenido=txt[:5000]).first():
                        DatoEntrenamiento(contenido=txt[:5000], etiqueta=lbl, fuente='RESCATE').save()
                        count += 1
                
                # Lógica para HC3 (human_answers, chatgpt_answers)
                elif 'human_answers' in item:
                    for h in item['human_answers']:
                        if not DatoEntrenamiento.objects(contenido=h[:5000]).first():
                            DatoEntrenamiento(contenido=h[:5000], etiqueta=0, fuente='RESCATE').save()
                            count += 1
                    for a in item['chatgpt_answers']:
                        if not DatoEntrenamiento.objects(contenido=a[:5000]).first():
                            DatoEntrenamiento(contenido=a[:5000], etiqueta=1, fuente='RESCATE').save()
                            count += 1
                
                if count >= limit: break
            
            self.stdout.write(self.style.SUCCESS(f'Añadidos {count} registros de {dataset}'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Excepción en {dataset}: {e}'))
