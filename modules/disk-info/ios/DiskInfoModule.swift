import ExpoModulesCore
import Foundation

public class DiskInfoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DiskInfo")

    Function("getDiskInfo") { () -> [String: Int64] in
      guard let attributes = try? FileManager.default.attributesOfFileSystem(
        forPath: NSHomeDirectory()
      ) else {
        return ["total": 0, "available": 0]
      }
      let total = attributes[.systemSize] as? Int64 ?? 0
      let available = attributes[.systemFreeSize] as? Int64 ?? 0
      return ["total": total, "available": available]
    }
  }
}
