package com.scammer.ia.scammer_mobile

import android.content.ContentUris
import android.provider.MediaStore
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity : FlutterActivity() {
    private val CHANNEL = "scammer/recordings"

    // Palabras que sugieren una grabacion de llamada (multi-marca/ROM)
    private val keywords = listOf(
        "call", "record", "recorder", "recording", "grab",
        "llamada", "voicecall", "callrec", "phonecall", "sound_recorder"
    )

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "getRecentRecordings" -> {
                        val limit = call.argument<Int>("limit") ?: 20
                        try {
                            result.success(getRecentRecordings(limit))
                        } catch (e: Exception) {
                            result.error("QUERY_FAILED", e.message, null)
                        }
                    }
                    "cacheRecording" -> {
                        val id = call.argument<Int>("id")
                        if (id == null) {
                            result.error("NO_ID", "id requerido", null)
                        } else {
                            try {
                                val path = cacheRecording(id.toLong())
                                if (path != null) result.success(path)
                                else result.error("CACHE_FAILED", "No se pudo copiar la grabacion", null)
                            } catch (e: Exception) {
                                result.error("CACHE_FAILED", e.message, null)
                            }
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun getRecentRecordings(limit: Int): List<Map<String, Any>> {
        val out = ArrayList<Map<String, Any>>()
        val collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
        val projection = arrayOf(
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.DISPLAY_NAME,
            MediaStore.Audio.Media.DATE_ADDED,
            MediaStore.Audio.Media.SIZE,
            MediaStore.Audio.Media.DATA  // ruta absoluta: sirve en todas las versiones para filtrar
        )
        val sortOrder = "${MediaStore.Audio.Media.DATE_ADDED} DESC"
        contentResolver.query(collection, projection, null, null, sortOrder)?.use { cursor ->
            val idCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media._ID)
            val nameCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DISPLAY_NAME)
            val dateCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.DATE_ADDED)
            val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.Audio.Media.SIZE)
            val dataCol = cursor.getColumnIndex(MediaStore.Audio.Media.DATA)
            while (cursor.moveToNext() && out.size < limit) {
                val name = cursor.getString(nameCol) ?: ""
                val path = if (dataCol >= 0) (cursor.getString(dataCol) ?: "") else ""
                val hay = (name + " " + path).lowercase()
                val isCall = keywords.any { hay.contains(it) }
                if (!isCall) continue
                out.add(
                    mapOf(
                        "id" to cursor.getLong(idCol),
                        "name" to name,
                        "path" to path,
                        "dateAddedMs" to (cursor.getLong(dateCol) * 1000L),
                        "sizeBytes" to cursor.getLong(sizeCol)
                    )
                )
            }
        }
        return out
    }

    private fun cacheRecording(id: Long): String? {
        val uri = ContentUris.withAppendedId(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, id)
        var displayName = "llamada_$id"
        contentResolver.query(uri, arrayOf(MediaStore.Audio.Media.DISPLAY_NAME), null, null, null)?.use { c ->
            if (c.moveToFirst()) {
                val n = c.getString(0)
                if (!n.isNullOrEmpty()) displayName = n
            }
        }
        val destFile = File(cacheDir, "rec_${id}_$displayName")
        val ok = contentResolver.openInputStream(uri)?.use { input ->
            destFile.outputStream().use { output -> input.copyTo(output) }
            true
        } ?: false
        return if (ok) destFile.absolutePath else null
    }
}
