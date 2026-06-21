import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_core/firebase_core.dart';
import 'api_service.dart';

// Manejador de mensajes en segundo plano / app cerrada.
// DEBE ser una función top-level con @pragma('vm:entry-point') para que el
// isolate de fondo la encuentre.
@pragma('vm:entry-point')
Future<void> _firebaseBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  // Si más adelante integras flutter_local_notifications, aquí puedes mostrar
  // la notificación cuando llega un mensaje de tipo "data" en segundo plano.
}

class FirebaseService {
  static Future<void> initialize() async {
    // Init best-effort: si falta google-services.json (Firebase sin configurar),
    // NO debe tumbar la app — solo quedan deshabilitadas las notificaciones push.
    try {
      await Firebase.initializeApp();

      // Registrar el manejador de fondo antes de escuchar en primer plano.
      FirebaseMessaging.onBackgroundMessage(_firebaseBackgroundHandler);

      FirebaseMessaging messaging = FirebaseMessaging.instance;

      // Solicitar permisos (iOS / Android 13+). Dispara el diálogo POST_NOTIFICATIONS.
      await messaging.requestPermission(
        alert: true,
        badge: true,
        sound: true,
      );

      // Notificaciones recibidas con la app en primer plano.
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        print('ALERTA RECIBIDA EN PRIMER PLANO: ${message.notification?.title}');
      });

      // Re-registrar el token en el backend cuando Firebase lo rote.
      FirebaseMessaging.instance.onTokenRefresh.listen((String token) {
        ApiService.post('/auth/fcm/', {'token': token});
      });
    } catch (e) {
      print('[FIREBASE] Inicializacion omitida (falta google-services.json?): $e');
    }
  }

  static Future<void> registerToken() async {
    try {
      String? token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        print('TOKEN FCM RECUPERADO: $token');
        await ApiService.post('/auth/fcm/', {'token': token});
      }
    } catch (e) {
      print('Error al registrar token FCM: $e');
    }
  }
}
