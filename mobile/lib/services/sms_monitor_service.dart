import 'package:flutter/widgets.dart';
import 'package:another_telephony/telephony.dart';
import '../models/analysis.dart';
import 'analysis_service.dart';
import 'notification_helper.dart';

// Logger explícito para depurar el monitoreo de SMS. Prefijo [SMS-MON] para
// poder filtrar en la consola de `flutter run` o con: adb logcat | findstr SMS-MON
void _log(String m) => print('[SMS-MON] $m');

/// Handler de fondo: se ejecuta en un ISOLATE separado cuando llega un SMS y la
/// app está cerrada o en segundo plano. Top-level + @pragma('vm:entry-point').
@pragma('vm:entry-point')
Future<void> smsBackgroundHandler(SmsMessage message) async {
  WidgetsFlutterBinding.ensureInitialized();
  _log('📩📩 BACKGROUND handler DISPARADO (app cerrada/2do plano)');
  _log('     remitente=${message.address}  bodyLen=${message.body?.length}');
  _log('     body="${message.body}"');
  final body = message.body ?? '';
  if (body.trim().isEmpty) {
    _log('     body vacío -> ignoro');
    return;
  }
  try {
    _log('     -> llamando analyzeSms(auto:true)...');
    final out = await AnalysisService.analyzeSms(body, message.address, auto: true);
    final res = out.result;
    _log('     <- err=${out.error}  prob=${res?.aiProbability}  veredicto=${res?.veredicto}  estado=${res?.estado}');
    if (res != null && res.estado == 'OK' && res.aiProbability >= 60) {
      _log('     ⚠️ riesgo>=60 -> mostrando notificación');
      await NotificationHelper.showSmishingAlert(message.address ?? 'Desconocido', res);
    } else {
      _log('     riesgo<60 o sin resultado -> NO notifico');
    }
  } catch (e, st) {
    _log('     ❌ EXCEPCIÓN en background handler: $e');
    _log('$st');
  }
}

/// Monitoreo automático de SMS entrante. Solo Android (iOS no permite leer SMS).
class SmsMonitorService {
  static final Telephony _telephony = Telephony.instance;
  static bool _started = false;

  /// Callback para que la pantalla muestre en vivo lo analizado (foreground).
  static void Function(SmsMessage message, AnalysisResult? result)? onAnalyzed;

  static bool get isStarted => _started;

  /// Pide permisos de teléfono y SMS. Devuelve true si se concedieron.
  static Future<bool> requestPermissions() async {
    _log('Solicitando permisos de teléfono y SMS...');
    try {
      final granted = await _telephony.requestPhoneAndSmsPermissions;
      _log('Resultado de permisos => $granted');
      return granted ?? false;
    } catch (e, st) {
      _log('❌ EXCEPCIÓN pidiendo permisos: $e');
      _log('$st');
      return false;
    }
  }

  /// Empieza a escuchar SMS entrantes (foreground + background). Idempotente.
  static void start() {
    if (_started) {
      _log('start() llamado pero YA estaba iniciado (ok)');
      return;
    }
    _log('start() -> registrando listenIncomingSms (foreground + background)...');
    try {
      _telephony.listenIncomingSms(
        onNewMessage: _onForeground,
        onBackgroundMessage: smsBackgroundHandler,
        listenInBackground: true,
      );
      _started = true;
      _log('✅ listenIncomingSms registrado SIN errores. Esperando SMS entrantes...');
    } catch (e, st) {
      _log('❌ EXCEPCIÓN al registrar listenIncomingSms: $e');
      _log('$st');
    }
  }

  /// Llega un SMS con la app abierta: analiza, notifica si es riesgoso y avisa a la UI.
  static Future<void> _onForeground(SmsMessage message) async {
    _log('📩 onNewMessage (FOREGROUND) DISPARADO');
    _log('   remitente=${message.address}  bodyLen=${message.body?.length}');
    _log('   body="${message.body}"');
    final body = message.body ?? '';
    AnalysisResult? res;
    if (body.trim().isNotEmpty) {
      try {
        _log('   -> llamando analyzeSms(auto:true)...');
        final out = await AnalysisService.analyzeSms(body, message.address, auto: true);
        res = out.result;
        _log('   <- err=${out.error}  prob=${res?.aiProbability}  veredicto=${res?.veredicto}  estado=${res?.estado}');
        if (res != null && res.estado == 'OK' && res.aiProbability >= 60) {
          _log('   ⚠️ riesgo>=60 -> mostrando notificación');
          await NotificationHelper.showSmishingAlert(message.address ?? 'Desconocido', res);
        } else {
          _log('   riesgo<60 o sin resultado -> NO notifico');
        }
      } catch (e, st) {
        _log('   ❌ EXCEPCIÓN analizando: $e');
        _log('$st');
        res = null;
      }
    } else {
      _log('   body vacío -> no analizo');
    }
    if (onAnalyzed != null) {
      _log('   -> actualizando lista en pantalla (onAnalyzed != null)');
      onAnalyzed!.call(message, res);
    } else {
      _log('   onAnalyzed == null (pantalla de monitoreo NO abierta) -> no actualizo lista');
    }
  }
}
