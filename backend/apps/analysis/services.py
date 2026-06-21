import requests
import json
import uuid
import io
import PyPDF2
import docx
import time
import os
import subprocess
import tempfile
import gc
import torch
import ssl
import shutil
from typing import Optional
from decouple import config
from datetime import datetime, timedelta
from sightengine.client import SightengineClient
from bs4 import BeautifulSoup
from PIL import Image
import torch.nn.functional as F
from transformers import pipeline, CLIPProcessor, CLIPModel
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Analisis, Bitacora, DatoEntrenamiento, Notificacion, PreferenciaNotificacion
from apps.authentication.models import Usuario, Anonimo
from apps.authentication.services import UsuarioService, AnonimoService

import mimetypes
import firebase_admin
from firebase_admin import credentials, messaging

# Inicializar Firebase Admin si existe el archivo de llave
try:
    if not firebase_admin._apps:
        creds = credentials.Certificate('firebase-key.json')
        firebase_admin.initialize_app(creds)
except Exception as e:
    print(f"[FIREBASE] Error de inicialización: {e}")

class StorageService:
    """Servicio para interactuar con Supabase Storage"""
    @staticmethod
    def subir(archivo, extension: str) -> Optional[str]:
        project_url = config('SUPABASE_URL')
        api_key = config('SUPABASE_SECRET_KEY')
        if not api_key: return None

        nombre_unico = f"{uuid.uuid4()}.{extension}"
        url = f"{project_url}/storage/v1/object/evidencias/{nombre_unico}"
        
        # Corrección de MIME Type para Video y Audio
        if extension.lower() in ['mp4', 'mov', 'avi']: mime = 'video/mp4'
        elif extension.lower() in ['mp3', 'wav', 'ogg']: mime = 'audio/mpeg'
        elif extension.lower() in ['jpg', 'jpeg', 'png', 'webp']: mime = f'image/{extension.lower()}'
        else: mime = 'application/octet-stream'

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": mime
        }
        
        try:
            archivo.seek(0)
            data = archivo.read()
            with requests.post(url, headers=headers, data=data, timeout=60) as response:
                if response.status_code == 200:
                    return f"{project_url}/storage/v1/object/public/evidencias/{nombre_unico}"
                else:
                    print(f"[STORAGE] Error {response.status_code}: {response.text}")
            return None
        except Exception as e:
            print(f"[STORAGE] Exception: {e}")
            return None

    @staticmethod
    def borrar(url_publica: str):
        if not url_publica or 'public' not in url_publica: return
        project_url = config('SUPABASE_URL')
        api_key = config('SUPABASE_SECRET_KEY')
        nombre_archivo = url_publica.split('/')[-1]
        url_delete = f"{project_url}/storage/v1/object/evidencias/{nombre_archivo}"
        headers = {"Authorization": f"Bearer {api_key}"}
        try:
            with requests.delete(url_delete, headers=headers, timeout=10):
                pass
        except: pass

class BitacoraService:
    @staticmethod
    def registrar(usuario_id: str, accion: str, modulo: Optional[str] = None, ip: Optional[str] = None, estado: str = 'EXITO', detalles: Optional[str] = None):
        try:
            hora_local = datetime.utcnow() - timedelta(hours=4)
            log = Bitacora(
                usuario_id=usuario_id,
                accion=accion,
                modulo=modulo,
                ip=ip,
                estado=estado,
                detalles=detalles,
                fecha_creacion=hora_local
            ).save()

            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        "admin_bitacora",
                        {
                            "type": "new_log",
                            "data": log.to_dict()
                        }
                    )
            except: pass

            return log
        except:
            return None

class AnalisisService:
    @staticmethod
    def _limites_plan(plan: str) -> dict:
        """Límites del plan: primero desde la config editable por el admin
        (ConfiguracionPlan en la BD), con fallback a los valores por defecto."""
        defaults = {
            'gratis': {'livianos': 10, 'pesados': 3},
            'starter': {'livianos': 50, 'pesados': 15},
            'pro': {'livianos': 999999, 'pesados': 50},
            'elite': {'livianos': 999999, 'pesados': 999999},
        }
        base = defaults.get(plan, defaults['gratis'])
        try:
            from apps.authentication.models import ConfiguracionPlan
            cfg = ConfiguracionPlan.objects(plan=plan).first()
            if cfg:
                return {'livianos': cfg.limite_livianos, 'pesados': cfg.limite_pesados}
        except Exception:
            pass
        return base

    @staticmethod
    def verificar_y_descontar_intentos(id_identificador: str, es_pesado: bool) -> tuple[bool, str]:
        usuario = Usuario.objects(id_supabase=id_identificador).first()
        if usuario:
            if usuario.bloqueado: return False, 'USUARIO_BLOQUEADO'
            plan = usuario.plan or 'gratis'
            limite_actual = AnalisisService._limites_plan(plan)
            if es_pesado:
                if usuario.intentos_pesados >= limite_actual['pesados']: return False, 'LIMITE_ALCANZADO'
                UsuarioService.incrementar_intentos_pesados(id_identificador)
            else:
                if usuario.intentos_livianos >= limite_actual['livianos']: return False, 'LIMITE_ALCANZADO'
                UsuarioService.incrementar_intentos_livianos(id_identificador)
            return True, 'OK'

        anonimo = Anonimo.objects(id_sesion=id_identificador).first()
        if anonimo:
            if es_pesado:
                if anonimo.intentos_pesados >= 3: return False, 'LIMITE_ALCANZADO'
                AnonimoService.incrementar_intentos_pesados(id_identificador)
            else:
                if anonimo.intentos_livianos >= 4: return False, 'LIMITE_ALCANZADO'
                AnonimoService.incrementar_intentos_livianos(id_identificador)
            return True, 'OK'
        return False, 'IDENTIFICADOR_INVALIDO'

    @staticmethod
    def analizar_texto(id_identificador: str, texto: str, ip: Optional[str] = None, tipo: str = 'texto', nombre_archivo: Optional[str] = None, extension: Optional[str] = None) -> Analisis:
        # Limpieza básica para evitar errores de protocolo
        texto_limpio = texto.encode('utf-8', errors='ignore').decode('utf-8').strip()
        if not texto_limpio:
            raise Exception("CONTENIDO_VACIO")

        if len(texto_limpio) > 1500:
            usuario = Usuario.objects(id_supabase=id_identificador).first()
            if not usuario or usuario.plan in ['gratis', 'starter']:
                raise Exception("LIMITE_CARACTERES_EXCEDIDO")

        permitido, error = AnalisisService.verificar_y_descontar_intentos(id_identificador, es_pesado=False)
        if not permitido: raise Exception(error)
            
        sapling_key = config('SAPLING_API_KEY')
        try:
            url = "https://api.sapling.ai/api/v1/aidetect"
            payload = {"key": sapling_key, "text": texto_limpio}
            headers = {"Content-Type": "application/json"}
            
            with requests.post(url, json=payload, headers=headers, timeout=20) as response:
                if response.status_code != 200:
                    print(f"[SAPLING ERROR] {response.status_code}: {response.text}")
                    raise Exception("ERROR_MOTOR_TEXTO")
                prob = response.json().get('score', 0) * 100
            
            DatoEntrenamiento(contenido=texto_limpio, etiqueta=1 if prob > 50 else 0, confianza_original=prob).save()
            analisis = Analisis(
                id_supabase=id_identificador,
                tipo=tipo,
                contenido=texto[:2000],
                probabilidad_ia=round(prob, 2),
                veredicto="SÍNTESIS DETECTADA" if prob > 50 else "ORIGEN NATURAL",
                detalles=f"Confianza IA: {prob:.2f}% (Sapling Engine)",
                nombre_archivo=nombre_archivo,
                extension=extension,
                puntos_criticos=[{"titulo": "Score Neuronal", "descripcion": f"{prob:.2f}%"}]
            ).save()
            BitacoraService.registrar(id_identificador, f'Análisis {tipo.upper()}', 'Texto', ip)

            # NOTIFICAR ADMINS (Análisis Liviano)
            AnalisisService._notificar_admins(
                titulo=f"Nuevo Análisis: {tipo.upper()}",
                mensaje=f"Rastro detectado: {prob:.1f}% IA.",
                tipo="analisis_liviano",
                analisis_id=str(analisis.id)
            )

            return analisis
        except Exception as e:
            BitacoraService.registrar(id_identificador, f'Error API {tipo}', 'Texto', ip, 'ERROR', str(e))
            raise e

    @staticmethod
    def analizar_imagen(id_identificador: str, archivo, ip: Optional[str] = None) -> Analisis:
        permitido, error = AnalisisService.verificar_y_descontar_intentos(id_identificador, es_pesado=True)
        if not permitido: raise Exception(error)
            
        ext = archivo.name.split('.')[-1] if '.' in archivo.name else 'jpg'
        url_archivo = StorageService.subir(archivo, ext)
        if not url_archivo: raise Exception("Error al subir archivo.")
        
        api_user = config('SIGHTENGINE_API_USER')
        api_secret = config('SIGHTENGINE_API_SECRET')
        
        usuario = Usuario.objects(id_supabase=id_identificador).first()
        plan = usuario.plan if usuario else 'gratis'

        try:
            params = { 'models': 'genai', 'api_user': api_user, 'api_secret': api_secret, 'url': url_archivo }
            with requests.get('https://api.sightengine.com/1.0/check.json', params=params, timeout=30) as r:
                output = r.json()
            
            if output['status'] == 'success':
                prob = output['type']['ai_generated'] * 100
                top_gen = "Desconocido"
                for gen, score in output.get('generators', {}).items():
                    if score > 0.5: top_gen = gen.replace('_', ' ').title()
                
                analisis = Analisis(
                    id_supabase=id_identificador,
                    tipo='imagen',
                    contenido=url_archivo,
                    probabilidad_ia=round(prob, 2),
                    veredicto=f"IA: {top_gen}" if prob > 50 else "CAPTURA REAL",
                    detalles=f"Detección Sightengine ({top_gen}).",
                    nombre_archivo=archivo.name,
                    extension=ext,
                    puntos_criticos=[{"titulo": "Análisis GenAI", "descripcion": f"{prob:.2f}% Probabilidad"}]
                ).save()

                # NOTIFICAR ADMINS
                AnalisisService._notificar_admins(
                    titulo="Alerta: Escaneo Visual",
                    mensaje=f"Imagen procesada ({top_gen}). Prob: {prob:.1f}%.",
                    tipo="analisis_pesado",
                    analisis_id=str(analisis.id)
                )

                # Lógica de Retención de Imágenes por Plan
                # Solo PRO (Nivel 2) y ELITE (Nivel Max) mantienen la imagen física
                if plan == 'gratis':
                    StorageService.borrar(url_archivo)
                    analisis.contenido = "[ELIMINADO POR PROTOCOLO FREE]"
                elif plan == 'starter':
                    # Starter no guarda imágenes, solo texto/docs < 2MB
                    StorageService.borrar(url_archivo)
                    analisis.contenido = "[ELIMINADO POR PROTOCOLO STARTER]"
                elif plan == 'pro':
                    # PRO guarda imágenes (asumimos control de peso o persistencia)
                    pass 
                
                analisis.save()

                BitacoraService.registrar(id_identificador, f'Análisis Imagen ({top_gen})', 'Multimedia', ip)
                return analisis
            else: 
                raise Exception(output.get('error', {}).get('message', 'Error API Vision'))
        except Exception as e:
            BitacoraService.registrar(id_identificador, 'Error Imagen', 'Multimedia', ip, 'ERROR', str(e))
            if plan not in ['pro', 'elite']: StorageService.borrar(url_archivo)
            raise e

    @staticmethod
    def extraer_frames_unicos(archivo_video, max_frames=30, threshold=30.0) -> list:
        import cv2
        import numpy as np
        archivo_video.seek(0)
        
        temp_path = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_video:
                temp_video.write(archivo_video.read())
                temp_path = temp_video.name
                
            cap = cv2.VideoCapture(temp_path)
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_skip = max(int(fps), 1) 
            
            count = 0
            saved_count = 0
            last_saved_gray = None
            frames_extraidos = []
            
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret: break
                if count % frame_skip == 0:
                    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                    small_gray = cv2.resize(gray, (64, 64))
                    
                    if last_saved_gray is None:
                        guardar = True
                    else:
                        err = np.sum((last_saved_gray.astype("float") - small_gray.astype("float")) ** 2) / (64*64)
                        guardar = err > threshold
                            
                    if guardar:
                        ret_img, buffer = cv2.imencode('.jpg', frame)
                        if ret_img:
                            frames_extraidos.append(buffer.tobytes())
                            last_saved_gray = small_gray
                            saved_count += 1
                            
                count += 1
                if saved_count >= max_frames: break
                
            cap.release()
            return frames_extraidos
        finally:
            if temp_path and os.path.exists(temp_path):
                try: os.remove(temp_path)
                except: pass

    @staticmethod
    def analizar_video(id_identificador: str, archivo, ip: Optional[str] = None) -> Analisis:
        import threading
        if archivo.name.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            return AnalisisService.analizar_imagen(id_identificador, archivo, ip)

        permitido, error = AnalisisService.verificar_y_descontar_intentos(id_identificador, es_pesado=True)
        if not permitido: raise Exception(error)
        
        archivo.seek(0)
        archivo_bytes = archivo.read()
        archivo_name = archivo.name
        ext = archivo_name.split('.')[-1] if '.' in archivo_name else 'mp4'

        analisis_pendiente = Analisis(
            id_supabase=id_identificador, tipo='video', 
            contenido="[SUBIENDO...]", probabilidad_ia=0, veredicto="PROCESANDO...",
            detalles="Video recibido. Se está procesando en segundo plano.",
            puntos_criticos=[{"titulo": "Estado", "descripcion": "Subiendo y Analizando..."}]
        ).save()

        threading.Thread(target=AnalisisService._ejecutar_analisis_video_async, 
                         args=(id_identificador, analisis_pendiente.id, archivo_bytes, archivo_name, ext, ip)).start()
        
        BitacoraService.registrar(id_identificador, 'Video: Análisis Iniciado (BG)', 'Multimedia', ip)
        return analisis_pendiente

    @staticmethod
    def query_hf_api(model_id: str, data: bytes) -> list:
        """Helper para consultar la Inference API de Hugging Face"""
        api_token = config('HF_API_TOKEN', default='')
        api_url = f"https://api-inference.huggingface.co/models/{model_id}"
        headers = {"Authorization": f"Bearer {api_token}"}
        
        try:
            # Reintentar hasta 3 veces si el modelo se está cargando
            for _ in range(3):
                response = requests.post(api_url, headers=headers, data=data, timeout=30)
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 503: # Modelo cargándose
                    time.sleep(5)
                    continue
                else:
                    print(f"[HF-API] Error {response.status_code}: {response.text}")
                    break
        except Exception as e:
            print(f"[HF-API] Exception: {e}")
        return []

    @staticmethod
    def _ejecutar_analisis_video_async(u_id, analisis_id, archivo_bytes, nombre, extension, ip):
        import numpy as np, subprocess, tempfile, os, gc, torch, ssl
        from PIL import Image

        temp_v_path = None
        temp_raw_audio = None
        url_v = None

        try:
            analisis = Analisis.objects(id=analisis_id).first()
            if not analisis: return

            archivo_mock = io.BytesIO(archivo_bytes)
            archivo_mock.name = nombre
            url_v = StorageService.subir(archivo_mock, extension)
            if url_v:
                analisis.contenido = url_v
                analisis.save()

            ssl._create_default_https_context = ssl._create_unverified_context
            audio_ai_prob, video_ai_prob = 0, 0
            usuario = Usuario.objects(id_supabase=u_id).first()
            plan = usuario.plan if usuario else 'gratis'
            
            # --- AUDIO ---
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_v:
                temp_v.write(archivo_bytes)
                temp_v_path = temp_v.name
            temp_raw_audio = temp_v_path + ".mp3"
            
            try:
                subprocess.run(['ffmpeg', '-i', temp_v_path, '-vn', '-ar', '16000', '-ac', '1', '-b:a', '128k', temp_raw_audio, '-y'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
                import librosa
                audio_data, sr = librosa.load(temp_raw_audio, sr=16000)
                
                m_3s = 3 * sr
                scores_a = []
                num_segs_total = int(np.ceil(len(audio_data) / m_3s))
                num_segs = min(num_segs_total, 10) 
                
                for i in range(num_segs):
                    seg = audio_data[i*m_3s : (i+1)*m_3s]
                    if len(seg) < (sr * 0.5): continue
                    
                    # Buffer para enviar a la API
                    buffer_audio = io.BytesIO()
                    import soundfile as sf
                    sf.write(buffer_audio, seg, sr, format='WAV')
                    audio_bytes_seg = buffer_audio.getvalue()

                    res1 = AnalisisService.query_hf_api("MelodyMachine/Deepfake-audio-detection-V2", audio_bytes_seg)
                    pr1 = next((r['score'] for r in res1 if isinstance(r, dict) and r.get('label', '').lower() in ['fake', 'aivoice', 'spoof', 'label_1']), 0)
                    
                    res2 = AnalisisService.query_hf_api("garystafford/wav2vec2-deepfake-voice-detector", audio_bytes_seg)
                    pr2 = next((r['score'] for r in res2 if isinstance(r, dict) and r.get('label', '').lower() in ['fake', 'label_1', 'synthetic']), 0)
                    
                    scores_a.append((pr1 + pr2) / 2)
                
                if scores_a: audio_ai_prob = (sum(scores_a) / len(scores_a)) * 100
                gc.collect()
            except Exception as e: print(f"[BG] Error Audio: {e}")

            # --- VISUAL ---
            archivo_io = io.BytesIO(archivo_bytes)
            archivo_io.name = nombre
            f_c1 = AnalisisService.extraer_frames_unicos(archivo_io, max_frames=5, threshold=30.0) 
            
            video_scores = []
            for fb in f_c1:
                res_v = AnalisisService.query_hf_api("prithivMLmods/Deep-Fake-Detector-Model", fb)
                prob_v = next((r['score'] for r in res_v if isinstance(r, dict) and r.get('label', '').lower() in ['fake', 'deepfake']), 0)
                video_scores.append(prob_v)
            
            if video_scores: video_ai_prob = (sum(video_scores) / len(video_scores)) * 100

            # SIGHTENGINE
            api_user = config('SIGHTENGINE_API_USER')
            api_secret = config('SIGHTENGINE_API_SECRET')
            scores_se = []
            for fb in f_c1:
                r = requests.post('https://api.sightengine.com/1.0/check.json', files={'media': fb}, data={'models': 'genai', 'api_user': api_user, 'api_secret': api_secret}, timeout=20)
                if r.status_code == 200:
                    p = r.json().get('type', {}).get('ai_generated', 0) * 100
                    scores_se.append(p)
                    if p > 70: break
            
            if scores_se:
                video_ai_prob = max(video_ai_prob, max(scores_se))

            # --- RESULTADO ---
            audio_dom = audio_ai_prob if audio_ai_prob > 50 else (100 - audio_ai_prob)
            audio_lab = "SINTÉTICO" if audio_ai_prob > 50 else "NATURAL"
            video_dom = video_ai_prob if video_ai_prob > 50 else (100 - video_ai_prob)
            video_lab = "SINTÉTICO" if video_ai_prob > 50 else "NATURAL"
            
            if audio_ai_prob > 50 and video_ai_prob > 50: ver = "DEEPFAKE MULTIMODAL COMPLETO"
            elif audio_ai_prob > 50: ver = "AUDIO SINTÉTICO (VIDEO ORIGINAL)"
            elif video_ai_prob > 50: ver = "MANIPULACIÓN VISUAL (AUDIO ORIGINAL)"
            else: ver = "CONTENIDO AUTÉNTICO"
            
            analisis.probabilidad_ia = round(max(audio_ai_prob, video_ai_prob), 2)
            analisis.veredicto = ver
            analisis.detalles = f"Audio: {audio_dom:.1f}% {audio_lab} | Video: {video_dom:.1f}% {video_lab}"
            analisis.puntos_criticos = [
                {"titulo": "Forense de Audio", "score": round(audio_dom, 2), "label": audio_lab, "descripcion": f"Consenso: {audio_dom:.1f}% {audio_lab}"},
                {"titulo": "Forense Visual", "score": round(video_dom, 2), "label": video_lab, "descripcion": f"Filtrado IA: {video_dom:.1f}% {video_lab}"}
            ]
            analisis.save()
            
            # NOTIFICAR
            NotificacionService.crear(u_id=u_id, t="Análisis Finalizado", m=f"Video completado: {ver}.", tp="analisis_pesado", analisis_id=str(analisis.id))

            # NOTIFICAR ADMINS
            AnalisisService._notificar_admins(
                titulo="Alerta: Escaneo de Video",
                mensaje=f"Video procesado para usuario {u_id[:8]}. Veredicto: {ver}.",
                tipo="analisis_pesado",
                analisis_id=str(analisis.id)
            )

            # Lógica de Retención de Video por Plan
            if plan == 'elite':
                pass
            elif plan == 'pro':
                if len(archivo_bytes) > 4 * 1024 * 1024:
                    StorageService.borrar(url_v)
                    analisis.contenido = "[ELIMINADO: EXCESO DE PESO]"
            else:
                StorageService.borrar(url_v)
                analisis.contenido = "[ELIMINADO POR PROTOCOLO]"
            
            analisis.save()
        except Exception as e:
            BitacoraService.registrar(u_id, 'Error BG Video', 'Multimedia', ip, 'ERROR', str(e))
        finally:
            if temp_v_path and os.path.exists(temp_v_path):
                try: os.remove(temp_v_path)
                except: pass
            if temp_raw_audio and os.path.exists(temp_raw_audio):
                try: os.remove(temp_raw_audio)
                except: pass

    @staticmethod
    def analizar_audio(id_identificador: str, archivo, ip: Optional[str] = None) -> Analisis:
        permitido, error = AnalisisService.verificar_y_descontar_intentos(id_identificador, es_pesado=True)
        if not permitido: raise Exception(error)
        ext = archivo.name.split('.')[-1].lower() if '.' in archivo.name else 'mp3'
        url_audio = StorageService.subir(archivo, ext)
        usuario = Usuario.objects(id_supabase=id_identificador).first()
        plan = usuario.plan if usuario else 'gratis'
        
        # Validar peso para plan PRO
        peso_archivo_mb = archivo.size / (1024 * 1024)
        
        try:
            import gc, torch, librosa, numpy as np, subprocess, tempfile
            archivo.seek(0)
            audio_data, sr = librosa.load(io.BytesIO(archivo.read()), sr=16000)
            muestras_3s = 3 * sr
            num_segs = int(np.ceil(len(audio_data) / muestras_3s))
            num_segs = min(num_segs, 10)
            max_prob_total = 0
            
            for i in range(num_segs):
                seg = audio_data[i*muestras_3s:(i+1)*muestras_3s]
                if len(seg) < (sr * 0.5): continue
                
                buffer_audio = io.BytesIO()
                import soundfile as sf
                sf.write(buffer_audio, seg, sr, format='WAV')
                audio_bytes_seg = buffer_audio.getvalue()

                res1 = AnalisisService.query_hf_api("MelodyMachine/Deepfake-audio-detection-V2", audio_bytes_seg)
                pr1 = next((r['score'] for r in res1 if isinstance(r, dict) and r.get('label', '').lower() in ['fake', 'aivoice', 'spoof', 'label_1']), 0)
                
                res2 = AnalisisService.query_hf_api("garystafford/wav2vec2-deepfake-voice-detector", audio_bytes_seg)
                pr2 = next((r['score'] for r in res2 if isinstance(r, dict) and r.get('label', '').lower() in ['fake', 'label_1', 'synthetic']), 0)
                
                pico = max(pr1, pr2) * 100
                if pico > max_prob_total: max_prob_total = pico
                if max_prob_total > 90: break
            
            gc.collect()
            dom_p = max_prob_total if max_prob_total > 50 else (100 - max_prob_total)
            lab = "SINTÉTICO" if max_prob_total > 50 else "NATURAL"
            analisis = Analisis(id_supabase=id_identificador, tipo='audio', contenido=url_audio, probabilidad_ia=round(max_prob_total, 2), veredicto="DEEPFAKE DE VOZ" if max_prob_total > 50 else "VOZ AUTÉNTICA", detalles=f"Análisis Dominante: {dom_p:.1f}% {lab}", puntos_criticos=[{"titulo": "Firma Neuronal", "score": round(dom_p, 2), "label": lab, "descripcion": f"Confianza: {dom_p:.1f}% {lab}"}]).save()
            
            # NOTIFICAR ADMINS
            AnalisisService._notificar_admins(
                titulo="Alerta: Escaneo de Audio",
                mensaje=f"Rastro: {max_prob_total:.1f}% IA detectado.",
                tipo="analisis_pesado",
                analisis_id=str(analisis.id)
            )

            # Lógica de Retención Audio
            if plan == 'elite':
                pass
            elif plan == 'pro' and peso_archivo_mb <= 4:
                pass
            else:
                StorageService.borrar(url_audio)
                analisis.contenido = "[ELIMINADO POR PROTOCOLO DE NIVEL]"
                analisis.save()

            return analisis
        except Exception as e:
            if plan != 'elite': StorageService.borrar(url_audio)
            raise e

    @staticmethod
    def analizar_llamada(id_identificador: str, archivo, ip: Optional[str] = None) -> Analisis:
        """Detección de voz IA en una grabación de LLAMADA usando el modelo LOCAL
        (apps.analysis.audio_detector). NO usa la Inference API de HF. Flujo separado
        del análisis de audio normal, que queda intacto."""
        permitido, error = AnalisisService.verificar_y_descontar_intentos(id_identificador, es_pesado=True)
        if not permitido: raise Exception(error)
        ext = archivo.name.split('.')[-1].lower() if '.' in archivo.name else 'mp3'
        url_audio = StorageService.subir(archivo, ext)
        usuario = Usuario.objects(id_supabase=id_identificador).first()
        plan = usuario.plan if usuario else 'gratis'

        # Validar peso para plan PRO
        peso_archivo_mb = archivo.size / (1024 * 1024)

        try:
            import gc
            from . import audio_detector
            archivo.seek(0)
            # Loader robusto: soundfile (WAV/MP3) con fallback PyAV (AAC/M4A del grabador)
            audio_data, sr = audio_detector.cargar_audio(archivo.read(), sr=16000)

            # Inferencia LOCAL (modelo en caché; sin API ni HF_API_TOKEN)
            max_prob_total = audio_detector.analizar_segmentos(audio_data, sr)
            gc.collect()
            dom_p, lab, ver = audio_detector.veredicto(max_prob_total)
            analisis = Analisis(id_supabase=id_identificador, tipo='llamada', contenido=(url_audio or "[SIN ALMACENAMIENTO]"), probabilidad_ia=round(max_prob_total, 2), veredicto=ver, detalles=f"Análisis Dominante: {dom_p:.1f}% {lab}", puntos_criticos=[{"titulo": "Firma Neuronal (Local)", "score": round(dom_p, 2), "label": lab, "descripcion": f"Confianza: {dom_p:.1f}% {lab}"}]).save()

            # NOTIFICAR ADMINS
            AnalisisService._notificar_admins(
                titulo="Alerta: Escaneo de Llamada",
                mensaje=f"Rastro: {max_prob_total:.1f}% IA detectado.",
                tipo="analisis_pesado",
                analisis_id=str(analisis.id)
            )

            # Lógica de Retención (igual que audio)
            if plan == 'elite':
                pass
            elif plan == 'pro' and peso_archivo_mb <= 4:
                pass
            else:
                StorageService.borrar(url_audio)
                analisis.contenido = "[ELIMINADO POR PROTOCOLO DE NIVEL]"
                analisis.save()

            return analisis
        except Exception as e:
            if plan != 'elite': StorageService.borrar(url_audio)
            raise e

    @staticmethod
    def _notificar_admins(titulo: str, mensaje: str, tipo: str, analisis_id: Optional[str] = None):
        """Helper para enviar notificaciones a todos los administradores"""
        admins = Usuario.objects(rol='administrador')
        for admin in admins:
            NotificacionService.crear(
                u_id=admin.id_supabase,
                t=titulo,
                m=mensaje,
                tp=tipo,
                analisis_id=analisis_id
            )

    @staticmethod
    def analizar_url(id_identificador: str, url: str, ip: Optional[str] = None) -> Analisis:
        try:
            with requests.get(url, timeout=10, headers={'User-Agent': 'Scammer-Forensics/1.0'}) as response:
                soup = BeautifulSoup(response.text, 'html.parser')
                for s in soup(["script", "style"]): s.decompose()
                text = " ".join(soup.stripped_strings)[:5000]
                return AnalisisService.analizar_texto(id_identificador, text, ip, tipo='url')
        except Exception as e:
            BitacoraService.registrar(id_identificador, 'Error URL', 'Sitios Web', ip, 'ERROR', str(e))
            raise e

    @staticmethod
    def analizar_archivo(id_identificador: str, archivo, ip: Optional[str] = None) -> Analisis:
        nombre = archivo.name.lower()
        texto_extraido = ""
        usuario = Usuario.objects(id_supabase=id_identificador).first()
        plan = usuario.plan if usuario else 'gratis'
        
        # Validar peso del archivo según plan
        peso_archivo_mb = archivo.size / (1024 * 1024)
        
        try:
            if nombre.endswith('.pdf'):
                pdf_reader = PyPDF2.PdfReader(io.BytesIO(archivo.read()))
                for page in pdf_reader.pages: texto_extraido += page.extract_text()
            elif nombre.endswith('.docx'):
                doc = docx.Document(io.BytesIO(archivo.read())); texto_extraido = "\n".join([para.text for para in doc.paragraphs])
            else: texto_extraido = archivo.read().decode('utf-8', errors='ignore')
            
            analisis = AnalisisService.analizar_texto(id_identificador, texto_extraido, ip, tipo='documento' if nombre.endswith(('.pdf', '.docx', '.doc', '.txt')) else 'codigo')
            
            # Lógica de persistencia de contenido extraído en MongoDB
            if plan == 'gratis':
                analisis.contenido = "[ELIMINADO POR PROTOCOLO FREE]"
            elif plan == 'starter' and peso_archivo_mb > 2:
                analisis.contenido = f"[ELIMINADO: EXCESO DE PESO {peso_archivo_mb:.1f}MB > 2MB]"
            elif plan == 'pro' and peso_archivo_mb > 4:
                analisis.contenido = f"[ELIMINADO: EXCESO DE PESO {peso_archivo_mb:.1f}MB > 4MB]"
            
            analisis.save()
            return analisis
        except Exception as e:
            BitacoraService.registrar(id_identificador, 'Error Archivo', 'Archivos', ip, 'ERROR', str(e))
            raise e

    @staticmethod
    def obtener_historial(id_supabase: str):
        usuario = Usuario.objects(id_supabase=id_supabase).first(); plan = usuario.plan if usuario else 'gratis'
        q = Analisis.objects(id_supabase=id_supabase)
        
        # Purga visual de historial (aunque el worker borra el archivo físico, aquí filtramos la vista)
        retencion_dias = 3
        if plan == 'starter': retencion_dias = 15
        elif plan == 'pro': retencion_dias = 30
        elif plan == 'elite': retencion_dias = 9999
        
        # Si ELITE expiró, tiene 14 días extra (2 semanas)
        # Esto lo manejaríamos verificando la fecha_expiracion del usuario si existiera
        
        fecha_corte = datetime.utcnow() - timedelta(days=retencion_dias)
        q = q.filter(fecha_creacion__gte=fecha_corte)
        
        return q.order_by('-fecha_creacion').limit(50)

    @staticmethod
    def obtener_bitacora():
        logs = Bitacora.objects().order_by('-fecha_creacion').limit(50); res = []
        for l in logs:
            d = l.to_dict()
            if l.usuario_id != 'ANONIMO':
                u = Usuario.objects(id_supabase=l.usuario_id).first()
                if u: d['usuario_nombre'], d['usuario_email'] = u.nombre_usuario, u.correo
            res.append(d)
        return res

class PushNotificationService:
    @staticmethod
    def enviar(u_id: str, titulo: str, mensaje: str, data: Optional[dict] = None, tipo: str = 'sistema', sonar: bool = True):
        try:
            usuario = Usuario.objects(id_supabase=u_id).first()
            if not usuario or not usuario.fcm_token: return
            
            # Lógica semántica de colores y recursos
            if tipo == 'registro':
                color_hex = '#10b981' # Emerald/Success
                sound_name = 'sniff'
                img_url = 'https://img.icons8.com/color/96/user-male-circle--v1.png'
            elif tipo == 'pago':
                color_hex = '#10b981'
                sound_name = 'cash'
                img_url = 'https://img.icons8.com/color/96/flash-on.png'
            elif tipo == 'analisis_liviano':
                color_hex = '#f43f5e' # Rose/Alert
                sound_name = 'tune'
                img_url = 'https://img.icons8.com/color/96/document.png'
            elif tipo == 'analisis_pesado':
                color_hex = '#f43f5e'
                sound_name = 'tune'
                img_url = 'https://img.icons8.com/color/96/video.png'
            elif tipo == 'seguridad':
                color_hex = '#f43f5e'
                sound_name = 'tune'
                img_url = 'https://img.icons8.com/color/96/error--v1.png'
            else:
                color_hex = '#ff0055'
                sound_name = 'tune'
                img_url = 'https://img.icons8.com/color/96/bell.png'

            # Configuración de Sonido Condicional
            sound_value = sound_name if sonar else None
            # Canal táctico dinámico para forzar el sonido específico (Firebase requiere canales distintos por sonido en Android 8+)
            canal_id = f'scammer_alerts_{sound_name}'

            # Construir mensaje para Firebase con Sonido Condicional, Prioridad Alta y Color/Imagen
            message = messaging.Message(
                notification=messaging.Notification(
                    title=titulo,
                    body=mensaje,
                    image=img_url
                ),
                data=data or {},
                token=usuario.fcm_token,
                android=messaging.AndroidConfig(
                    priority='high',
                    notification=messaging.AndroidNotification(
                        sound=sound_value,
                        channel_id=canal_id, 
                        icon='ic_stat_scammer',
                        color=color_hex
                    ),
                ),
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(sound=f"{sound_value}.wav") if sound_value else messaging.Aps(),
                    ),
                ),
            )
            
            # Enviar rastro push
            response = messaging.send(message)
            print(f'[PUSH] Éxito al enviar a {usuario.correo}: {response}')
        except Exception as e:
            print(f'[PUSH] Error al enviar: {e}')

class NotificacionService:
    @staticmethod
    def crear(u_id: str, t: str, m: str, tp: str = 'sistema', analisis_id: Optional[str] = None):
        try: 
            n = Notificacion(usuario_id=u_id, titulo=t, mensaje=m, tipo=tp, analisis_id=analisis_id).save()
            
            pref = NotificacionService.obtener_preferencias(u_id)
            
            # 1. Lógica PUSH (Firebase)
            if pref.global_push:
                canal_config = pref.canales.get(tp, pref.canales.get('sistema', {}))
                if canal_config.get('notificar', False):
                    sonar = canal_config.get('sonar', False)
                    PushNotificationService.enviar(u_id, t, m, {"analisis_id": analisis_id or ""}, tp, sonar)

            # 2. Lógica TIEMPO REAL (WebSockets)
            if not pref.global_push: return n
            canal_config = pref.canales.get(tp, pref.canales.get('sistema', {}))
            if not canal_config.get('mostrar', True): return n
            try:
                channel_layer = get_channel_layer()
                if channel_layer:
                    data_envio = n.to_dict()
                    data_envio['_pref'] = {'notificar': canal_config.get('notificar', False), 'sonar': canal_config.get('sonar', False)}
                    async_to_sync(channel_layer.group_send)(f"user_{u_id}", {"type": "send_notification", "data": data_envio})
            except: pass
            return n
        except: return None
    @staticmethod
    def listar(u_id: str, solo_u: bool = False):
        q = Notificacion.objects(usuario_id=u_id)
        if solo_u: q = q.filter(leido=False)
        return q.order_by('-fecha_creacion').limit(20)
    @staticmethod
    def marcar_como_leida(id: str): return Notificacion.objects(id=id).update_one(set__leido=True)
    @staticmethod
    def marcar_todas_leidas(u_id: str): return Notificacion.objects(usuario_id=u_id, leido=False).update(set__leido=True)
    @staticmethod
    def obtener_preferencias(u_id: str):
        p = PreferenciaNotificacion.objects(usuario_id=u_id).first()
        return p if p else PreferenciaNotificacion(usuario_id=u_id).save()
    @staticmethod
    def guardar_preferencias(u_id: str, d: dict):
        p = NotificacionService.obtener_preferencias(u_id)
        if 'global_push' in d: p.global_push = d['global_push']
        if 'canales' in d: p.canales = d['canales']
        return p.save()
