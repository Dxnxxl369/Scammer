import 'dart:async';
import 'package:flutter/widgets.dart';
import 'package:another_telephony/telephony.dart';
import '../models/analysis.dart';
import 'analysis_service.dart';
import 'notification_helper.dart';

// Prefijo [SMS-MON] para filtrar: flutter run, o  adb logcat | findstr SMS-MON
void _log(String m) => print('[SMS-MON] $m');

/// Handler de fondo (app cerrada): isolate separado, top-level + vm:entry-point.
@pragma('vm:entry-point')
Future<void> smsBackgroundHandler(SmsMessage message) async {
  WidgetsFlutterBinding.ensureInitialized();
  _log('📩📩 BACKGROUND handler DISPARADO (broadcast, app cerrada/2do plano)');
  _log('     remitente=${message.address}  body="${message.body}"');
  final body = message.body ?? '';
  if (body.trim().isEmpty) return;
  try {
    final out = await AnalysisService.analyzeSms(body, message.address, auto: true);
    final res = out.result;
    _log('     <- err=${out.error} prob=${res?.aiProbability} veredicto=${res?.veredicto}');
    if (res != null && res.estado == 'OK' && res.aiProbability >= 60) {
      await NotificationHelper.showSmishingAlert(message.address ?? 'Desconocido', res);
    }
  } catch (e, st) {
    _log('     ❌ EXCEPCIÓN en background handler: $e');
    _log('$st');
  }
}

/// Monitoreo automático de SMS entrante. Solo Android.
/// Usa 2 mecanismos: broadcast (para app cerrada) + polling de la bandeja
/// (respaldo robusto para ROMs OEM como HiOS que bloquean el broadcast).
class SmsMonitorService {
  static final Telephony _telephony = Telephony.instance;
  static bool _started = false;
  static Timer? _pollTimer;
  static int _lastSeenDate = 0;

  static void Function(SmsMessage message, AnalysisResult? result)? onAnalyzed;

  static bool get isStarted => _started;

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

  static void start() {
    if (_started) {
      _log('start() llamado pero YA estaba iniciado (ok)');
      return;
    }
    _started = true;
    // 1) Broadcast: sirve para app cerrada/2do plano (en algunos OEM no dispara).
    _log('start() -> registrando listenIncomingSms (broadcast)...');
    try {
      _telephony.listenIncomingSms(
        onNewMessage: _onForeground,
        onBackgroundMessage: smsBackgroundHandler,
        listenInBackground: true,
      );
      _log('✅ listenIncomingSms registrado SIN errores.');
    } catch (e, st) {
      _log('❌ EXCEPCIÓN al registrar listenIncomingSms: $e');
      _log('$st');
    }
    // 2) Polling de la bandeja: respaldo cuando el broadcast no dispara (HiOS/MIUI).
    //    Funciona con la app en primer plano.
    _iniciarPolling();
  }

  static Future<void> _iniciarPolling() async {
    _log('Iniciando POLLING de bandeja (cada 5s) como respaldo del broadcast...');
    try {
      final actuales = await _telephony.getInboxSms();
      actuales.sort((a, b) => (b.date ?? 0).compareTo(a.date ?? 0));
      _lastSeenDate = actuales.isNotEmpty
          ? (actuales.first.date ?? DateTime.now().millisecondsSinceEpoch)
          : DateTime.now().millisecondsSinceEpoch;
      _log('Bandeja inicial: ${actuales.length} SMS. lastSeenDate=$_lastSeenDate (solo avisaré de los NUEVOS a partir de ahora)');
    } catch (e, st) {
      _lastSeenDate = DateTime.now().millisecondsSinceEpoch;
      _log('❌ Error leyendo bandeja inicial (¿permiso READ_SMS?): $e');
      _log('$st');
    }
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _poll());
    _log('✅ Polling activo.');
  }

  static Future<void> _poll() async {
    try {
      final msgs = await _telephony.getInboxSms();
      final nuevos = msgs.where((m) => (m.date ?? 0) > _lastSeenDate).toList();
      if (nuevos.isEmpty) return;
      _log('🔄 POLL: detecté ${nuevos.length} SMS NUEVO(s) en la bandeja');
      for (final m in nuevos) {
        final d = m.date ?? 0;
        if (d > _lastSeenDate) _lastSeenDate = d;
      }
      nuevos.sort((a, b) => (a.date ?? 0).compareTo(b.date ?? 0)); // viejo -> nuevo
      for (final m in nuevos) {
        await _procesar(m, 'POLL');
      }
    } catch (e, st) {
      _log('❌ Error en poll: $e');
      _log('$st');
    }
  }

  /// Botón de prueba: analiza el ÚLTIMO SMS de la bandeja sin esperar uno nuevo.
  static Future<SmsMessage?> analizarUltimoDeBandeja() async {
    _log('(TEST) Leyendo el último SMS de la bandeja...');
    try {
      final msgs = await _telephony.getInboxSms();
      if (msgs.isEmpty) {
        _log('(TEST) Bandeja vacía.');
        return null;
      }
      msgs.sort((a, b) => (b.date ?? 0).compareTo(a.date ?? 0));
      final ultimo = msgs.first;
      _log('(TEST) Último SMS: remitente=${ultimo.address} body="${ultimo.body}"');
      await _procesar(ultimo, 'TEST');
      return ultimo;
    } catch (e, st) {
      _log('(TEST) ❌ Error leyendo bandeja: $e');
      _log('$st');
      return null;
    }
  }

  static Future<void> _onForeground(SmsMessage message) async {
    _log('📩 onNewMessage (BROADCAST foreground) DISPARADO');
    final d = message.date ?? 0;
    if (d > _lastSeenDate) _lastSeenDate = d;
    await _procesar(message, 'BROADCAST');
  }

  /// Analiza un SMS, notifica si es riesgoso y avisa a la pantalla.
  static Future<void> _procesar(SmsMessage message, String origen) async {
    _log('🔎 ($origen) procesando: remitente=${message.address} bodyLen=${message.body?.length}');
    final body = message.body ?? '';
    AnalysisResult? res;
    if (body.trim().isNotEmpty) {
      try {
        final out = await AnalysisService.analyzeSms(body, message.address, auto: true);
        res = out.result;
        _log('   <- err=${out.error} prob=${res?.aiProbability} veredicto=${res?.veredicto} estado=${res?.estado}');
        if (res != null && res.estado == 'OK' && res.aiProbability >= 60) {
          _log('   ⚠️ riesgo>=60 -> notificando');
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
      onAnalyzed!.call(message, res);
    } else {
      _log('   onAnalyzed == null (pantalla no abierta)');
    }
  }
}
