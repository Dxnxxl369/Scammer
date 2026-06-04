import os
import sys
import ssl

# Desactivar la verificación SSL para evitar errores de certificados en Windows
ssl._create_default_https_context = ssl._create_unverified_context

# Intentar usar el entorno virtual si existe
venv_site_packages = os.path.join(os.getcwd(), 'venv', 'Lib', 'site-packages')
if os.path.exists(venv_site_packages):
    sys.path.append(venv_site_packages)

print("--- DESCARGADOR DE IA SEMÁNTICA (OpenAI CLIP) ---")
print("Este modelo servirá como la CAPA 3 de filtrado para tus videos.")
print("Descargando aproximadamente 600MB...")

try:
    from transformers import CLIPProcessor, CLIPModel
    
    # El modelo más equilibrado para PCs con 8GB de RAM
    model_id = "openai/clip-vit-base-patch32"
    
    print(f"\nConectando con Hugging Face: {model_id}...")
    
    print(f"1. Descargando Procesador de CLIP...")
    CLIPProcessor.from_pretrained(model_id)
    
    print(f"2. Descargando Pesos de la IA Visual (este es el más pesado)...")
    CLIPModel.from_pretrained(model_id)
    
    print("\n[OK] ¡IA Semántica CLIP descargada exitosamente!")
    print("Ya puedes cerrar esta ventana. Mañana activaremos la lógica de 3 capas.")
except Exception as e:
    print(f"\n[ERROR]: {e}")
    print("\nVerifica tu internet. Este modelo es un poco más grande que el de audio.")

input("\nPresiona ENTER para cerrar...")
