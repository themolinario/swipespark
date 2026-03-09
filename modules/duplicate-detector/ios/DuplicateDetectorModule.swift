import ExpoModulesCore
import Photos
import CryptoKit

public class DuplicateDetectorModule: Module {

  public func definition() -> ModuleDefinition {
    Name("DuplicateDetector")

    Events("onProgress")

    AsyncFunction("computeHashes") { (assetIds: [String], promise: Promise) in
      DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        guard let self = self else {
          promise.reject("MODULE_DEALLOCATED", "Module was deallocated")
          return
        }

        let total = assetIds.count
        if total == 0 {
          promise.resolve([:] as [String: String])
          return
        }

        var results = [String: String](minimumCapacity: total)
        let lock = NSLock()
        let group = DispatchGroup()
        let semaphore = DispatchSemaphore(value: 10)
        var completed = 0

        let fetchResult = PHAsset.fetchAssets(withLocalIdentifiers: assetIds, options: nil)

        var assetMap = [String: PHAsset](minimumCapacity: fetchResult.count)
        fetchResult.enumerateObjects { (asset, _, _) in
          assetMap[asset.localIdentifier] = asset
        }

        let imageManager = PHImageManager.default()
        let requestOptions = PHImageRequestOptions()
        requestOptions.isSynchronous = true
        requestOptions.isNetworkAccessAllowed = false
        requestOptions.version = .current
        requestOptions.deliveryMode = .highQualityFormat

        for assetId in assetIds {
          group.enter()
          semaphore.wait()

          DispatchQueue.global(qos: .userInitiated).async {
            defer {
              semaphore.signal()
              group.leave()
            }

            guard let asset = assetMap[assetId] else {
              lock.lock()
              completed += 1
              let c = completed
              lock.unlock()
              if c % 50 == 0 || c == total {
                self.sendEvent("onProgress", ["completed": c, "total": total])
              }
              return
            }

            var hashString: String? = nil

            let resources = PHAssetResource.assetResources(for: asset)
            let primaryResource = resources.first(where: { $0.type == .photo })
              ?? resources.first(where: { $0.type == .fullSizePhoto })
              ?? resources.first

            if let resource = primaryResource {
              let dataSemaphore = DispatchSemaphore(value: 0)
              var allData = Data()

              let resourceOptions = PHAssetResourceRequestOptions()
              resourceOptions.isNetworkAccessAllowed = false

              PHAssetResourceManager.default().requestData(
                for: resource,
                options: resourceOptions,
                dataReceivedHandler: { chunk in
                  allData.append(chunk)
                },
                completionHandler: { error in
                  if error == nil && !allData.isEmpty {
                    let digest = SHA256.hash(data: allData)
                    hashString = digest.map { String(format: "%02x", $0) }.joined()
                  }
                  dataSemaphore.signal()
                }
              )

              dataSemaphore.wait()
            }

            if hashString == nil {
              imageManager.requestImageDataAndOrientation(
                for: asset,
                options: requestOptions
              ) { data, _, _, _ in
                if let data = data, !data.isEmpty {
                  let digest = SHA256.hash(data: data)
                  hashString = digest.map { String(format: "%02x", $0) }.joined()
                }
              }
            }

            lock.lock()
            if let hash = hashString {
              results[assetId] = hash
            }
            completed += 1
            let c = completed
            lock.unlock()

            if c % 50 == 0 || c == total {
              self.sendEvent("onProgress", ["completed": c, "total": total])
            }
          }
        }

        group.wait()
        promise.resolve(results)
      }
    }
  }
}

