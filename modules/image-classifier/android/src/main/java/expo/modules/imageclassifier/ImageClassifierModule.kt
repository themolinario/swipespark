package expo.modules.imageclassifier

import android.content.ContentResolver
import android.net.Uri
import android.provider.MediaStore
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.label.ImageLabeling
import com.google.mlkit.vision.label.defaults.ImageLabelerOptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.*
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class ImageClassifierModule : Module() {

  private fun getSingleAssetSize(uriString: String, contentResolver: ContentResolver): Long {
    val uri = Uri.parse(uriString)
    var size: Long = 0

    when (uri.scheme) {
      "file" -> {
        val file = java.io.File(uri.path!!)
        if (file.exists()) {
          size = file.length()
        }

        if (size <= 0L) {
          try {
            val projection = arrayOf(MediaStore.MediaColumns.SIZE)
            val selection = "${MediaStore.MediaColumns.DATA} = ?"
            val selectionArgs = arrayOf(uri.path!!)

            contentResolver.query(
              MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
              projection, selection, selectionArgs, null
            )?.use { cursor ->
              if (cursor.moveToFirst()) {
                val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                if (sizeIndex != -1) size = cursor.getLong(sizeIndex)
              }
            }

            if (size <= 0L) {
              contentResolver.query(
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                projection, selection, selectionArgs, null
              )?.use { cursor ->
                if (cursor.moveToFirst()) {
                  val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                  if (sizeIndex != -1) size = cursor.getLong(sizeIndex)
                }
              }
            }
          } catch (_: Exception) {}
        }
      }
      "content" -> {
        // Strategia 1: query diretta sulla URI con MediaStore.MediaColumns.SIZE
        try {
          val projection = arrayOf(MediaStore.MediaColumns.SIZE)
          contentResolver.query(uri, projection, null, null, null)?.use { cursor ->
            if (cursor.moveToFirst()) {
              val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
              if (sizeIndex != -1) {
                size = cursor.getLong(sizeIndex)
              }
            }
          }
        } catch (_: Exception) {}

        // Strategia 2: estrai l'ID numerico dalla URI e interroga MediaStore direttamente
        if (size <= 0) {
          try {
            val lastSegment = uri.lastPathSegment
            val assetId = lastSegment?.toLongOrNull()
            if (assetId != null) {
              val projection = arrayOf(MediaStore.MediaColumns.SIZE)
              val selection = "${MediaStore.MediaColumns._ID} = ?"
              val selectionArgs = arrayOf(assetId.toString())

              // Prova Images
              contentResolver.query(
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                projection, selection, selectionArgs, null
              )?.use { cursor ->
                if (cursor.moveToFirst()) {
                  val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                  if (sizeIndex != -1) {
                    size = cursor.getLong(sizeIndex)
                  }
                }
              }

              // Prova Video se non trovato
              if (size <= 0) {
                contentResolver.query(
                  MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                  projection, selection, selectionArgs, null
                )?.use { cursor ->
                  if (cursor.moveToFirst()) {
                    val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                    if (sizeIndex != -1) {
                      size = cursor.getLong(sizeIndex)
                    }
                  }
                }
              }

              // Prova Files come ulteriore fallback
              if (size <= 0) {
                contentResolver.query(
                  MediaStore.Files.getContentUri("external"),
                  projection, selection, selectionArgs, null
                )?.use { cursor ->
                  if (cursor.moveToFirst()) {
                    val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                    if (sizeIndex != -1) {
                      size = cursor.getLong(sizeIndex)
                    }
                  }
                }
              }
            }
          } catch (_: Exception) {}
        }

        // Strategia 3: file descriptor come ultimo fallback
        if (size <= 0) {
          try {
            contentResolver.openFileDescriptor(uri, "r")?.use { fd ->
              size = fd.statSize
            }
          } catch (_: Exception) {}
        }
      }
      else -> {
        // Nessun scheme: tratta come ID numerico di MediaStore
        try {
          val assetId = uriString.toLongOrNull()
          if (assetId != null) {
            val projection = arrayOf(MediaStore.MediaColumns.SIZE)
            val selection = "${MediaStore.MediaColumns._ID} = ?"
            val selectionArgs = arrayOf(assetId.toString())

            // Prova Images
            contentResolver.query(
              MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
              projection, selection, selectionArgs, null
            )?.use { cursor ->
              if (cursor.moveToFirst()) {
                val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                if (sizeIndex != -1) {
                  size = cursor.getLong(sizeIndex)
                }
              }
            }

            // Prova Video
            if (size <= 0) {
              contentResolver.query(
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                projection, selection, selectionArgs, null
              )?.use { cursor ->
                if (cursor.moveToFirst()) {
                  val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                  if (sizeIndex != -1) {
                    size = cursor.getLong(sizeIndex)
                  }
                }
              }
            }

            // Prova Files
            if (size <= 0) {
              contentResolver.query(
                MediaStore.Files.getContentUri("external"),
                projection, selection, selectionArgs, null
              )?.use { cursor ->
                if (cursor.moveToFirst()) {
                  val sizeIndex = cursor.getColumnIndex(MediaStore.MediaColumns.SIZE)
                  if (sizeIndex != -1) {
                    size = cursor.getLong(sizeIndex)
                  }
                }
              }
            }
          }
        } catch (_: Exception) {}
      }
    }

    return size
  }
  override fun definition() = ModuleDefinition {
    Name("ImageClassifier")

    AsyncFunction("classifyImage") { uriString: String, promise: Promise ->
      try {
        val uri = Uri.parse(uriString)
        val context = appContext.reactContext ?: throw Exception("React context not available")
        val image = InputImage.fromFilePath(context, uri)
        val options = ImageLabelerOptions.Builder()
          .setConfidenceThreshold(0.3f)
          .build()
        val labeler = ImageLabeling.getClient(options)

        labeler.process(image)
          .addOnSuccessListener { labels ->
            val result = labels.map { it.text }
            promise.resolve(result)
          }
          .addOnFailureListener { e ->
            promise.reject("CLASSIFICATION_ERROR", e.message ?: "Unknown error", e)
          }
      } catch (e: Exception) {
        promise.reject("CLASSIFICATION_ERROR", e.message ?: "Unknown error", e)
      }
    }

    AsyncFunction("classifyImages") { uriStrings: List<String>, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("CONTEXT_ERROR", "React context not available", null)
        return@AsyncFunction
      }

      CoroutineScope(Dispatchers.Default).launch {
        try {
          val options = ImageLabelerOptions.Builder()
            .setConfidenceThreshold(0.3f)
            .build()

          // Process in parallel with limited concurrency
          val semaphore = kotlinx.coroutines.sync.Semaphore(8)
          val results = uriStrings.map { uriString ->
            async {
              semaphore.acquire()
              try {
                val uri = Uri.parse(uriString)
                val image = InputImage.fromFilePath(context, uri)
                val labeler = ImageLabeling.getClient(options)

                val labels = suspendCancellableCoroutine<List<Map<String, Any>>> { cont ->
                  labeler.process(image)
                    .addOnSuccessListener { mlLabels ->
                      val labelList = mlLabels.map { label ->
                        mapOf(
                          "identifier" to label.text as Any,
                          "confidence" to label.confidence.toDouble() as Any
                        )
                      }
                      cont.resume(labelList)
                    }
                    .addOnFailureListener {
                      cont.resume(emptyList())
                    }
                }

                mapOf(
                  "uri" to uriString as Any,
                  "labels" to labels as Any
                )
              } catch (_: Exception) {
                mapOf(
                  "uri" to uriString as Any,
                  "labels" to emptyList<Map<String, Any>>() as Any
                )
              } finally {
                semaphore.release()
              }
            }
          }.awaitAll()

          promise.resolve(results)
        } catch (e: Exception) {
          promise.reject("BATCH_CLASSIFY_ERROR", e.message ?: "Unknown error", e)
        }
      }
    }

    AsyncFunction("getAssetsSize") { uriStrings: List<String>, promise: Promise ->
      try {
        var totalSize: Double = 0.0
        val context = appContext.reactContext ?: throw Exception("React context not available")
        val contentResolver = context.contentResolver

        for (uriString in uriStrings) {
          try {
            val size = getSingleAssetSize(uriString, contentResolver)
            totalSize += size.toDouble()
          } catch (_: Exception) {
            // Ignore individual file errors and continue
          }
        }
        promise.resolve(totalSize)
      } catch (e: Exception) {
        promise.reject("GET_SIZE_ERROR", e.message ?: "Unknown error", e)
      }
    }

    AsyncFunction("getAssetsSizeByIds") { assetIds: List<String>, promise: Promise ->
      try {
        var totalSize: Double = 0.0
        val context = appContext.reactContext ?: throw Exception("React context not available")
        val contentResolver = context.contentResolver

        for (assetId in assetIds) {
          try {
            val size = getSingleAssetSize(assetId, contentResolver)
            totalSize += size.toDouble()
          } catch (_: Exception) {
            // Ignore individual file errors and continue
          }
        }
        promise.resolve(totalSize)
      } catch (e: Exception) {
        promise.reject("GET_SIZE_ERROR", e.message ?: "Unknown error", e)
      }
    }

    AsyncFunction("startNativeScan") { category: String, customQuery: String, promise: Promise ->
      // Stub for Android: background scan is not implemented natively yet.
      promise.resolve(mapOf(
        "notificationPermission" to "undetermined",
        "mediaPermissionDenied" to false
      ))
    }

    Function("stopNativeScan") {
      // Stub
    }

    AsyncFunction("getNativeScanState") { promise: Promise ->
      promise.resolve(mapOf(
        "isRunning" to false,
        "isComplete" to false,
        "matchedIds" to emptyList<String>()
      ))
    }

    AsyncFunction("getAssetsByLocalIds") { ids: List<String>, promise: Promise ->
      // Stub -> return empty list
      promise.resolve(emptyList<Map<String, Any>>())
    }

    AsyncFunction("requestNotificationPermission") { promise: Promise ->
      promise.resolve("undetermined")
    }
  }
}
