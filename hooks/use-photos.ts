import {
  mediaLibraryService,
  PhotoAsset,
} from "@/services/media-library.service";
import { usePhotoStore } from "@/stores/photo-store";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_SIZE = 20;
const PRELOAD_THRESHOLD = 5;

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
  const { restoredPhotos, consumeRestoredPhotos, deletionPhotos } =
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

      while (newAssets.length < PRELOAD_THRESHOLD && hasNext) {
        const result = await mediaLibraryService.fetchPhotos(PAGE_SIZE, cursor);
        const state = usePhotoStore.getState();

        const validPhotos = result.assets.filter(
          (photo) =>
            !state.isPhotoKept(photo.id) &&
            !state.isPhotoMarkedForDeletion(photo.id),
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

  useEffect(() => {
    if (!hasPermission) return;

    const remainingPhotos = photos.length - currentIndex;
    if (remainingPhotos <= PRELOAD_THRESHOLD && hasNextPageRef.current) {
      fetchPhotos();
    }
  }, [currentIndex, photos.length, fetchPhotos]);

  const moveToNext = useCallback(() => {
    setCurrentIndex((prev) => Math.min(prev + 1, photos.length - 1));
  }, [photos.length]);

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
      setPhotos((prev) => prev.filter((photo) => !ids.includes(photo.id)));
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
