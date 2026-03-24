package expo.modules.duplicatedetector

import android.content.ContentUris
import android.provider.MediaStore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.Promise
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Semaphore
import java.security.MessageDigest

class DuplicateDetectorModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("DuplicateDetector")

    Events("onProgress")

    AsyncFunction("computeHashes") { assetIds: List<String>, promise: Promise ->
      val context = appContext.reactContext ?: run {
        promise.reject("CONTEXT_ERROR", "React context not available", null)
        return@AsyncFunction
      }

      val contentResolver = context.contentResolver
      val total = assetIds.size

      if (total == 0) {
        promise.resolve(emptyMap<String, String>())
        return@AsyncFunction
      }

      CoroutineScope(Dispatchers.Default).launch {
        try {
          val results = java.util.concurrent.ConcurrentHashMap<String, String>(total)
          val completed = java.util.concurrent.atomic.AtomicInteger(0)
          val semaphore = Semaphore(20)

          val jobs = assetIds.map { assetId ->
            async {
              semaphore.acquire()
              try {
                val numericId = assetId.toLongOrNull()
                if (numericId == null) {
                  val c = completed.incrementAndGet()
                  if (c % 50 == 0 || c == total) {
                    sendEvent("onProgress", mapOf("completed" to c, "total" to total))
                  }
                  return@async
                }

                val uri = ContentUris.withAppendedId(
                  MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                  numericId
                )

                var hash: String? = null

                try {
                  contentResolver.openInputStream(uri)?.use { inputStream ->
                    val digest = MessageDigest.getInstance("SHA-256")
                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    while (inputStream.read(buffer).also { bytesRead = it } != -1) {
                      digest.update(buffer, 0, bytesRead)
                    }
                    hash = digest.digest().joinToString("") { "%02x".format(it) }
                  }
                } catch (_: Exception) {}

                if (hash == null) {
                  try {
                    val projection = arrayOf(MediaStore.MediaColumns.DATA)
                    val selection = "${MediaStore.MediaColumns._ID} = ?"
                    val selectionArgs = arrayOf(numericId.toString())

                    contentResolver.query(
                      MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                      projection, selection, selectionArgs, null
                    )?.use { cursor ->
                      if (cursor.moveToFirst()) {
                        val dataIndex = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)
                        if (dataIndex != -1) {
                          val filePath = cursor.getString(dataIndex)
                          if (filePath != null) {
                            val file = java.io.File(filePath)
                            if (file.exists()) {
                              file.inputStream().use { fis ->
                                val digest = MessageDigest.getInstance("SHA-256")
                                val buffer = ByteArray(8192)
                                var bytesRead: Int
                                while (fis.read(buffer).also { bytesRead = it } != -1) {
                                  digest.update(buffer, 0, bytesRead)
                                }
                                hash = digest.digest().joinToString("") { "%02x".format(it) }
                              }
                            }
                          }
                        }
                      }
                    }
                  } catch (_: Exception) {}
                }

                if (hash != null) {
                  results[assetId] = hash!!
                }

                val c = completed.incrementAndGet()
                if (c % 50 == 0 || c == total) {
                  sendEvent("onProgress", mapOf("completed" to c, "total" to total))
                }
              } finally {
                semaphore.release()
              }
            }
          }

          jobs.awaitAll()
          promise.resolve(results.toMap())
        } catch (e: Exception) {
          promise.reject("HASH_ERROR", e.message ?: "Unknown error", e)
        }
      }
    }
  }
}

