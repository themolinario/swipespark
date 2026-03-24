import { PhotoPreviewModal } from "@/components/photo-preview-modal";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { PhotoAsset } from "@/services/media-library.service";
import { usePhotoStore } from "@/stores/photo-store";
import { Check, Undo2, Heart } from "lucide-react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

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
      Alert.alert(
        t("keptScreen.removeFromList"),
        t("keptScreen.removeMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("keptScreen.remove"),
            style: "destructive",
            onPress: () => removeKeptPhoto(photo.id),
          },
        ],
      );
    },
    [removeKeptPhoto],
  );

  const handlePhotoPress = useCallback(
    (photo: PhotoAsset) => {
      if (isSelectMode) {
        handleToggleSelect(photo.id);
        return;
      }
      const index = keptPhotos.findIndex((p) => p.id === photo.id);
      if (index >= 0) setPreviewIndex(index);
    },
    [isSelectMode, handleToggleSelect, keptPhotos],
  );

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === keptPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(keptPhotos.map((p) => p.id)));
    }
  }, [selectedIds.size, keptPhotos]);

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
          onPress={() => handlePhotoPress(item)}
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
            <Pressable
              style={styles.removeIconContainer}
              hitSlop={16}
              onPress={(e) => {
                e.stopPropagation?.();
                handleRemovePhoto(item);
              }}
            >
              <Undo2 size={18} color="#4ade80" />
            </Pressable>
          )}
        </Pressable>
      );
    },
    [handlePhotoPress, handleRemovePhoto, isSelectMode, selectedIds, handleToggleSelect]
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconGlow}>
        <Heart size={72} color="#4ade80" />
      </View>
      <ThemedText style={styles.emptyTitle}>{t("keptScreen.emptyTitle")}</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        {t("keptScreen.emptySubtitle")}
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
              ? t("keptScreen.selectedCount", { count: selectedIds.size })
              : t("keptScreen.title")}
          </ThemedText>
          {!isSelectMode && (
            <ThemedText style={styles.count}>
              {t("keptScreen.photoCount", { count: keptPhotos.length })}
            </ThemedText>
          )}
        </View>
        {keptPhotos.length > 0 && (
          <View style={styles.headerButtons}>
            {isSelectMode && (
              <Pressable onPress={handleSelectAll} style={styles.selectButton}>
                <ThemedText style={styles.selectButtonText}>
                  {selectedIds.size === keptPhotos.length ? t("keptScreen.deselectAll") : t("keptScreen.selectAll")}
                </ThemedText>
              </Pressable>
            )}
            <Pressable onPress={toggleSelectMode} style={styles.selectButton}>
              <ThemedText style={styles.selectButtonText}>
                {isSelectMode ? t("common.cancel") : t("keptScreen.select")}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      {/* Neon separator */}
      <View style={[styles.headerSeparator, { experimental_backgroundImage: 'linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.5), rgba(74,222,128,0))' }]} />

      {keptPhotos.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <ThemedText style={styles.hint}>
            {t("keptScreen.hint")}
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
                { bottom: tabBarHeight + 44 },
              ]}
            >
              <Button
                onPress={() => {
                  selectedIds.forEach((id) => removeKeptPhoto(id));
                  toggleSelectMode();
                }}
                title={t("keptScreen.restoreSelected", { count: selectedIds.size })}
                icon={<Undo2 size={20} color="#fff" />}
                style={styles.actionButton}
                variant="primary"
              />
            </View>
          )}
        </>
      )}

      <PhotoPreviewModal
        visible={previewIndex !== null}
        photos={keptPhotos}
        initialIndex={previewIndex ?? 0}
        variant="kept"
        onClose={() => setPreviewIndex(null)}
        onRestore={(photo) => {
          removeKeptPhoto(photo.id);
          setPreviewIndex(null);
        }}
      />
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
    borderCurve: 'continuous',
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.12)",
  },
  photoWrapperSelected: {
    borderColor: "rgba(74,222,128,0.6)",
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
    borderCurve: 'continuous',
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
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.6,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  selectButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderCurve: 'continuous',
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
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIconGlow: {
    padding: 20,
    borderRadius: 60,
    backgroundColor: "rgba(74,222,128,0.01)",
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 0.4,
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
    borderCurve: 'continuous',
    gap: 8,
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.3,
  },
});
