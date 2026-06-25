import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // Base URL del backend. Por defecto apunta a la IP de la PC en la Wi-Fi
  // (el teléfono la alcanza directo; verificado con /api/health/ -> 200).
  // Si cambia tu red/IP, edita ESTA línea (o pásala por build):
  //   flutter run --dart-define=API_BASE_URL=http://OTRA_IP:8002/api
  // NOTA: mobile/.env NO se usa (no hay flutter_dotenv) y un .env tampoco
  // serviría al isolate de fondo de SMS; por eso la URL vive aquí en código.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://scammer-ia.duckdns.org/api',          
  );

  static Future<Map<String, String>> getHeaders() async {
    print('✅ [DEBUG API] getHeaders() - Obteniendo SharedPreferences...');
    final prefs = await SharedPreferences.getInstance();
    print('✅ [DEBUG API] getHeaders() - SharedPreferences obtenido');
    final token = prefs.getString('auth_token');
    final userId = prefs.getString('user_id');
    print('✅ [DEBUG API] getHeaders() - Token: \${token != null ? "SI" : "NO"} | UserId: \${userId != null ? "SI" : "NO"}');

    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
      if (userId != null) 'X-User-ID': userId,
    };
  }

  // Loguea cada llamada para ver a qué backend va y qué responde
  // (aparece en la consola de `flutter run`). Útil para depurar conectividad.
  static Future<http.Response> _log(
    String metodo,
    String url,
    Future<http.Response> Function() call,
  ) async {
    print('[API] $metodo $url');
    try {
      final res = await call();
      print('[API] $metodo $url -> HTTP ${res.statusCode}');
      return res;
    } catch (e) {
      print('[API] $metodo $url -> ERROR DE RED: $e');
      rethrow;
    }
  }

  static Future<http.Response> post(String endpoint, Map<String, dynamic> body) async {
    final headers = await getHeaders();
    final url = '$baseUrl$endpoint';
    return _log('POST', url, () => http.post(Uri.parse(url), headers: headers, body: jsonEncode(body)).timeout(const Duration(seconds: 10)));
  }

  static Future<http.Response> get(String endpoint) async {
    final headers = await getHeaders();
    final url = '$baseUrl$endpoint';
    return _log('GET', url, () => http.get(Uri.parse(url), headers: headers).timeout(const Duration(seconds: 10)));
  }

  static Future<http.Response> patch(String endpoint, Map<String, dynamic> body) async {
    final headers = await getHeaders();
    final url = '$baseUrl$endpoint';
    return _log('PATCH', url, () => http.patch(Uri.parse(url), headers: headers, body: jsonEncode(body)).timeout(const Duration(seconds: 10)));
  }
}
