import ExpoModulesCore
import Vision
import Photos
import UIKit

public class ImageClassifierModule: Module {

  private func extractLocalIdentifier(from uriString: String) -> String? {
    if uriString.hasPrefix("ph://") {
      return String(uriString.dropFirst(5))
    }

    guard let url = URL(string: uriString),
          url.scheme == "assets-library" || url.scheme == "asset-library",
          let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
          let idParam = components.queryItems?.first(where: { $0.name == "id" }) else {
      return nil
    }
    return idParam.value
  }

  private func loadCGImage(from uriString: String) -> CGImage? {
    if let localIdentifier = extractLocalIdentifier(from: uriString) {
      let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil)
      guard let asset = fetchResult.firstObject else { return nil }

      let options = PHImageRequestOptions()
      options.isSynchronous = true
      options.deliveryMode = .highQualityFormat
      options.isNetworkAccessAllowed = true
      options.resizeMode = .fast

      var cgImage: CGImage? = nil
      PHImageManager.default().requestImage(
        for: asset,
        targetSize: CGSize(width: 512, height: 512),
        contentMode: .aspectFit,
        options: options
      ) { image, _ in
        cgImage = image?.cgImage
      }
      return cgImage
    }

    guard let url = URL(string: uriString),
          let data = try? Data(contentsOf: url),
          let uiImage = UIImage(data: data) else { return nil }
    return uiImage.cgImage
  }

  private func classifySingleImage(_ uriString: String) -> [[String: Any]] {
    guard let cgImage = loadCGImage(from: uriString) else { return [] }

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    var resultLabels: [[String: Any]] = []

    let request = VNClassifyImageRequest { request, error in
      guard error == nil,
            let observations = request.results as? [VNClassificationObservation] else { return }
      resultLabels = observations
        .filter { $0.confidence > 0.3 }
        .prefix(10)
        .map { ["identifier": $0.identifier, "confidence": Double($0.confidence)] }
    }

    do {
      try handler.perform([request])
    } catch { }

    return resultLabels
  }

  public func definition() -> ModuleDefinition {
    Name("ImageClassifier")

    AsyncFunction("classifyImage") { (uriString: String, promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        let labels = self.classifySingleImage(uriString)
        let identifiers = labels.compactMap { $0["identifier"] as? String }
        promise.resolve(identifiers)
      }
    }

    AsyncFunction("classifyImages") { (uriStrings: [String], promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async {
        let maxConcurrency = 8
        let semaphore = DispatchSemaphore(value: maxConcurrency)
        let group = DispatchGroup()
        let lock = NSLock()
        var results: [[String: Any]] = Array(repeating: [:], count: uriStrings.count)

        for (index, uriString) in uriStrings.enumerated() {
          group.enter()
          semaphore.wait()

          DispatchQueue.global(qos: .userInitiated).async {
            defer {
              semaphore.signal()
              group.leave()
            }

            let labels = self.classifySingleImage(uriString)
            let entry: [String: Any] = ["uri": uriString, "labels": labels]
            lock.lock()
            results[index] = entry
            lock.unlock()
          }
        }

        group.wait()
        promise.resolve(results)
      }
    }

    AsyncFunction("getAssetsSize") { (uriStrings: [String], promise: Promise) in
      var totalSize: Double = 0

      for uriString in uriStrings {
        if let localIdentifier = self.extractLocalIdentifier(from: uriString) {
          let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [localIdentifier], options: nil)
          if let asset = fetchResult.firstObject {
            let resources = PHAssetResource.assetResources(for: asset)
            let primaryResource = resources.first(where: { $0.type == .photo }) ?? resources.first
            if let resource = primaryResource,
               let fileSize = resource.value(forKey: "fileSize") as? Int64 {
              totalSize += Double(fileSize)
            }
          }
        } else if let url = URL(string: uriString) {
          do {
            let resources = try url.resourceValues(forKeys: [.fileSizeKey])
            if let fileSize = resources.fileSize {
              totalSize += Double(fileSize)
            }
          } catch { }
        }
      }

      promise.resolve(totalSize)
    }

    AsyncFunction("getAssetsSizeByIds") { (ids: [String], promise: Promise) in
      var totalSize: Double = 0

      let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: ids, options: nil)
      fetchResult.enumerateObjects { (asset, _, _) in
        let resources = PHAssetResource.assetResources(for: asset)
        let primaryResource = resources.first(where: { $0.type == .photo }) ?? resources.first
        if let resource = primaryResource,
           let fileSize = resource.value(forKey: "fileSize") as? Int64 {
          totalSize += Double(fileSize)
        }
      }

      promise.resolve(totalSize)
    }
  }
}
