import os
import django
from django.core.management.base import BaseCommand
from apps.analysis.models import DatoEntrenamiento
import requests

class Command(BaseCommand):
    help = 'Carga datos de entrenamiento desde el dataset HC3 (HuggingFace)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Iniciando Seeder de Datos...'))
        
        # URL de un subset de HC3 en formato JSONL o CSV simplificado para no descargar gigas
        # Usaremos la API de Hugging Face para obtener una muestra
        url = "https://datasets-server.huggingface.co/rows?dataset=Hello-SimpleAI%2FHC3&config=all&split=train&offset=0&limit=100"
        
        try:
            response = requests.get(url)
            data = response.json()
            
            count = 0
            for row in data['rows']:
                item = row['row']
                # HC3 tiene 'question', 'human_answers' (lista) y 'chatgpt_answers' (lista)
                
                # Guardar Humano
                for ans in item['human_answers']:
                    if not DatoEntrenamiento.objects(contenido=ans[:5000]).first():
                        DatoEntrenamiento(contenido=ans[:5000], etiqueta=0, fuente='SEEDER_HC3').save()
                        count += 1
                
                # Guardar IA
                for ans in item['chatgpt_answers']:
                    if not DatoEntrenamiento.objects(contenido=ans[:5000]).first():
                        DatoEntrenamiento(contenido=ans[:5000], etiqueta=1, fuente='SEEDER_HC3').save()
                        count += 1
                
                if count >= 200: break # Muestra pequeña para demo
                
            self.stdout.write(self.style.SUCCESS(f'Seeder completado. {count} nuevos registros añadidos.'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error en el seeder: {e}'))
