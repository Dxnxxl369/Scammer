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
  bool _grabacionManual = false;
  String? _rutaActual;
  DateTime? _tiempoInicio;
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
      notificationButtons: [
        const NotificationButton(id: 'btn_start_record', text: 'Grabar Ahora'),
        const NotificationButton(id: 'btn_stop_service', text: 'Detener Servicio'),
      ],
    );
  }

  /// Maneja los botones de accion de la notificacion persistente.
  /// Permite al usuario detener el servicio desde CUALQUIER app sin abrir Scammer.
  @override
  void onNotificationButtonPressed(String id) {
    _log('Botón de notificación presionado: $id');
    if (id == 'btn_stop_service') {
      _log('-> Deteniendo ForegroundService por solicitud del usuario');
      if (_grabando) {
        _detener();
      }
      FlutterForegroundTask.stopService();
    } else if (id == 'btn_start_record') {
      _log('-> Iniciando grabación manualmente por botón');
      if (!_grabando) {
        _grabacionManual = true;
        _iniciar();
      }
    } else if (id == 'btn_stop_record') {
      _log('-> Deteniendo grabación manualmente por botón');
      if (_grabando) {
        _grabacionManual = false;
        _detener();
      }
    }
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
      _log('📞 -> llamada ACTIVA detectada, iniciando grabacion automatica...');
      _grabacionManual = false;
      await _iniciar();
    } else if (estado == CallState.IDLE && _grabando && !_grabacionManual) {
      _log('🛑 -> llamada TERMINADA, deteniendo grabacion automatica...');
      await _detener();
    }
  }

  Future<void> _iniciar() async {
    try {
      // OJO: en el isolate del servicio, hasPermission() puede devolver false
      // AUNQUE el permiso SI este concedido (no tiene Activity para verificar).
      // Por eso NO bloqueamos: el servicio es de tipo "microphone", asi que
      // intentamos grabar directo; si de verdad falta, _rec.start() lanzara.
      final perm = await _rec.hasPermission();
      _log('_iniciar: hasPermission=$perm (intento grabar igual, no bloqueo)');
      final dir = await _carpetaLlamadas();
      final ts = DateFormat('dd-MM-yyyy_HH-mm-ss').format(DateTime.now());
      _rutaActual = '${dir.path}/LLAMADA_$ts.m4a';
      _log('_iniciar: grabando a $_rutaActual');

      // En Android 10+ grabar llamadas está bloqueado y da silencio.
      // Las fuentes "voiceRecognition" o "camcorder" suelen saltarse la restricción
      // mejor que "mic" puro. También es mejor no forzar audioManagerMode.
      const fuentes = [
        AndroidAudioSource.voiceRecognition,
        AndroidAudioSource.voiceCommunication,
        AndroidAudioSource.camcorder,
        AndroidAudioSource.mic,
      ];
      bool iniciado = false;
      for (final src in fuentes) {
        try {
          await _rec.start(
            RecordConfig(
              encoder: AudioEncoder.aacLc,
              bitRate: 64000,
              sampleRate: 44100,
              numChannels: 1,
              androidConfig: AndroidRecordConfig(
                audioSource: src,
                // Quitar speakerphone y modeInCommunication puede evitar conflictos
                // con la app de teléfono nativa.
              ),
            ),
            path: _rutaActual!,
          );
          iniciado = true;
          _log('grabando con fuente=${src.name} (.m4a)');
          break;
        } catch (e) {
          _log('fuente ${src.name} fallo ($e) -> pruebo la siguiente');
        }
      }
      if (!iniciado) {
        _grabando = false;
        _log('❌ ninguna fuente de audio arranco -> sin grabacion');
        return;
      }

      _grabando = true;
      _tiempoInicio = DateTime.now();
      _log('✅ grabacion INICIADA');
      FlutterForegroundTask.updateService(
        notificationTitle: 'Grabando llamada...',
        notificationText: 'Scammer esta grabando la llamada actual',
        notificationButtons: [
          const NotificationButton(id: 'btn_stop_record', text: 'Detener Grabación'),
        ],
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
          int seg = 0;
          if (_tiempoInicio != null) {
            seg = DateTime.now().difference(_tiempoInicio!).inSeconds;
          }
          final bytes = await f.length();
          _log('✅ GUARDADO: ${destino.split('/').last} ($bytes bytes, ~${seg}s)');
          if (bytes <= 1024) {
            _log('⚠️ archivo casi vacio -> probable SILENCIO (el OEM bloqueo la captura)');
          }
          final m = (seg ~/ 60).toString().padLeft(2, '0');
          final s = (seg % 60).toString().padLeft(2, '0');
          FlutterForegroundTask.updateService(
            notificationTitle: 'Llamada grabada ($m:$s)',
            notificationText: 'Abri Scammer para analizarla',
            notificationButtons: [
              const NotificationButton(id: 'btn_start_record', text: 'Grabar Ahora'),
              const NotificationButton(id: 'btn_stop_service', text: 'Detener Servicio'),
            ],
          );
          FlutterForegroundTask.sendDataToMain('REC:$destino');
          return;
        }
      }
      _log('⚠️ no quedo archivo de grabacion');
      FlutterForegroundTask.updateService(
        notificationTitle: 'Monitoreando llamadas',
        notificationText: 'Esperando una llamada para grabarla...',
        notificationButtons: [
          const NotificationButton(id: 'btn_start_record', text: 'Grabar Ahora'),
          const NotificationButton(id: 'btn_stop_service', text: 'Detener Servicio'),
        ],
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
