import 'dart:io';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

/// Metadatos de una grabación de llamada encontrada en MediaStore.
class RecordingInfo {
  final int id;
  final String name;
  final String path;
  final int dateAddedMs;
  final int sizeBytes;

  RecordingInfo({
    required this.id,
    required this.name,
    required this.path,
    required this.dateAddedMs,
    required this.sizeBytes,
  });

  factory RecordingInfo.fromMap(Map m) => RecordingInfo(
        id: (m['id'] as num).toInt(),
        name: (m['name'] ?? '') as String,
        path: (m['path'] ?? '') as String,
        dateAddedMs: (m['dateAddedMs'] as num?)?.toInt() ?? 0,
        sizeBytes: (m['sizeBytes'] as num?)?.toInt() ?? 0,
      );
}

/// Detecta grabaciones de llamada del propio teléfono vía MediaStore (sin rutas
/// fijas, así cubre varias marcas). NO graba: solo encuentra lo que el grabador
/// del sistema ya dejó. Requiere permiso de lectura de audio.
class CallRecordingsService {
  static const _channel = MethodChannel('scammer/recordings');

  /// Pide el permiso de lectura de audio (READ_MEDIA_AUDIO en 13+, almacenamiento abajo).
  static Future<bool> pedirPermiso() async {
    final audio = await Permission.audio.request();
    if (audio.isGranted) return true;
    final storage = await Permission.storage.request();
    return storage.isGranted;
  }

  /// Grabaciones recientes que parecen llamadas (más nuevas primero).
  static Future<List<RecordingInfo>> recientes({int limit = 20}) async {
    try {
      final res = await _channel.invokeMethod('getRecentRecordings', {'limit': limit});
      if (res is List) {
        return res.map((e) => RecordingInfo.fromMap(Map.from(e as Map))).toList();
      }
    } catch (_) {}
    return [];
  }

  /// La grabación de llamada más reciente, o null si no hay.
  static Future<RecordingInfo?> ultima() async {
    final lista = await recientes(limit: 1);
    return lista.isNotEmpty ? lista.first : null;
  }

  /// Copia la grabación a la caché de la app y devuelve el File local (para subir).
  static Future<File?> cachear(int id) async {
    try {
      final path = await _channel.invokeMethod<String>('cacheRecording', {'id': id});
      if (path == null) return null;
      final f = File(path);
      return await f.exists() ? f : null;
    } catch (_) {
      return null;
    }
  }
}
