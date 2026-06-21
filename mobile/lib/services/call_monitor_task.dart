import 'dart:io';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:another_telephony/telephony.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:intl/intl.dart';

/// Punto de entrada del isolate del servicio en primer plano.
/// DEBE ser una funcion top-level con @pragma('vm:entry-point').
@pragma('vm:entry-point')
void startCallMonitor() {
  FlutterForegroundTask.setTaskHandler(CallMonitorHandler());
}

/// Corre dentro del servicio en primer plano (tipo microfono).
/// Consulta el estado de la llamada en bucle (another_telephony no tiene evento)
/// y graba automaticamente mientras la llamada esta activa.
class CallMonitorHandler extends TaskHandler {
  final AudioRecorder _rec = AudioRecorder();
  bool _grabando = false;
  String? _rutaActual;

  Future<Directory> _carpetaLlamadas() async {
    final base = await getApplicationDocumentsDirectory();
    final dir = Directory('${base.path}/llamadas');
    if (!await dir.exists()) {
      await dir.create(recursive: true);
    }
    return dir;
  }

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    _grabando = false;
    FlutterForegroundTask.updateService(
      notificationTitle: 'Monitoreando llamadas',
      notificationText: 'Esperando una llamada para grabarla...',
    );
  }

  @override
  void onRepeatEvent(DateTime timestamp) async {
    CallState estado;
    try {
      estado = await Telephony.instance.callState;
    } catch (_) {
      return;
    }

    // Llamada activa y todavia no estamos grabando -> arrancar.
    if (estado == CallState.OFFHOOK && !_grabando) {
      await _iniciar();
    }
    // Llamada terminada y estabamos grabando -> detener y guardar.
    else if (estado == CallState.IDLE && _grabando) {
      await _detener();
    }
  }

  Future<void> _iniciar() async {
    try {
      if (!await _rec.hasPermission()) return;
      final dir = await _carpetaLlamadas();
      final ts = DateFormat('dd-MM-yyyy_HH-mm-ss').format(DateTime.now());
      _rutaActual = '${dir.path}/LLAMADA_$ts.wav';
      await _rec.start(
        const RecordConfig(
          encoder: AudioEncoder.wav,
          sampleRate: 16000,
          numChannels: 1,
        ),
        path: _rutaActual!,
      );
      _grabando = true;
      FlutterForegroundTask.updateService(
        notificationTitle: 'Grabando llamada...',
        notificationText: 'Scammer esta grabando la llamada actual',
      );
    } catch (_) {
      _grabando = false;
    }
  }

  Future<void> _detener() async {
    try {
      final ruta = await _rec.stop();
      _grabando = false;
      final destino = ruta ?? _rutaActual;
      if (destino != null) {
        final f = File(destino);
        if (await f.exists()) {
          // Duracion estimada desde el tamano (WAV PCM 16kHz mono 16-bit = 32000 B/s)
          final bytes = await f.length();
          final seg = ((bytes - 44) / 32000).round();
          final m = (seg ~/ 60).toString().padLeft(2, '0');
          final s = (seg % 60).toString().padLeft(2, '0');
          FlutterForegroundTask.updateService(
            notificationTitle: 'Llamada grabada ($m:$s)',
            notificationText: 'Abri Scammer para analizarla',
          );
          // Avisar a la app (si esta abierta) para refrescar la ultima grabacion.
          FlutterForegroundTask.sendDataToMain(destino);
          return;
        }
      }
      FlutterForegroundTask.updateService(
        notificationTitle: 'Monitoreando llamadas',
        notificationText: 'Esperando una llamada para grabarla...',
      );
    } catch (_) {
      _grabando = false;
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {
    if (_grabando) {
      try {
        await _rec.stop();
      } catch (_) {}
      _grabando = false;
    }
    try {
      await _rec.dispose();
    } catch (_) {}
  }
}
