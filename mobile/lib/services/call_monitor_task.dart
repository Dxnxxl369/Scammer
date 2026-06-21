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
  print('[CALL-MON] startCallMonitor() -> setTaskHandler');
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
    print('[CALL-MON] ✅ onStart (starter=${starter.name}) -> servicio vivo, empezando a vigilar llamadas');
    // Probar permiso de micro de entrada para dejarlo logueado.
    try {
      final permMic = await _rec.hasPermission();
      print('[CALL-MON]    permiso microfono (record.hasPermission)=$permMic');
    } catch (e) {
      print('[CALL-MON]    ⚠️ error consultando permiso de micro: $e');
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
    } catch (e, st) {
      print('[CALL-MON] ❌ tick=$_tick ERROR leyendo callState: $e');
      print('[CALL-MON]    $st');
      return;
    }

    // Log cada poll para ver si callState cambia cuando entra la llamada.
    final cambio = estado != _ultimoEstado ? '  <<< CAMBIO' : '';
    print('[CALL-MON] tick=$_tick estado=$estado grabando=$_grabando$cambio');
    _ultimoEstado = estado;

    // Llamada activa y todavia no estamos grabando -> arrancar.
    if (estado == CallState.OFFHOOK && !_grabando) {
      print('[CALL-MON] 📞 -> llamada ACTIVA detectada, iniciando grabacion...');
      await _iniciar();
    }
    // Llamada terminada y estabamos grabando -> detener y guardar.
    else if (estado == CallState.IDLE && _grabando) {
      print('[CALL-MON] 🛑 -> llamada TERMINADA, deteniendo grabacion...');
      await _detener();
    }
  }

  Future<void> _iniciar() async {
    try {
      final perm = await _rec.hasPermission();
      print('[CALL-MON]    _iniciar: hasPermission=$perm');
      if (!perm) {
        print('[CALL-MON]    ⚠️ sin permiso de micro -> no se puede grabar');
        return;
      }
      final dir = await _carpetaLlamadas();
      final ts = DateFormat('dd-MM-yyyy_HH-mm-ss').format(DateTime.now());
      _rutaActual = '${dir.path}/LLAMADA_$ts.wav';
      print('[CALL-MON]    _iniciar: grabando a $_rutaActual');
      await _rec.start(
        const RecordConfig(
          encoder: AudioEncoder.wav,
          sampleRate: 16000,
          numChannels: 1,
        ),
        path: _rutaActual!,
      );
      _grabando = true;
      print('[CALL-MON]    ✅ grabacion INICIADA');
      FlutterForegroundTask.updateService(
        notificationTitle: 'Grabando llamada...',
        notificationText: 'Scammer esta grabando la llamada actual',
      );
    } catch (e, st) {
      _grabando = false;
      print('[CALL-MON]    ❌ ERROR al iniciar grabacion: $e');
      print('[CALL-MON]       $st');
    }
  }

  Future<void> _detener() async {
    try {
      final ruta = await _rec.stop();
      _grabando = false;
      final destino = ruta ?? _rutaActual;
      print('[CALL-MON]    _detener: record.stop devolvio=$ruta  destino=$destino');
      if (destino != null) {
        final f = File(destino);
        final existe = await f.exists();
        print('[CALL-MON]    _detener: archivo existe=$existe');
        if (existe) {
          final bytes = await f.length();
          final seg = ((bytes - 44) / 32000).round();
          print('[CALL-MON]    ✅ GUARDADO: $destino ($bytes bytes, ~${seg}s)');
          final m = (seg ~/ 60).toString().padLeft(2, '0');
          final s = (seg % 60).toString().padLeft(2, '0');
          FlutterForegroundTask.updateService(
            notificationTitle: 'Llamada grabada ($m:$s)',
            notificationText: 'Abri Scammer para analizarla',
          );
          FlutterForegroundTask.sendDataToMain(destino);
          return;
        }
      }
      print('[CALL-MON]    ⚠️ no quedo archivo de grabacion');
      FlutterForegroundTask.updateService(
        notificationTitle: 'Monitoreando llamadas',
        notificationText: 'Esperando una llamada para grabarla...',
      );
    } catch (e, st) {
      _grabando = false;
      print('[CALL-MON]    ❌ ERROR al detener grabacion: $e');
      print('[CALL-MON]       $st');
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp, bool isTimeout) async {
    print('[CALL-MON] onDestroy (isTimeout=$isTimeout) grabando=$_grabando');
    if (_grabando) {
      try {
        await _rec.stop();
      } catch (e) {
        print('[CALL-MON]    error stop en destroy: $e');
      }
      _grabando = false;
    }
    try {
      await _rec.dispose();
    } catch (e) {
      print('[CALL-MON]    error dispose: $e');
    }
  }
}
