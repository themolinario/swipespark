import * as MediaLibrary from "expo-media-library";

export interface PhotoAsset {
  id: string;
  uri: string;
  filename: string;
  width: number;
  height: number;
  creationTime: number;
  modificationTime: number;
  mediaType: MediaLibrary.MediaTypeValue;
  duration: number;
}

export interface FetchPhotosResult {
  assets: PhotoAsset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
  totalCount: number;
}

class MediaLibraryService {
  private static instance: MediaLibraryService;

  private constructor() {}

  static getInstance(): MediaLibraryService {
    if (!MediaLibraryService.instance) {
      MediaLibraryService.instance = new MediaLibraryService();
    }
    return MediaLibraryService.instance;
  }

  async requestPermission(): Promise<boolean> {
    console.log("MediaLibraryService.requestPermission called");
    const result = await MediaLibrary.requestPermissionsAsync();
    console.log("Permission result:", result);
    return result.status === "granted";
  }

  async getPermissionStatus(): Promise<MediaLibrary.PermissionStatus> {
    const { status } = await MediaLibrary.getPermissionsAsync();
    return status;
  }

  async fetchPhotos(
    pageSize: number = 20,
    after?: string,
  ): Promise<FetchPhotosResult> {
    let { status } = await MediaLibrary.getPermissionsAsync();

    if (status !== "granted") {
      // Try requesting permission if not granted
      const permissionResult = await MediaLibrary.requestPermissionsAsync();
      status = permissionResult.status;

      if (status !== "granted") {
        throw new Error("Media Library permission is required");
      }
    }

    const result = await MediaLibrary.getAssetsAsync({
      first: pageSize,
      after,
      mediaType: [MediaLibrary.MediaType.photo],
      sortBy: [MediaLibrary.SortBy.creationTime],
    });

    return {
      assets: result.assets.map(this.mapAsset),
      endCursor: result.endCursor,
      hasNextPage: result.hasNextPage,
      totalCount: result.totalCount,
    };
  }

  async deleteAssets(assetIds: string[]): Promise<boolean> {
    const { status } = await MediaLibrary.getPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Media Library permission is required");
    }
    return await MediaLibrary.deleteAssetsAsync(assetIds);
  }

  async getAssetInfo(assetId: string): Promise<MediaLibrary.AssetInfo | null> {
    try {
      return await MediaLibrary.getAssetInfoAsync(assetId);
    } catch {
      return null;
    }
  }

  private mapAsset(asset: MediaLibrary.Asset): PhotoAsset {
    return {
      id: asset.id,
      uri: asset.uri,
      filename: asset.filename,
      width: asset.width,
      height: asset.height,
      creationTime: asset.creationTime,
      modificationTime: asset.modificationTime,
      mediaType: asset.mediaType,
      duration: asset.duration,
    };
  }
}

export const mediaLibraryService = MediaLibraryService.getInstance();
