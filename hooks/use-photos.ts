import {
  mediaLibraryService,
  PhotoAsset,
} from "@/services/media-library.service";
import { usePhotoStore } from "@/stores/photo-store";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

const PAGE_SIZE = 20;
const PRELOAD_THRESHOLD = 5;
const KEEP_BEHIND = 3;

interface UsePhotosState {
  photos: PhotoAsset[];
  isLoading: boolean;
  hasPermission: boolean | null;
  permissionDenied: boolean;
  currentIndex: number;
  totalCount: number;
  deletedCount: number;
}

interface UsePhotosActions {
  requestPermission: () => Promise<void>;
  markForDeletion: (id: string) => void;
  keepPhoto: () => void;
  confirmDeletion: () => Promise<boolean>;
  undoLastDeletion: () => void;
}

export function usePhotos(): UsePhotosState & UsePhotosActions {
  const [photos, setPhotos] = useState<PhotoAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { restoredPhotos, consumeRestoredPhotos, deletionPhotos, deletionVersion } =
    usePhotoStore();

  const endCursorRef = useRef<string | undefined>(undefined);
  const hasNextPageRef = useRef(true);
  const isFetchingRef = useRef(false);

  const fetchPhotos = useCallback(async (reset: boolean = false) => {
    if (isFetchingRef.current) return;
    if (!reset && !hasNextPageRef.current) return;

    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      let cursor = reset ? undefined : endCursorRef.current;
      let newAssets: PhotoAsset[] = [];
      let currentTotalCount = 0;
      let hasNext = true;

      const storeState = usePhotoStore.getState();
      const keptIds = new Set(storeState.keptPhotos.map((p) => p.id));
      const deletionIds = new Set(storeState.deletionPhotos.map((p) => p.id));

      while (newAssets.length < PRELOAD_THRESHOLD && hasNext) {
        const result = await mediaLibraryService.fetchPhotos(PAGE_SIZE, cursor);

        const validPhotos = result.assets.filter(
          (photo) => !keptIds.has(photo.id) && !deletionIds.has(photo.id),
        );

        newAssets = [...newAssets, ...validPhotos];
        currentTotalCount = result.totalCount;
        cursor = result.endCursor;
        hasNext = result.hasNextPage;
      }

      setPhotos((prev) => (reset ? newAssets : [...prev, ...newAssets]));
      if (currentTotalCount > 0) {
        setTotalCount((prev) => (reset ? currentTotalCount : prev));
      }
      endCursorRef.current = cursor;
      hasNextPageRef.current = hasNext;
    } catch (error) {
      console.warn("Failed to fetch photos:", error);
      setHasPermission(false);
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    console.log("requestPermission called");
    try {
      const granted = await mediaLibraryService.requestPermission();
      console.log("Permission granted:", granted);
      setHasPermission(granted);
      setPermissionDenied(!granted);
      if (granted) {
        await fetchPhotos(true);
      }
    } catch (error) {
      console.error("requestPermission error:", error);
      setPermissionDenied(true);
    }
  }, [fetchPhotos]);

  const checkPermissionAndLoad = useCallback(async () => {
    const status = await mediaLibraryService.getPermissionStatus();
    console.log("Permission status:", status);
    if (status === "granted") {
      setHasPermission(true);
      setPermissionDenied(false);
      try {
        await fetchPhotos(true);
      } catch (error) {
        console.warn(
          "Permission check failed, requesting new permission:",
          error,
        );
        const granted = await mediaLibraryService.requestPermission();
        setHasPermission(granted);
        setPermissionDenied(!granted);
        if (granted) {
          await fetchPhotos(true);
        }
      }
    } else if (status === "undetermined") {
      setHasPermission(null);
      setPermissionDenied(false);
    } else {
      // 'denied' or 'limited'
      setHasPermission(false);
      setPermissionDenied(status === "denied");
    }
  }, [fetchPhotos]);

  useEffect(() => {
    checkPermissionAndLoad();
  }, [checkPermissionAndLoad]);

  // Re-fetch photos when the app returns to foreground (e.g. after taking photos with the camera)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        hasPermission
      ) {
        console.log("App returned to foreground, refreshing photos...");
        setCurrentIndex(0);
        endCursorRef.current = undefined;
        hasNextPageRef.current = true;
        isFetchingRef.current = false;
        fetchPhotos(true);
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [hasPermission, fetchPhotos]);

  useEffect(() => {
    if (restoredPhotos.length > 0) {
      const newPhotos = consumeRestoredPhotos();
      if (newPhotos.length === 0) return;

      let shift = 0;
      let newArray = [...photos];

      newPhotos.forEach((restored) => {
        const idx = newArray.findIndex((p) => p.id === restored.id);
        if (idx !== -1) {
          if (idx < currentIndex) {
            shift++;
          }
          newArray.splice(idx, 1);
        }
      });

      const insertAt = Math.max(0, currentIndex - shift);
      newArray.splice(insertAt, 0, ...newPhotos);

      setPhotos(newArray);
      if (shift > 0) {
        setCurrentIndex((prev) => Math.max(0, prev - shift));
      }
    }
  }, [restoredPhotos, consumeRestoredPhotos, photos, currentIndex]);

  // When photos are permanently deleted elsewhere (delete tab, duplicates, smart clean),
  // reload the photo list from scratch so index stays in sync.
  const prevDeletionVersion = useRef(0);
  useEffect(() => {
    if (deletionVersion > prevDeletionVersion.current) {
      prevDeletionVersion.current = deletionVersion;
      if (hasPermission) {
        setCurrentIndex(0);
        endCursorRef.current = undefined;
        hasNextPageRef.current = true;
        fetchPhotos(true);
      }
    }
  }, [deletionVersion, hasPermission, fetchPhotos]);

  useEffect(() => {
    if (!hasPermission) return;

    const remainingPhotos = photos.length - currentIndex;
    if (remainingPhotos <= PRELOAD_THRESHOLD && hasNextPageRef.current) {
      fetchPhotos();
    }
  }, [currentIndex, photos.length, fetchPhotos]);

  const moveToNext = useCallback(() => {
    if (currentIndex > KEEP_BEHIND) {
      const trimCount = currentIndex - KEEP_BEHIND;
      setPhotos((prev) => prev.slice(trimCount));
      setCurrentIndex((prev) => Math.min(prev + 1, photos.length) - trimCount);
    } else {
      setCurrentIndex((prev) => Math.min(prev + 1, photos.length));
    }
  }, [currentIndex, photos.length]);

  const markForDeletion = useCallback(
    (id: string) => {
      moveToNext();
    },
    [moveToNext],
  );

  const keepPhoto = useCallback(() => {
    moveToNext();
  }, [moveToNext]);

  const confirmDeletion = useCallback(async (): Promise<boolean> => {
    const ids = deletionPhotos.map((p) => p.id);
    if (ids.length === 0) return true;

    const success = await mediaLibraryService.deleteAssets(ids);
    if (success) {
      const idsSet = new Set(ids);
      setPhotos((prev) => prev.filter((photo) => !idsSet.has(photo.id)));
      setCurrentIndex(0);
      endCursorRef.current = undefined;
      hasNextPageRef.current = true;
      await fetchPhotos(true);
    }
    return success;
  }, [deletionPhotos, fetchPhotos]);

  const undoLastDeletion = useCallback(() => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  }, []);

  return {
    photos,
    isLoading,
    hasPermission,
    permissionDenied,
    currentIndex,
    totalCount,
    deletedCount: deletionPhotos.length,
    requestPermission,
    markForDeletion,
    keepPhoto,
    confirmDeletion,
    undoLastDeletion,
  };
}
