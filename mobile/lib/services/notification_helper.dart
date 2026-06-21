import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import '../models/analysis.dart';

/// Notificaciones locales para avisar de SMS potencialmente fraudulentos.
/// Se inicializa de forma perezosa para poder usarse también desde el
/// isolate de fondo (cuando llega un SMS con la app cerrada).
class NotificationHelper {
  static final FlutterLocalNotificationsPlugin _plugin =
      FlutterLocalNotificationsPlugin();
  static bool _inited = false;

  static Future<void> _ensureInit() async {
    if (_inited) return;
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    const settings = InitializationSettings(android: androidInit);
    await _plugin.initialize(settings);
    // Android 13+: pedir permiso de notificaciones
    await _plugin
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
    _inited = true;
  }

  static Future<void> showSmishingAlert(String sender, AnalysisResult res) async {
    await _ensureInit();
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
  }
}
