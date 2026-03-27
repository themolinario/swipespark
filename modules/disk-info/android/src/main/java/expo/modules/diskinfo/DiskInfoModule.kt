package expo.modules.diskinfo

import android.os.StatFs
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DiskInfoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DiskInfo")

    Function("getDiskInfo") {
      val stat = StatFs(appContext.reactContext!!.filesDir.path)
      mapOf(
        "total" to stat.totalBytes,
        "available" to stat.availableBytes
      )
    }
  }
}
