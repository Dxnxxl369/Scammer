import os
import sys
import ssl

# Desactivar la verificación SSL para evitar errores de certificados en Windows
ssl._create_default_https_context = ssl._create_unverified_context

# Intentar usar el entorno virtual si existe
venv_site_packages = os.path.join(os.getcwd(), 'venv', 'Lib', 'site-packages')
if os.path.exists(venv_site_packages):
    sys.path.append(venv_site_packages)

print("--- DESCARGADOR DE MODELO PROFESIONAL (MelodyMachine V2) ---")
print("Este modelo es mucho más preciso (9.7k descargas).")
print("Descargando aproximadamente 380MB...")

try:
    from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
    
    # El modelo "Rey" de Hugging Face para audio deepfakes
    model_id = "MelodyMachine/Deepfake-audio-detection-V2"
    
    print(f"\nConectando con Hugging Face: {model_id}...")
    
    print(f"1. Descargando Extractor de Características...")
    AutoFeatureExtractor.from_pretrained(model_id, trust_remote_code=True)
    
    print(f"2. Descargando Pesos del Modelo (V2)...")
    AutoModelForAudioClassification.from_pretrained(model_id, trust_remote_code=True)
    
    print("\n[OK] ¡Modelo V2 descargado exitosamente!")
    print("Ya puedes cerrar esta ventana. Ahora actualizaré el software para usarlo.")
except Exception as e:
    print(f"\n[ERROR]: {e}")
    print("\nVerifica tu internet. Si el error persiste, intenta borrar el caché viejo.")

input("\nPresiona ENTER para cerrar...")
