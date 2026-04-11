import { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, View } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface UsePanGestureSelectionProps<T> {
  items: T[];
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>> | ((idsOrUpdater: Set<string> | ((prev: Set<string>) => Set<string>)) => void);
  isSelectMode: boolean;
  columnCount: number;
  gap: number;
  itemSize: number;
}

export function usePanGestureSelection<T extends { id: string }>({
  items,
  selectedIds,
  setSelectedIds,
  isSelectMode,
  columnCount,
  gap,
  itemSize,
}: UsePanGestureSelectionProps<T>) {
  const insets = useSafeAreaInsets();
  const [isScrollingDisabled, setIsScrollingDisabled] = useState(false);

  const isDragging = useRef(false);
  const scrollOffset = useRef(0);
  const startDragIndex = useRef<number | null>(null);
  const lastToggledIndex = useRef<number | null>(null);
  const isSelectingRef = useRef(true);
  const flatListRef = useRef<FlatList>(null);
  const listStartY = useRef(0);
  const listContainerRef = useRef<View>(null);

  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTouchY = useRef<number>(0);
  const currentTouchX = useRef<number>(0);

  const getIndexFromCoordinates = useCallback(
    (x: number, y: number) => {
      const contentY = y + scrollOffset.current;
      if (contentY < 0) return null;
      const relativeX = x - gap;
      if (relativeX < 0) return null;
      const row = Math.floor(contentY / (itemSize + gap));
      const col = Math.floor(relativeX / (itemSize + gap));
      if (col >= columnCount) return null;
      const index = row * columnCount + col;
      return index >= 0 && index < items.length ? index : null;
    },
    [items.length, gap, itemSize, columnCount]
  );

  const handleDragStart = useCallback(
    (x: number, y: number) => {
      isDragging.current = true;
      setIsScrollingDisabled(true);
      const index = getIndexFromCoordinates(x, y);
      if (index !== null) {
        startDragIndex.current = index;
        lastToggledIndex.current = index;
        const item = items[index];
        setSelectedIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(item.id)) {
            newSet.delete(item.id);
            isSelectingRef.current = false;
          } else {
            newSet.add(item.id);
            isSelectingRef.current = true;
          }
          return newSet;
        });
      }
    },
    [getIndexFromCoordinates, items, setSelectedIds]
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
            const p = items[i];
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
    [getIndexFromCoordinates, items, setSelectedIds]
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
    .enabled(isSelectMode)
    .activeOffsetX([-10, 10])
    .failOffsetY([-20, 20])
    .runOnJS(true)
    .onStart((e) => {
      handleDragStart(e.x, e.y);
      if (!scrollTimer.current) {
        scrollTimer.current = setInterval(autoScroll, 16);
      }
    })
    .onUpdate((e) => handleDragUpdate(e.x, e.y))
    .onEnd(() => handleDragEnd())
    .onFinalize(() => handleDragEnd());

  return {
    isScrollingDisabled,
    flatListRef,
    listContainerRef,
    listStartY,
    scrollOffset,
    panGesture,
  };
}
