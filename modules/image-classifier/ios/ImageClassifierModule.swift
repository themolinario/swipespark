import ExpoModulesCore
import Vision
import CoreImage
import Photos

public class ImageClassifierModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ImageClassifier")

    AsyncFunction("classifyImage") { (uriString: String, promise: Promise) in
      guard let url = URL(string: uriString),
            let ciImage = CIImage(contentsOf: url) else {
        promise.reject("INVALID_URI", "Cannot read image at URI")
        return
      }

      let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
      let request = VNClassifyImageRequest { request, error in
        if let error = error {
          promise.reject("CLASSIFY_ERROR", error.localizedDescription)
          return
        }

        guard let observations = request.results as? [VNClassificationObservation] else {
          promise.resolve([])
          return
        }

        let labels = observations
          .filter { $0.confidence > 0.5 }
          .map { $0.identifier }

        promise.resolve(labels)
      }

      do {
        try handler.perform([request])
      } catch {
        promise.reject("PERFORM_ERROR", error.localizedDescription)
      }
    }

    AsyncFunction("getAssetsSize") { (uriStrings: [String], promise: Promise) in
      var totalSize: Double = 0

      for uriString in uriStrings {
        guard let url = URL(string: uriString) else { continue }

        // Estrai il localIdentifier dall'URI ph:// o asset-library://
        var localIdentifier: String? = nil

        if url.scheme == "ph" {
          // formato: ph://XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
          localIdentifier = url.host
        } else if url.scheme == "assets-library" || url.scheme == "asset-library" {
          // formato: assets-library://asset/asset.JPG?id=XXXXXXXX-...&ext=JPG
          if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
             let idParam = components.queryItems?.first(where: { $0.name == "id" }) {
            localIdentifier = idParam.value
          }
        }

        if let identifier = localIdentifier {
          let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil)
          if let asset = fetchResult.firstObject {
            let resources = PHAssetResource.assetResources(for: asset)
            // Prendi la risorsa principale (foto originale)
            let primaryResource = resources.first(where: { $0.type == .photo }) ?? resources.first
            if let resource = primaryResource,
               let fileSize = resource.value(forKey: "fileSize") as? Int64 {
              totalSize += Double(fileSize)
            }
          }
        } else {
          // fallback per URI file://
          do {
            let resources = try url.resourceValues(forKeys: [.fileSizeKey])
            if let fileSize = resources.fileSize {
              totalSize += Double(fileSize)
            }
          } catch {
            print("Error getting size for \(uriString): \(error.localizedDescription)")
          }
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
