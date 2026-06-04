import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_core/firebase_core.dart';
import 'api_service.dart';

class FirebaseService {
  static Future<void> initialize() async {
    await Firebase.initializeApp();
    
    FirebaseMessaging messaging = FirebaseMessaging.instance;

    // Solicitar permisos (iOS/Android 13+)
    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Escuchar notificaciones en primer plano
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      print('ALERTA RECIBIDA EN PRIMER PLANO: ${message.notification?.title}');
    });
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
