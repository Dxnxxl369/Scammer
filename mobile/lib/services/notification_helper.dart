import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../models/analysis.dart';

void _log(String m) => print('[SMS-NOTIF] $m');

/// Notificaciones locales para avisar de SMS potencialmente fraudulentos.
/// Init perezoso para poder usarse también desde el isolate de fondo.
class NotificationHelper {
  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  static bool _inited = false;

  static Future<void> _ensureInit() async {
    if (_inited) return;
    _log('Inicializando plugin de notificaciones locales...');
    try {
      const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
      const settings = InitializationSettings(android: androidInit);
      await _plugin.initialize(settings);
      final granted = await _plugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
      _log('Permiso de notificaciones (POST_NOTIFICATIONS) => $granted');
      _inited = true;
    } catch (e, st) {
      _log('❌ EXCEPCIÓN inicializando notificaciones: $e');
      _log('$st');
    }
  }

  static Future<void> showSmishingAlert(String sender, AnalysisResult res) async {
    await _ensureInit();
    try {
      _log('Mostrando notificación => "$sender"  ${res.aiProbability.toInt()}%  ${res.veredicto}');
      const details = NotificationDetails(
        android: AndroidNotificationDetails(
          'smishing_alerts',
          'Alertas de Smishing',
          channelDescription: 'Avisos de SMS potencialmente fraudulentos',
          importance: Importance.high,
          priority: Priority.high,
          styleInformation: BigTextStyleInformation(''),
        ),
      );
      await _plugin.show(
        DateTime.now().millisecondsSinceEpoch ~/ 1000,
        '⚠️ SMS sospechoso de $sender',
        '${res.aiProbability.toInt()}% de riesgo · ${res.veredicto}',
        details,
      );
      _log('✅ Notificación enviada al sistema');
    } catch (e, st) {
      _log('❌ EXCEPCIÓN mostrando notificación: $e');
      _log('$st');
    }
  }
}
