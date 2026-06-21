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
  int _tick = 0;
  CallState? _ultimoEstado;

  /// Loguea a logcat Y le manda la linea a la app (panel en pantalla).
  void _log(String msg) {
    print('[CALL-MON] $msg');
    try {
      FlutterForegroundTask.sendDataToMain('LOG:$msg');
    } catch (_) {}
  }

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
    _log('✅ onStart (starter=${starter.name}) -> servicio vivo, vigilando llamadas');
    try {
      final permMic = await _rec.hasPermission();
      _log('permiso microfono (record.hasPermission)=$permMic');
    } catch (e) {
      _log('⚠️ error consultando permiso de micro: $e');
    }
    FlutterForegroundTask.updateService(
      notificationTitle: 'Monitoreando llamadas',
      notificationText: 'Esperando una llamada para grabarla...',
    );
  }

  @override
  void onRepeatEvent(DateTime timestamp) async {
    _tick++;
    CallState estado;
    try {
      estado = await Telephony.instance.callState;
    } catch (e) {
      _log('❌ tick=$_tick ERROR leyendo callState: $e');
      return;
    }

    // Solo logueo cuando cambia el estado (para no inundar), salvo los primeros ticks.
    if (estado != _ultimoEstado || _tick <= 2) {
      _log('tick=$_tick estado=$estado grabando=$_grabando');
    }
    _ultimoEstado = estado;

    if (estado == CallState.OFFHOOK && !_grabando) {
      _log('📞 -> llamada ACTIVA detectada, iniciando grabacion...');
      await _iniciar();
    } else if (estado == CallState.IDLE && _grabando) {
      _log('🛑 -> llamada TERMINADA, deteniendo grabacion...');
      await _detener();
    }
  }

  Future<void> _iniciar() async {
    try {
      final perm = await _rec.hasPermission();
      _log('_iniciar: hasPermission=$perm');
      if (!perm) {
        _log('⚠️ sin permiso de micro -> no se puede grabar');
        return;
      }
      final dir = await _carpetaLlamadas();
      final ts = DateFormat('dd-MM-yyyy_HH-mm-ss').format(DateTime.now());
      _rutaActual = '${dir.path}/LLAMADA_$ts.wav';
      _log('_iniciar: grabando a $_rutaActual');
      await _rec.start(
        const RecordConfig(
          encoder: AudioEncoder.wav,
          sampleRate: 16000,
          numChannels: 1,
        ),
        path: _rutaActual!,
      );
      _grabando = true;
      _log('✅ grabacion INICIADA');
      FlutterForegroundTask.updateService(
        notificationTitle: 'Grabando llamada...',
        notificationText: 'Scammer esta grabando la llamada actual',
      );
    } catch (e) {
      _grabando = false;
      _log('❌ ERROR al iniciar grabacion: $e');
    }
  }

  Future<void> _detener() async {
    try {
      final ruta = await _rec.stop();
      _grabando = false;
      final destino = ruta ?? _rutaActual;
      _log('_detener: record.stop devolvio=$ruta');
      if (destino != null) {
        final f = File(destino);
        final existe = await f.exists();
        _log('_detener: archivo existe=$existe');
        if (existe) {
          final bytes = await f.length();
          final seg = ((bytes - 44) / 32000).round();
          _log('✅ GUARDADO: ${destino.split('/').last} ($bytes bytes, ~${seg}s)');
          final m = (seg ~/ 60).toString().padLeft(2, '0');
          final s = (seg % 60).toString().padLeft(2, '0');
          FlutterForegroundTask.updateService(
            notificationTitle: 'Llamada grabada ($m:$s)',
            notificationText: 'Abri Scammer para analizarla',
          );
          FlutterForegroundTask.sendDataToMain('REC:$destino');
          return;
        }
      }
      _log('⚠️ no quedo archivo de grabacion');
      FlutterForegroundTask.updateService(
        notificationTitle: 'Monitoreando llamadas',
        notificationText: 'Esperando una llamada para grabarla...',
      );
    } catch (e) {
      _grabando = false;
      _log('❌ ERROR al detener grabacion: $e');
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {
    _log('onDestroy (isTimeout=$isTimeout) grabando=$_grabando');
    if (_grabando) {
      try {
        await _rec.stop();
      } catch (e) {
        _log('error stop en destroy: $e');
      }
      _grabando = false;
    }
    try {
      await _rec.dispose();
    } catch (_) {}
  }
}
