import { PhotoAsset } from "@/services/media-library.service";
import { DuplicateGroup } from "@/utils/duplicate-detection";
import { useCallback, useRef, useState } from "react";
import { Dimensions, FlatList, View } from "react-native";
import { Gesture } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const DUPLICATES_PADDING = 20;
export const DUPLICATES_GROUP_PADDING = 12;
export const DUPLICATES_GROUP_BORDER = 1;
export const DUPLICATES_GAP = 3;
export const DUPLICATES_COLUMNS = 3;
export const DUPLICATES_PHOTO_SIZE = Math.floor(
  (Dimensions.get("window").width -
    DUPLICATES_PADDING * 2 -
    (DUPLICATES_GROUP_PADDING + DUPLICATES_GROUP_BORDER) * 2 -
    DUPLICATES_GAP * (DUPLICATES_COLUMNS - 1)) /
    DUPLICATES_COLUMNS,
);

interface UseDuplicatesPanSelectionProps {
  duplicateGroups: DuplicateGroup[];
  flatPhotos: PhotoAsset[];
  selectedIds: Set<string>;
  setSelectedIds: (updater: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export function useDuplicatesPanSelection({
  duplicateGroups,
  flatPhotos,
  selectedIds,
  setSelectedIds,
}: UseDuplicatesPanSelectionProps) {
  const insets = useSafeAreaInsets();
  const [isScrollingDisabled, setIsScrollingDisabled] = useState(false);

  const groupHeaderHeights = useRef<Map<string, number>>(new Map());
  const isDragging = useRef(false);
  const scrollOffset = useRef(0);
  const startDragIndex = useRef<number | null>(null);
  const lastToggledIndex = useRef<number | null>(null);
  const isSelectingRef = useRef(true);
  const flatListRef = useRef<FlatList>(null);
  const listStartY = useRef(0);
  const listContainerRef = useRef<View>(null);
  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTouchY = useRef(0);
  const currentTouchX = useRef(0);

  const onGroupHeaderLayout = useCallback((groupId: string, height: number) => {
    groupHeaderHeights.current.set(groupId, height);
  }, []);

  const getIndexFromCoordinates = useCallback(
    (x: number, y: number) => {
      const contentY = y + scrollOffset.current;
      if (contentY < 0) return null;

      const relativeX = x - DUPLICATES_PADDING - DUPLICATES_GROUP_BORDER - DUPLICATES_GROUP_PADDING;
      if (relativeX < 0) return null;

      let currentY = 0;
      let cumulativeIndex = 0;

      for (let i = 0; i < duplicateGroups.length; i++) {
        const group = duplicateGroups[i];
        const measuredHeaderH = groupHeaderHeights.current.get(group.id) ?? 39;
        const headerSpaceH = measuredHeaderH + 10;
        const headerOffset = DUPLICATES_GROUP_BORDER + DUPLICATES_GROUP_PADDING + headerSpaceH;
        const rows = Math.ceil(group.photos.length / DUPLICATES_COLUMNS);
        const photosHeight = rows * (DUPLICATES_PHOTO_SIZE + DUPLICATES_GAP);
        const groupHeight =
          DUPLICATES_GROUP_BORDER * 2 +
          DUPLICATES_GROUP_PADDING * 2 +
          headerSpaceH +
          photosHeight +
          24;
        const groupEnd = currentY + groupHeight - 24;

        if (contentY >= currentY && contentY < groupEnd) {
          const relativeY = contentY - currentY;
          if (relativeY < headerOffset) return null;

          const photoAreaY = relativeY - headerOffset;
          const row = Math.floor(photoAreaY / (DUPLICATES_PHOTO_SIZE + DUPLICATES_GAP));
          const col = Math.floor(relativeX / (DUPLICATES_PHOTO_SIZE + DUPLICATES_GAP));

          if (col < 0 || col >= DUPLICATES_COLUMNS) return null;

          const indexInGroup = row * DUPLICATES_COLUMNS + col;
          if (indexInGroup >= 0 && indexInGroup < group.photos.length) {
            return cumulativeIndex + indexInGroup;
          }
          return null;
        }

        cumulativeIndex += group.photos.length;
        currentY += groupHeight;
      }

      return null;
    },
    [duplicateGroups],
  );

  const handleDragUpdate = useCallback(
    (x: number, y: number) => {
      if (!isDragging.current) return;
      currentTouchX.current = x;
      currentTouchY.current = y;
      const currentIndex = getIndexFromCoordinates(x, y);
      if (
        currentIndex !== null &&
        currentIndex !== lastToggledIndex.current &&
        startDragIndex.current !== null
      ) {
        const minIdx = Math.min(startDragIndex.current, currentIndex);
        const maxIdx = Math.max(startDragIndex.current, currentIndex);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          for (let i = minIdx; i <= maxIdx; i++) {
            const p = flatPhotos[i];
            if (p) {
              if (isSelectingRef.current) next.add(p.id);
              else next.delete(p.id);
            }
          }
          return next;
        });
        lastToggledIndex.current = currentIndex;
      }
    },
    [getIndexFromCoordinates, flatPhotos, setSelectedIds],
  );

  const handleDragStart = useCallback(
    (x: number, y: number) => {
      isDragging.current = true;
      setIsScrollingDisabled(true);
      const index = getIndexFromCoordinates(x, y);
      if (index !== null && flatPhotos[index]) {
        startDragIndex.current = index;
        lastToggledIndex.current = index;
        const photo = flatPhotos[index];
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(photo.id)) {
            newSet.delete(photo.id);
            isSelectingRef.current = false;
          } else {
            newSet.add(photo.id);
            isSelectingRef.current = true;
          }
          return newSet;
        });
      }
    },
    [getIndexFromCoordinates, flatPhotos, setSelectedIds],
  );

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
    setIsScrollingDisabled(false);
    startDragIndex.current = null;
    lastToggledIndex.current = null;
    if (scrollTimer.current) {
      clearInterval(scrollTimer.current);
      scrollTimer.current = null;
    }
  }, []);

  const autoScroll = useCallback(() => {
    if (!isDragging.current || !flatListRef.current) return;
    const y = currentTouchY.current;
    const x = currentTouchX.current;
    const SCROLL_ZONE = 80;
    const SCROLL_SPEED = 15;
    const listHeight =
      Dimensions.get("window").height - listStartY.current - insets.top;
    if (y < SCROLL_ZONE) {
      const newOffset = Math.max(0, scrollOffset.current - SCROLL_SPEED);
      flatListRef.current.scrollToOffset({ offset: newOffset, animated: false });
      handleDragUpdate(x, y - SCROLL_SPEED);
    } else if (y > listHeight - SCROLL_ZONE) {
      const newOffset = scrollOffset.current + SCROLL_SPEED;
      flatListRef.current.scrollToOffset({ offset: newOffset, animated: false });
      handleDragUpdate(x, y + SCROLL_SPEED);
    }
  }, [handleDragUpdate, insets.top]);

  const panGesture = Gesture.Pan()
    .enabled(true)
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .runOnJS(true)
    .onStart((e: any) => {
      handleDragStart(e.x, e.y);
      if (!scrollTimer.current) {
        scrollTimer.current = setInterval(autoScroll, 16);
      }
    })
    .onUpdate((e: any) => handleDragUpdate(e.x, e.y))
    .onEnd(() => handleDragEnd())
    .onFinalize(() => handleDragEnd());

  return {
    isScrollingDisabled,
    flatListRef,
    listContainerRef,
    listStartY,
    scrollOffset,
    panGesture,
    onGroupHeaderLayout,
  };
}
