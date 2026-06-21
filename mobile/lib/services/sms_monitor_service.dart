import 'package:flutter/widgets.dart';
import 'package:another_telephony/telephony.dart';
import '../models/analysis.dart';
import 'analysis_service.dart';
import 'notification_helper.dart';

/// Handler de fondo: se ejecuta en un ISOLATE separado cuando llega un SMS y la
/// app está cerrada o en segundo plano. Debe ser una función de nivel superior
/// y estar anotada con @pragma('vm:entry-point') para que el motor la encuentre.
/// Lee credenciales desde SharedPreferences (vía ApiService), analiza el SMS con
/// el backend en modo auto (sin consumir cuota) y, si es de alto riesgo, notifica.
@pragma('vm:entry-point')
Future<void> smsBackgroundHandler(SmsMessage message) async {
  WidgetsFlutterBinding.ensureInitialized();
  final body = message.body ?? '';
  if (body.trim().isEmpty) return;
  try {
    final out = await AnalysisService.analyzeSms(body, message.address, auto: true);
    final res = out.result;
    if (res != null && res.estado == 'OK' && res.aiProbability >= 60) {
      await NotificationHelper.showSmishingAlert(message.address ?? 'Desconocido', res);
    }
  } catch (_) {
    // Silencioso: el isolate de fondo no debe romper nada visible al usuario.
  }
}

/// Monitoreo automático de SMS entrante. Solo Android (iOS no permite leer SMS).
class SmsMonitorService {
  static final Telephony _telephony = Telephony.instance;
  static bool _started = false;

  /// Callback opcional para que la pantalla muestre en vivo lo analizado (foreground).
  static void Function(SmsMessage message, AnalysisResult? result)? onAnalyzed;

  static bool get isStarted => _started;

  /// Pide permisos de teléfono y SMS. Devuelve true si se concedieron.
  static Future<bool> requestPermissions() async {
    final granted = await _telephony.requestPhoneAndSmsPermissions;
    return granted ?? false;
  }

  /// Empieza a escuchar SMS entrantes (foreground + background). Idempotente.
  static void start() {
    if (_started) return;
    _started = true;
    _telephony.listenIncomingSms(
      onNewMessage: _onForeground,
      onBackgroundMessage: smsBackgroundHandler,
      listenInBackground: true,
    );
  }

  /// Llega un SMS con la app abierta: analiza, notifica si es riesgoso y avisa a la UI.
  static Future<void> _onForeground(SmsMessage message) async {
    final body = message.body ?? '';
    AnalysisResult? res;
    if (body.trim().isNotEmpty) {
      try {
        final out = await AnalysisService.analyzeSms(body, message.address, auto: true);
        res = out.result;
        if (res != null && res.estado == 'OK' && res.aiProbability >= 60) {
          await NotificationHelper.showSmishingAlert(message.address ?? 'Desconocido', res);
        }
      } catch (_) {
        res = null;
      }
    }
    onAnalyzed?.call(message, res);
  }
}
