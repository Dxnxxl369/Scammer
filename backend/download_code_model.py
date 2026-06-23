import os
import sys
import ssl
from decouple import config

# Desactivar la verificación SSL para evitar errores de certificados en Windows
ssl._create_default_https_context = ssl._create_unverified_context

# Intentar usar el entorno virtual si existe
venv_site_packages = os.path.join(os.getcwd(), 'venv', 'Lib', 'site-packages')
if os.path.exists(venv_site_packages):
    sys.path.append(venv_site_packages)

print("--- DESCARGADOR DEL MODELO DE DETECCIÓN DE CÓDIGO (Qwen2.5-Coder-0.5B) ---")
print("Descargando aproximadamente 950MB...")

try:
    from transformers import AutoTokenizer, AutoModelForCausalLM

    model_id = config('CODE_DETECTOR_MODEL', default='Qwen/Qwen2.5-Coder-0.5B')
    hf_token = config('HF_TOKEN', default=config('HF_API_TOKEN', default=None))
    
    if not hf_token:
        print("[ADVERTENCIA] No se detectó un token de Hugging Face en el archivo .env.")
        print("La descarga se hará de forma anónima y podría ser muy lenta o fallar.")
    else:
        print(f"Token de Hugging Face detectado. Iniciando descarga autenticada para mayor velocidad...")

    print(f"\nConectando con Hugging Face para descargar '{model_id}'...")
    
    print(f"\n1/2. Descargando Tokenizer...")
    AutoTokenizer.from_pretrained(model_id, token=hf_token)
    
    print(f"\n2/2. Descargando Pesos del Modelo (esto puede tardar unos minutos)...")
    AutoModelForCausalLM.from_pretrained(model_id, token=hf_token)
    
    print("\n[OK] ¡Modelo de código descargado y guardado en caché exitosamente!")
    print("Ya puedes usar el módulo de análisis de código en la aplicación sin esperas.")
except Exception as e:
    print(f"\n[ERROR]: {e}")
    print("\nVerifica tu conexión a internet.")

input("\nPresiona ENTER para salir...")
