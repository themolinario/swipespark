import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { PhotoAsset } from "@/services/media-library.service";
import { usePhotoStore } from "@/stores/photo-store";
import { Check, Undo2, Heart } from "lucide-react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
const GAP = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

export default function KeptPhotosScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const getIndexFromCoordinates = useCallback((x: number, y: number) => {
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
  }, [getIndexFromCoordinates, keptPhotos]);

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
    const SCROLL_ZONE = 80;
    const SCROLL_SPEED = 15;
    const listHeight = Dimensions.get("window").height - listStartY.current - insets.top;
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
          <View style={[styles.photoWrapper, isSelected && styles.photoWrapperSelected]}>
            <Image
              source={{ uri: item.uri }}
              style={[styles.photo, isSelected && styles.photoSelected]}
              contentFit="cover"
              transition={200}
            />
          </View>
          {isSelectMode ? (
            <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
              {isSelected && <Check size={14} color="#fff" />}
            </View>
          ) : (
            <View style={styles.removeIconContainer}>
              <Undo2 size={18} color="#4ade80" />
            </View>
          )}
        </Pressable>
      );
    },
    [handleRemovePhoto, isSelectMode, selectedIds, handleToggleSelect]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconGlow}>
        <Heart size={72} color="#4ade80" />
      </View>
      <ThemedText style={styles.emptyTitle}>No photos to keep</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Swipe right on photos you want to keep{"\n"}to see them here
      </ThemedText>
    </View>
  );

  return (
    <FuturisticHomeBackground
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
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

      {/* Neon separator */}
      <LinearGradient
        colors={["rgba(74,222,128,0)", "rgba(74,222,128,0.5)", "rgba(74,222,128,0)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.headerSeparator}
      />

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
                  { paddingBottom: tabBarHeight + 130 },
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
                { bottom: tabBarHeight + 40 },
              ]}
            >
              <Button
                onPress={() => {
                  selectedIds.forEach((id) => removeKeptPhoto(id));
                  toggleSelectMode();
                }}
                title={`Restore ${selectedIds.size} selected to swipe`}
                icon={<Undo2 size={20} color="#fff" />}
                style={styles.actionButton}
                variant="primary"
              />
            </View>
          )}
        </>
      )}
    </FuturisticHomeBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerSeparator: {
    height: 1,
    marginHorizontal: 20,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 34,
    color: "#fff",
    textShadowColor: "rgba(74,222,128,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  count: {
    fontSize: 14,
    color: "rgba(74,222,128,0.7)",
    marginTop: 2,
  },
  hint: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 0.5,
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
  photoWrapper: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.12)",
  },
  photoWrapperSelected: {
    borderColor: "rgba(74,222,128,0.6)",
    shadowColor: "#4ade80",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoSelected: {
    opacity: 0.75,
  },
  removeIconContainer: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkCircle: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.5)",
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  checkCircleSelected: {
    backgroundColor: "#4ade80",
    borderColor: "#4ade80",
    shadowColor: "#4ade80",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  selectButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4ade80",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconGlow: {
    padding: 20,
    borderRadius: 60,
    backgroundColor: "transparent",
    shadowColor: "#4ade80",
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 0 },
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
    color: "#fff",
    textShadowColor: "rgba(74,222,128,0.2)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 22,
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
    borderRadius: 14,
    gap: 8,
    shadowColor: "#4ade80",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
});
