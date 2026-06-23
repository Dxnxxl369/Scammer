import 'dart:io';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:intl/intl.dart';

/// Graba audio por el micrófono (para analizar una llamada puesta en altavoz) y
/// guarda las grabaciones en una carpeta propia de la app, con nombre de
/// fecha-hora, así no hay que buscarlas en el teléfono.
///
/// Captura en WAV 16 kHz mono: es justo lo que espera el detector local, así
/// el backend lo lee directo con soundfile (sin necesidad de PyAV) y no hay
/// que remuestrear. RECORD_AUDIO es un permiso normal (no lo bloquean los OEM).
class CallRecorderService {
  static final AudioRecorder _record = AudioRecorder();
  static String? _rutaActual;

  /// Carpeta propia de la app donde quedan TODAS nuestras grabaciones de llamada.
  static Future<Directory> carpetaLlamadas() async {
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory('${base.path}/llamadas');
    if (!await dir.exists()) await dir.create(recursive: true);
    return dir;
  }

  /// Pide (si hace falta) el permiso de micrófono.
  static Future<bool> tienePermiso() => _record.hasPermission();

  /// Arranca la grabación. Devuelve false si no hay permiso de micrófono.
  static Future<bool> iniciar() async {
    if (!await _record.hasPermission()) return false;

    final dir = await carpetaLlamadas();
    final fecha = DateFormat('dd-MM-yyyy_HH-mm-ss').format(DateTime.now());
    _rutaActual = '${dir.path}/LLAMADA_$fecha.m4a';

    for (final src in const [
      AndroidAudioSource.voiceRecognition,
      AndroidAudioSource.voiceCommunication,
      AndroidAudioSource.camcorder,
      AndroidAudioSource.mic,
    ]) {
      try {
        await _record.start(
          RecordConfig(
            encoder: AudioEncoder.aacLc,
            bitRate: 64000,
            sampleRate: 44100,
            numChannels: 1,
            androidConfig: AndroidRecordConfig(
              audioSource: src,
            ),
          ),
          path: _rutaActual!,
        );
        return true;
      } catch (_) {
        // probar la siguiente fuente
      }
    }
    return false;
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

  /// Devuelve TODAS las grabaciones locales ordenadas de más reciente a más antigua.
  static Future<List<File>> todasLasLocales() async {
    final dir = await carpetaLlamadas();
    final files = dir
        .listSync()
        .whereType<File>()
        .where((f) => f.path.toLowerCase().endsWith('.wav') || f.path.toLowerCase().endsWith('.m4a') || f.path.toLowerCase().endsWith('.mp3'))
        .toList();
    files.sort((a, b) => b.statSync().modified.compareTo(a.statSync().modified));
    return files;
  }

  /// La última grabación que hizo la app (la más reciente de nuestra carpeta).
  static Future<File?> ultimaLocal() async {
    final files = await todasLasLocales();
    return files.isNotEmpty ? files.first : null;
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
