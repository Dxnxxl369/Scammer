"""
Detector de deepfake de voz — LOCAL (sin la Inference API de Hugging Face).

Carga el modelo de clasificación de audio desde la caché local de HF
(MelodyMachine/Deepfake-audio-detection-V2 por defecto) y lo corre en el servidor,
igual que el detector de código. Elimina la dependencia de
api-inference.huggingface.co y de HF_API_TOKEN.

El modelo devuelve dos etiquetas: 'real' y 'fake' (confirmado en pruebas).
Configurable por entorno: AUDIO_DETECTOR_MODEL.
"""
import numpy as np
from decouple import config

# Etiquetas que cuentan como "voz sintética / IA" según el modelo en uso.
ETIQUETAS_FAKE = ['fake', 'aivoice', 'spoof', 'synthetic', 'label_1']

_PIPE = None


def cargar_pipeline():
    """Carga perezosa (una sola vez) del pipeline de clasificación de audio.
    El import de transformers/torch ocurre acá, solo cuando se usa de verdad."""
    global _PIPE
    if _PIPE is None:
        from transformers import pipeline
        modelo = config('AUDIO_DETECTOR_MODEL', default='MelodyMachine/Deepfake-audio-detection-V2')
        print(f"[AUDIO] Cargando modelo local: {modelo} ...")
        _PIPE = pipeline("audio-classification", model=modelo)
        print("[AUDIO] Modelo de audio cargado (local, sin API de HF).")
    return _PIPE


def _resample_compat(resampler, frame):
    """PyAV cambió la firma de resample() entre versiones: a veces devuelve un
    frame, a veces una lista, a veces None. Esto normaliza a lista."""
    out = resampler.resample(frame)
    if out is None:
        return []
    return out if isinstance(out, list) else [out]


def cargar_audio(file_bytes, sr=16000):
    """Carga audio a mono float32 a `sr` Hz.

    1) Intenta soundfile (vía librosa): rápido y ya funciona para WAV/FLAC/OGG/MP3.
    2) Si el formato no se reconoce (típico de AAC/M4A de los grabadores de llamada),
       cae a PyAV, que trae ffmpeg incluido (no requiere instalar ffmpeg en el sistema).
    """
    import io as _io
    import numpy as np

    # 1) Ruta rápida: soundfile/librosa (sin cambios para lo que ya andaba)
    try:
        import librosa
        return librosa.load(_io.BytesIO(file_bytes), sr=sr)
    except Exception:
        pass  # formato no soportado por libsndfile -> probamos PyAV

    # 2) Fallback universal: PyAV (AAC, M4A, MP3, OGG, ...)
    try:
        import av
    except ImportError:
        raise Exception(
            "Formato de audio no soportado por soundfile (¿AAC/M4A del grabador?). "
            "Instala el decodificador universal con: pip install av"
        )

    contenedor = av.open(_io.BytesIO(file_bytes))
    try:
        stream = contenedor.streams.audio[0]
        resampler = av.AudioResampler(format="flt", layout="mono", rate=sr)
        trozos = []
        for frame in contenedor.decode(stream):
            for rf in _resample_compat(resampler, frame):
                trozos.append(np.asarray(rf.to_ndarray()).reshape(-1))
        # drenar lo que quede en el resampler
        for rf in _resample_compat(resampler, None):
            trozos.append(np.asarray(rf.to_ndarray()).reshape(-1))
    finally:
        contenedor.close()

    audio = np.concatenate(trozos).astype(np.float32) if trozos else np.zeros(0, dtype=np.float32)
    return audio, sr


def prob_fake(salida) -> float:
    """De la salida del pipeline ([{label, score}, ...]) saca la probabilidad
    (0..1) de la clase 'fake'/sintética. Si no la encuentra, 0.0."""
    return next(
        (r['score'] for r in salida
         if isinstance(r, dict) and r.get('label', '').lower() in ETIQUETAS_FAKE),
        0.0,
    )


def analizar_segmentos(audio_data, sr, pipe=None, max_segmentos=10, corte_temprano=90.0):
    """Parte el audio en segmentos de 3 s (máx `max_segmentos`), clasifica cada uno
    y devuelve el PICO de probabilidad de 'fake' en % (0..100).
    `pipe` es inyectable para poder testear sin cargar el modelo real."""
    if pipe is None:
        pipe = cargar_pipeline()
    muestras_3s = 3 * sr
    total = len(audio_data)
    num_segs = int(np.ceil(total / muestras_3s)) if total else 0
    num_segs = min(num_segs, max_segmentos)
    max_prob = 0.0
    for i in range(num_segs):
        seg = audio_data[i * muestras_3s:(i + 1) * muestras_3s]
        if len(seg) < (sr * 0.5):
            continue
        salida = pipe({"array": seg, "sampling_rate": sr})
        pico = prob_fake(salida) * 100
        if pico > max_prob:
            max_prob = pico
        if max_prob > corte_temprano:
            break
    return max_prob


def veredicto(max_prob: float):
    """A partir del pico de 'fake' en % devuelve (dominante%, etiqueta, veredicto)."""
    dom = max_prob if max_prob > 50 else (100 - max_prob)
    etiqueta = "SINTÉTICO" if max_prob > 50 else "NATURAL"
    ver = "DEEPFAKE DE VOZ" if max_prob > 50 else "VOZ AUTÉNTICA"
    return dom, etiqueta, ver
