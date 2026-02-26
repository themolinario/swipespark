import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { PhotoAsset } from "@/services/media-library.service";
import { usePhotoStore } from "@/stores/photo-store";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const GAP = 2;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

export default function KeptPhotosScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drag to select state
  const [isScrollingDisabled, setIsScrollingDisabled] = useState(false);
  const isDragging = useRef(false);
  const scrollOffset = useRef(0);
  const startDragIndex = useRef<number | null>(null);
  const lastToggledIndex = useRef<number | null>(null);
  const isSelectingRef = useRef(true); // true = adding to selection, false = removing
  const flatListRef = useRef<FlatList>(null);
  const listStartY = useRef(0);
  const listContainerRef = useRef<View>(null);

  const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTouchY = useRef<number>(0);
  const currentTouchX = useRef<number>(0);

  const { keptPhotos, removeKeptPhoto } = usePhotoStore();

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleRemovePhoto = useCallback(
    (photo: PhotoAsset) => {
      if (isSelectMode) {
        handleToggleSelect(photo.id);
        return;
      }

      Alert.alert(
        "Remove from list",
        "Do you want to remove this photo from the keep list?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => removeKeptPhoto(photo.id),
          },
        ],
      );
    },
    [removeKeptPhoto, isSelectMode, handleToggleSelect],
  );

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  // --- Drag to Select Logic ---

  const getIndexFromCoordinates = useCallback((x: number, y: number) => {
    // x and y from GestureDetector are LOCAL to the listContainer
    const contentY = y + scrollOffset.current;
    if (contentY < 0) return null;

    const relativeX = x - GAP;
    if (relativeX < 0) return null;

    const row = Math.floor(contentY / (ITEM_SIZE + GAP));
    const col = Math.floor(relativeX / (ITEM_SIZE + GAP));

    if (col >= COLUMN_COUNT) return null;

    const index = row * COLUMN_COUNT + col;
    return index >= 0 && index < keptPhotos.length ? index : null;
  }, [keptPhotos.length]);

  const handleDragStart = useCallback((x: number, y: number) => {
    isDragging.current = true;
    setIsScrollingDisabled(true);
    const index = getIndexFromCoordinates(x, y);

    if (index !== null) {
      startDragIndex.current = index;
      lastToggledIndex.current = index;
      const photo = keptPhotos[index];

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
  }, [getIndexFromCoordinates, keptPhotos.length, keptPhotos]);

  const handleDragUpdate = useCallback((x: number, y: number) => {
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
          const p = keptPhotos[i];
          if (p) {
            if (isSelectingRef.current) next.add(p.id);
            else next.delete(p.id);
          }
        }
        return next;
      });

      lastToggledIndex.current = currentIndex;
    }
  }, [getIndexFromCoordinates, keptPhotos]);

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

    // Auto-scroll thresholds
    const SCROLL_ZONE = 80;
    const SCROLL_SPEED = 15;

    const listHeight = Dimensions.get("window").height - listStartY.current - insets.top;

    if (y < SCROLL_ZONE) {
      // Scroll Up
      const newOffset = Math.max(0, scrollOffset.current - SCROLL_SPEED);
      flatListRef.current.scrollToOffset({ offset: newOffset, animated: false });
      handleDragUpdate(x, y - SCROLL_SPEED);
    } else if (y > listHeight - SCROLL_ZONE) {
      // Scroll Down
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

  // --- End Drag to Select ---

  const renderItem = useCallback(
    ({ item }: { item: PhotoAsset }) => {
      const isSelected = selectedIds.has(item.id);
      return (
        <Pressable
          style={styles.photoItem}
          onLongPress={() => {
            if (!isSelectMode) {
              setIsSelectMode(true);
              handleToggleSelect(item.id);
            }
          }}
          onPress={() => handleRemovePhoto(item)}
        >
          <Image
            source={{ uri: item.uri }}
            style={[styles.photo, isSelected && styles.photoSelected]}
            contentFit="cover"
            transition={200}
          />
          {isSelectMode ? (
            <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
              {isSelected && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
          ) : (
            <View style={styles.removeIconContainer}>
              <Ionicons name="arrow-undo-circle" size={24} color="#007AFF" />
            </View>
          )}
        </Pressable>
      );
    },
    [handleRemovePhoto, isSelectMode, selectedIds, handleToggleSelect]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="heart-outline" size={80} color={colors.icon} />
      <ThemedText style={styles.emptyTitle}>No photos to keep</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Swipe right on photos you want to keep{"\n"}to see them here
      </ThemedText>
    </View>
  );

  return (
    <ThemedView
      style={[styles.container, { paddingTop: insets.top }]}
      transparent
    >
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.title}>
            {isSelectMode
              ? `${selectedIds.size} Selected`
              : "Photos to Keep"}
          </ThemedText>
          {!isSelectMode && (
            <ThemedText style={styles.count}>
              {keptPhotos.length} {keptPhotos.length === 1 ? "photo" : "photos"}
            </ThemedText>
          )}
        </View>
        {keptPhotos.length > 0 && (
          <Pressable onPress={toggleSelectMode} style={styles.selectButton}>
            <ThemedText style={styles.selectButtonText}>
              {isSelectMode ? "Cancel" : "Select"}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {keptPhotos.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <ThemedText style={styles.hint}>
            Tap a photo to remove it from the list
          </ThemedText>
          <GestureDetector gesture={panGesture}>
            <View
              style={styles.listContainer}
              ref={listContainerRef}
            >
              <FlatList
                ref={flatListRef}
                data={keptPhotos}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={COLUMN_COUNT}
                onLayout={(e) => {
                  listStartY.current = e.nativeEvent.layout.y;
                }}
                onScroll={(e) => {
                  scrollOffset.current = e.nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={16}
                contentContainerStyle={[
                  styles.listContent,
                  { paddingBottom: tabBarHeight + 20 },
                ]}
                showsVerticalScrollIndicator={true}
                scrollEnabled={!isScrollingDisabled}
              />
            </View>
          </GestureDetector>
          {isSelectMode && selectedIds.size > 0 && (
            <View
              style={[
                styles.actionButtonContainer,
                { bottom: tabBarHeight + 20, paddingBottom: 0 },
              ]}
            >
              <Button
                onPress={() => {
                  selectedIds.forEach((id) => removeKeptPhoto(id));
                  toggleSelectMode();
                }}
                title={`Restore ${selectedIds.size} selected to swipe`}
                icon={<Ionicons name="arrow-undo" size={20} color="#fff" />}
                style={styles.actionButton}
                variant="primary"
              />
            </View>
          )}
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 34,
  },
  count: {
    fontSize: 16,
    opacity: 0.6,
  },
  hint: {
    fontSize: 14,
    opacity: 0.5,
    textAlign: "center",
    marginBottom: 12,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: GAP,
  },
  photoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    margin: GAP / 2,
  },
  photo: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  photoSelected: {
    opacity: 0.7,
  },
  removeIconContainer: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 12,
  },
  checkCircle: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkCircleSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(150, 150, 150, 0.2)",
  },
  selectButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: "center",
    lineHeight: 24,
  },
  actionButtonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "transparent",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
});
