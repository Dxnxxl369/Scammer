import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import '../models/analysis.dart';
import 'api_service.dart';

class AnalysisService {
  static Future<AnalysisResult?> analyzeText(String text) async {
    try {
      final response = await ApiService.post('/analisis/texto/', {
        'texto': text,
        'nombre_archivo': 'documento_texto',
        'extension': 'txt'
      });
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return AnalysisResult.fromJson(data['datos']);
      }
    } catch (e) {
      print("Analyze Text Error: $e");
    }
    return null;
  }

  /// Detección de código generado por IA (vía perplejidad).
  /// Devuelve el resultado en caso de éxito, o un mensaje de error
  /// (límite, motor no disponible, conexión). Para fragmentos demasiado cortos
  /// el resultado llega con estado 'INSUFICIENTE'.
  static Future<({AnalysisResult? result, String? error})> analyzeCode(
      String code, String? language) async {
    try {
      final response = await ApiService.post('/analisis/codigo/', {
        'codigo': code,
        if (language != null) 'lenguaje': language,
      });
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['exito'] == true) {
        return (result: AnalysisResult.fromJson(data['datos']), error: null);
      }
      final msg = data['error'] != null ? data['error']['mensaje'] : null;
      return (result: null, error: (msg ?? 'No se pudo analizar el código.').toString());
    } catch (e) {
      print("Analyze Code Error: $e");
      return (result: null, error: 'Error de conexión con el motor de análisis.');
    }
  }

  /// Detección de smishing (SMS fraudulento).
  /// Devuelve el resultado o un mensaje de error (límite / conexión).
  static Future<({AnalysisResult? result, String? error})> analyzeSms(
      String text, String? sender) async {
    try {
      final response = await ApiService.post('/analisis/sms/', {
        'texto': text,
        if (sender != null && sender.trim().isNotEmpty) 'remitente': sender.trim(),
      });
      final data = jsonDecode(response.body);
      if (response.statusCode == 200 && data['exito'] == true) {
        return (result: AnalysisResult.fromJson(data['datos']), error: null);
      }
      final msg = data['error'] != null ? data['error']['mensaje'] : null;
      return (result: null, error: (msg ?? 'No se pudo analizar el SMS.').toString());
    } catch (e) {
      print("Analyze SMS Error: $e");
      return (result: null, error: 'Error de conexión con el servidor.');
    }
  }

  static Future<AnalysisResult?> analyzeFile(File file, String type) async {
    try {
      final headers = await ApiService.getHeaders();
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${ApiService.baseUrl}/analisis/$type/'),
      );

      request.headers.addAll(headers);
      
      final stream = http.ByteStream(file.openRead());
      final length = await file.length();
      final fileName = file.path.split('/').last;
      final extension = fileName.contains('.') ? fileName.split('.').last : '';

      final multipartFile = http.MultipartFile(
        'archivo',
        stream,
        length,
        filename: fileName,
        contentType: MediaType(
          type == 'video' ? 'video' : (type == 'audio' ? 'audio' : 'image'),
          extension.isEmpty ? 'octet-stream' : extension,
        ),
      );

      // Añadimos campos adicionales al multipart
      request.fields['nombre_archivo'] = fileName;
      request.fields['extension'] = extension;

      request.files.add(multipartFile);
      
      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return AnalysisResult.fromJson(data['datos']);
      }
    } catch (e) {
      print("Analyze File Error: $e");
    }
    return null;
  }

  static Future<List<AnalysisResult>?> obtenerHistorial() async {
    try {
      final response = await ApiService.get('/analisis/historial/');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['exito'] == true) {
          return (data['datos'] as List)
              .map((item) => AnalysisResult.fromJson(item))
              .toList();
        }
      }
    } catch (e) {
      print("Get History Error: $e");
    }
    return null;
  }
}
