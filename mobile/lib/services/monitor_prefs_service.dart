import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'call_monitor_control.dart';
import 'sms_monitor_service.dart';

/// Servicio central de persistencia de estado de monitores.
/// Guarda y restaura los flags sms_enabled / call_record_enabled en SharedPreferences.
/// Llamar a [restaurar] al arranque de la app para reactivar servicios automáticamente.
class MonitorPrefsService {
  static const _keySms = 'monitor_sms_enabled';
  static const _keyCall = 'monitor_call_enabled';

  // ── SMS ─────────────────────────────────────────────────────────────────────

  static Future<bool> getSmsEnabled() async {
    final p = await SharedPreferences.getInstance();
    return p.getBool(_keySms) ?? false;
  }

  static Future<void> setSmsEnabled(bool v) async {
    final p = await SharedPreferences.getInstance();
    await p.setBool(_keySms, v);
    print('[PREFS] sms_enabled guardado => $v');
  }

  // ── LLAMADAS ─────────────────────────────────────────────────────────────────

  static Future<bool> getCallEnabled() async {
    final p = await SharedPreferences.getInstance();
    return p.getBool(_keyCall) ?? false;
  }

  static Future<void> setCallEnabled(bool v) async {
    final p = await SharedPreferences.getInstance();
    await p.setBool(_keyCall, v);
    print('[PREFS] call_enabled guardado => $v');
  }

  // ── RESTAURAR AL ARRANQUE ────────────────────────────────────────────────────

  /// Llama a esto en main() ANTES de runApp para reactivar los servicios
  /// que el usuario había dejado activos antes de cerrar la app.
  static Future<void> restaurar() async {
    print('[PREFS] Restaurando estado de monitores...');

    final smsOn = await getSmsEnabled();
    final callOn = await getCallEnabled();

    print('[PREFS]   SMS=$smsOn  CALL=$callOn');

    if (smsOn) {
      print('[PREFS]   -> re-iniciando SmsMonitorService');
      SmsMonitorService.start();
    }

    if (callOn) {
      print('[PREFS]   -> re-activando CallMonitorControl');
      // Intentar reactivar; si faltan permisos se ignora silenciosamente
      // (la UI mostrará el toggle apagado para que el usuario lo reactive)
      try {
        final ok = await CallMonitorControl.activar();
        if (!ok) {
          // Sin permisos: resetear el flag para que la UI no mienta
          await setCallEnabled(false);
          print('[PREFS]   -> CallMonitor no pudo reactivarse (sin permisos), flag reseteado');
        }
      } catch (e) {
        print('[PREFS]   -> Error reactivando CallMonitor: $e');
      }
    }
  }
  static const _keySmsHistory = 'sms_history';

  static Future<List<Map<String, dynamic>>> getSmsHistory() async {
    final p = await SharedPreferences.getInstance();
    final list = p.getStringList(_keySmsHistory) ?? [];
    return list.map((s) => jsonDecode(s) as Map<String, dynamic>).toList();
  }

  static Future<void> addSmsToHistory(String address, String body, double prob, String veredicto) async {
    final p = await SharedPreferences.getInstance();
    final list = p.getStringList(_keySmsHistory) ?? [];
    final newItem = jsonEncode({
      'address': address,
      'body': body,
      'prob': prob,
      'veredicto': veredicto,
      'timestamp': DateTime.now().millisecondsSinceEpoch,
    });
    list.insert(0, newItem);
    if (list.length > 50) list.removeLast();
    await p.setStringList(_keySmsHistory, list);
  }
}
