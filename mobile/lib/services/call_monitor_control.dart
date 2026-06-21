import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:permission_handler/permission_handler.dart';
import 'call_monitor_task.dart';

/// Controla el servicio en primer plano que graba llamadas automaticamente.
class CallMonitorControl {
  static const int _serviceId = 451;

  static void _initService() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'scammer_llamadas',
        channelName: 'Grabacion de llamadas',
        channelDescription: 'Aparece mientras Scammer monitorea y graba llamadas.',
        onlyAlertOnce: true,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: false,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(2000),
        autoRunOnBoot: true,
        autoRunOnMyPackageReplaced: true,
        allowWakeLock: true,
        allowWifiLock: false,
      ),
    );
  }

  /// Pide microfono + estado de llamada + notificaciones.
  static Future<bool> pedirPermisos() async {
    final mic = await Permission.microphone.request();
    final phone = await Permission.phone.request();
    final notif = await Permission.notification.request();
    print('[CALL-MON] permisos -> microfono=$mic  telefono(READ_PHONE_STATE)=$phone  notif=$notif');
    return mic.isGranted && phone.isGranted;
  }

  /// Arranca el servicio. Devuelve false si faltan permisos o fallo el arranque.
  static Future<bool> activar() async {
    if (!await pedirPermisos()) {
      print('[CALL-MON] ❌ activar abortado: faltan permisos');
      return false;
    }
    _initService();
    if (await FlutterForegroundTask.isRunningService) {
      print('[CALL-MON] servicio ya estaba corriendo');
      return true;
    }
    print('[CALL-MON] arrancando servicio en primer plano...');
    final res = await FlutterForegroundTask.startService(
      serviceId: _serviceId,
      notificationTitle: 'Monitoreando llamadas',
      notificationText: 'Esperando una llamada para grabarla...',
      serviceTypes: [ForegroundServiceTypes.microphone],
      callback: startCallMonitor,
    );
    final ok = res is ServiceRequestSuccess;
    print('[CALL-MON] startService -> ${ok ? "OK ✅" : "FALLO ❌ ($res)"}');
    return ok;
  }

  static Future<void> desactivar() async {
    await FlutterForegroundTask.stopService();
  }

  static Future<bool> estaActivo() async {
    return FlutterForegroundTask.isRunningService;
  }
}
