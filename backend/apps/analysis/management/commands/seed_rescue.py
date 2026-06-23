import os
import django
from django.core.management.base import BaseCommand
from apps.analysis.models import DatoEntrenamiento
import requests
import time

class Command(BaseCommand):
    help = 'Seeder de alta disponibilidad y volumen para el detector de IA'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('--- INICIANDO RESCATE DE DATOS ---'))
        
        datasets = [
            {
                "id": "Hello-SimpleAI/HC3",
                "config": "all",
                "limit": 1000
            },
            {
                "id": "fancyzhao/vllm_generated_data",
                "config": "default",
                "limit": 500
            },
            {
                "id": "artem9k/ai-generated-papers",
                "config": "default",
                "limit": 500
            }
        ]

        total_añadidos = 0
        for ds in datasets:
            añadidos = self.fetch_data(ds['id'], ds['config'], ds['limit'])
            total_añadidos += añadidos
            time.sleep(1) # Evitar rate limit

        self.stdout.write(self.style.SUCCESS(f'--- PROCESO FINALIZADO. TOTAL: {total_añadidos} registros ---'))

    def fetch_data(self, dataset_id, config, limit):
        self.stdout.write(f'Cargando {dataset_id}...')
        url = f"https://datasets-server.huggingface.co/rows?dataset={dataset_id.replace('/', '%2F')}&config={config}&split=train&offset=0&limit={limit}"
        
        try:
            response = requests.get(url, timeout=25)
            if response.status_code != 200:
                self.stdout.write(self.style.WARNING(f"Saltando {dataset_id} (Status {response.status_code})"))
                return 0
            
            data = response.json()
            count = 0
            for row in data.get('rows', []):
                item = row['row']
                
                # Lógica de extracción según el dataset
                content = ""
                label = -1

                if 'human_answers' in item: # Caso HC3
                    h_ans = item['human_answers'][0] if item['human_answers'] else ""
                    ai_ans = item['chatgpt_answers'][0] if item['chatgpt_answers'] else ""
                    if h_ans: self.save_if_new(h_ans, 0, dataset_id); count += 1
                    if ai_ans: self.save_if_new(ai_ans, 1, dataset_id); count += 1
                elif 'text' in item and 'label' in item: # Estándar
                    self.save_if_new(item['text'], int(item['label']), dataset_id); count += 1
                elif 'abstract' in item: # Caso papers (todos son IA o Humano según el dataset)
                    label = 1 if 'ai' in dataset_id.lower() else 0
                    self.save_if_new(item['abstract'], label, dataset_id); count += 1
                
                if count >= limit: break
            
            self.stdout.write(self.style.SUCCESS(f'Añadidos {count} de {dataset_id}'))
            return count
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error en {dataset_id}: {e}'))
            return 0

    def save_if_new(self, text, label, source):
        if len(text) < 50: return # Ignorar textos muy cortos
        if not DatoEntrenamiento.objects(contenido=text[:5000]).first():
            DatoEntrenamiento(contenido=text[:5000], etiqueta=label, fuente=f'RESCUE_{source}').save()
