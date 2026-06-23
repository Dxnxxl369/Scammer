import os
import django
import torch
from transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification
import requests
from decouple import config

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def comparar_detectores(texto):
    print("\n" + "="*50)
    print("COMPARATIVA DE DETECCIÓN DE TEXTO IA")
    print("="*50)
    print(f"Texto a analizar: {texto[:100]}...")
    
    # --- 1. NUESTRO MODELO LOCAL ---
    print("\n[1] Analizando con SCAMMER-TEXT-V1 (Local)...")
    model_path = "./models/text_detector/final_model"
    
    if not os.path.exists(model_path):
        print("ERROR: Modelo local no encontrado. ¿Ya lo entrenaste?")
        local_res = "N/A"
    else:
        # Cargamos el pipeline de clasificación
        pipe = pipeline("text-classification", model=model_path, tokenizer=model_path)
        res = pipe(texto)[0]
        # label_0 = Humano, label_1 = IA (según nuestro seeder)
        label = "IA" if res['label'] == 'LABEL_1' else "HUMANO"
        prob = res['score'] * 100
        local_res = f"{label} (Confianza: {prob:.2f}%)"
        print(f"Resultado Local: {local_res}")

    # --- 2. SAPLING API ---
    print("\n[2] Analizando con SAPLING API...")
    sapling_key = config('SAPLING_API_KEY', default='')
    if not sapling_key:
        print("ERROR: No hay SAPLING_API_KEY en el .env")
        sapling_res = "N/A"
    else:
        try:
            r = requests.post("https://api.sapling.ai/api/v1/aidetect", json={
                "key": sapling_key,
                "text": texto
            }, timeout=10)
            data = r.json()
            prob_ia = data.get('score', 0) * 100
            label_s = "IA" if prob_ia > 50 else "HUMANO"
            sapling_res = f"{label_s} (Probabilidad IA: {prob_ia:.2f}%)"
            print(f"Resultado Sapling: {sapling_res}")
        except Exception as e:
            print(f"Error Sapling: {e}")
            sapling_res = "ERROR"

    print("\n" + "="*50)
    print("RESUMEN FINAL:")
    print(f"LOCAL:   {local_res}")
    print(f"SAPLING: {sapling_res}")
    print("="*50)

if __name__ == "__main__":
    archivo_texto = "texto.txt"
    
    while True:
        print("\n" + "-"*30)
        print(f"Leyendo contenido de: {archivo_texto}")
        
        try:
            if os.path.exists(archivo_texto):
                with open(archivo_texto, "r", encoding="utf-8") as f:
                    t = f.read().strip()
                
                if not t:
                    print("ADVERTENCIA: El archivo texto.txt está vacío.")
                else:
                    comparar_detectores(t)
            else:
                print(f"ERROR: No se encuentra el archivo {archivo_texto} en la raíz.")
                with open(archivo_texto, "w", encoding="utf-8") as f:
                    f.write("Pega aquí el texto a analizar.")
                print("Se ha creado un archivo texto.txt vacío. Llénaro y presiona Enter.")

        except Exception as e:
            print(f"Error al leer el archivo: {e}")

        opcion = input("\n¿Analizar de nuevo? (s/n): ").lower().strip()
        if opcion != 's':
            print("Cerrando comparador. ¡Hasta luego!")
            break
