import 'dart:io';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';

/// Graba audio por el micrófono (para analizar una llamada puesta en altavoz).
///
/// Captura en WAV 16 kHz mono: es justo lo que espera el detector local, así
/// el backend lo lee directo con soundfile (sin necesidad de PyAV) y no hay
/// que remuestrear. RECORD_AUDIO es un permiso normal (no lo bloquean los OEM).
class CallRecorderService {
  static final AudioRecorder _record = AudioRecorder();
  static String? _rutaActual;

  /// Pide (si hace falta) el permiso de micrófono.
  static Future<bool> tienePermiso() => _record.hasPermission();

  /// Arranca la grabación. Devuelve false si no hay permiso de micrófono.
  static Future<bool> iniciar() async {
    if (!await _record.hasPermission()) return false;

    final dir = await getTemporaryDirectory();
    _rutaActual = '${dir.path}/llamada_${DateTime.now().millisecondsSinceEpoch}.wav';

    await _record.start(
      const RecordConfig(
        encoder: AudioEncoder.wav,
        sampleRate: 16000,
        numChannels: 1,
      ),
      path: _rutaActual!,
    );
    return true;
  }

  static Future<bool> estaGrabando() => _record.isRecording();

  /// Detiene la grabación y devuelve el archivo WAV (o null si algo falló).
  static Future<File?> detener() async {
    final ruta = await _record.stop();
    final destino = ruta ?? _rutaActual;
    if (destino == null) return null;
    final f = File(destino);
    return await f.exists() ? f : null;
  }

  /// Cancela la grabación y descarta el archivo.
  static Future<void> cancelar() async {
    try {
      await _record.cancel();
    } catch (_) {}
  }

  static Future<void> liberar() async {
    try {
      await _record.dispose();
    } catch (_) {}
  }
}
