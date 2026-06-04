import os
import sys
import ssl

# Desactivar la verificación SSL para evitar errores de certificados en Windows
ssl._create_default_https_context = ssl._create_unverified_context

# Intentar usar el entorno virtual si existe
venv_site_packages = os.path.join(os.getcwd(), 'venv', 'Lib', 'site-packages')
if os.path.exists(venv_site_packages):
    sys.path.append(venv_site_packages)

print("--- DESCARGADOR DE IA AUDIO ESPECIALISTA (Gary Stafford) ---")
print("Este modelo es experto en detectar IAs de alta gama (Gemini/ElevenLabs).")
print("Descargando aproximadamente 380MB...")

try:
    from transformers import AutoModelForAudioClassification, AutoFeatureExtractor
    
    # El modelo especialista actualizado para 2025
    model_id = "garystafford/wav2vec2-deepfake-voice-detector"
    
    print(f"\nConectando con Hugging Face: {model_id}...")
    
    print(f"1. Descargando Extractor de Características...")
    AutoFeatureExtractor.from_pretrained(model_id, trust_remote_code=True)
    
    print(f"2. Descargando Pesos del Modelo Especialista...")
    AutoModelForAudioClassification.from_pretrained(model_id, trust_remote_code=True)
    
    print("\n[OK] ¡Modelo Especialista descargado exitosamente!")
    print("Ya puedes cerrar esta ventana. Ahora uniremos los dos oídos de la IA.")
except Exception as e:
    print(f"\n[ERROR]: {e}")
    print("\nVerifica tu conexión a internet.")

input("\nPresiona ENTER para cerrar...")
