import 'package:permission_handler/permission_handler.dart';

/// Gestiona la solicitud de excepción de optimización de batería.
/// En Android, sin este permiso, el SO puede matar el ForegroundService
/// después de unos minutos en segundo plano.
class BatteryOptimizationService {
  /// Devuelve true si la app YA está excluida de la optimización de batería
  /// (el servicio puede correr libremente en background).
  static Future<bool> estaExcluida() async {
    final status = await Permission.ignoreBatteryOptimizations.status;
    return status.isGranted;
  }

  /// Solicita al usuario que excluya la app de optimización de batería.
  /// Abre el diálogo nativo del SO que lleva directo a la pantalla correcta.
  /// Devuelve true si el usuario concedió la excepción.
  static Future<bool> solicitarExcepcion() async {
    // Si ya está concedida no hacemos nada
    if (await estaExcluida()) {
      print('[BATTERY] Ya excluida de optimización, sin acción necesaria.');
      return true;
    }
    print('[BATTERY] Solicitando excepción de optimización de batería...');
    final result = await Permission.ignoreBatteryOptimizations.request();
    final ok = result.isGranted;
    print('[BATTERY] Resultado => $ok');
    return ok;
  }
}
