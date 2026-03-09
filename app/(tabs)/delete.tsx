import { DeletionSuccessModal } from "@/components/deletion-success-modal";
import { PhotoPreviewModal } from "@/components/photo-preview-modal";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { getAssetsSize, getAssetsSizeByIds } from "@/modules/image-classifier";
import {
  mediaLibraryService,
  PhotoAsset,
} from "@/services/media-library.service";
import { usePhotoStore } from "@/stores/photo-store";
import { useDuplicateStore } from "@/stores/duplicate-store";
import { Check, Undo2, Trash2 } from "lucide-react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const GAP = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

export default function DeletePhotosScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [isDeleting, setIsDeleting] = useState(false);
  const [successModal, setSuccessModal] = useState<{ visible: boolean; count: number; freedBytes: number }>({
    visible: false,
    count: 0,
    freedBytes: 0,
  });

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

  const { deletionPhotos, removeDeletionPhoto, clearDeletionPhotos } =
    usePhotoStore();

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

  const handleRestorePhoto = useCallback(
    (photo: PhotoAsset) => {
      Alert.alert(
        "Remove from list",
        "Do you want to restore this photo from the deletion list?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "default",
            onPress: () => removeDeletionPhoto(photo.id),
          },
        ],
      );
    },
    [removeDeletionPhoto],
  );

  const handlePhotoPress = useCallback(
    (photo: PhotoAsset) => {
      if (isSelectMode) {
        handleToggleSelect(photo.id);
        return;
      }
      const index = deletionPhotos.findIndex((p) => p.id === photo.id);
      if (index >= 0) setPreviewIndex(index);
    },
    [isSelectMode, handleToggleSelect, deletionPhotos],
  );

  const toggleSelectMode = useCallback(() => {
    setIsSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    const photosToDelete = isSelectMode
      ? deletionPhotos.filter(p => selectedIds.has(p.id))
      : deletionPhotos;

    if (photosToDelete.length === 0) return;

    setIsDeleting(true);
    try {
      const uris = photosToDelete.map((p) => p.uri);
      const ids = photosToDelete.map((p) => p.id);

      let freedBytes = 0;
      try {
        if (Platform.OS === 'android') {
          freedBytes = await getAssetsSizeByIds(ids);
          if (freedBytes <= 0) {
            freedBytes = await getAssetsSize(uris);
          }
        } else {
          freedBytes = await getAssetsSizeByIds(ids);
          if (freedBytes <= 0) {
            freedBytes = await getAssetsSize(uris);
          }
        }
      } catch {
        // fallback
      }

      const success = await mediaLibraryService.deleteAssets(ids);

      if (success) {
        // Update duplicate store – remove deleted photos from duplicate groups
        useDuplicateStore.getState().removeDuplicatesLocally(ids);
        // Remove from kept list too (in case they were also kept)
        usePhotoStore.getState().removePhotosPermanently(ids);
        // Notify usePhotos (index) about permanent deletion
        usePhotoStore.getState().bumpDeletionVersion();

        if (isSelectMode) {
          ids.forEach((id) => removeDeletionPhoto(id));
          setSelectedIds(new Set());
          setIsSelectMode(false);
        } else {
          clearDeletionPhotos();
        }
        setSuccessModal({ visible: true, count: ids.length, freedBytes });
      } else {
        Alert.alert("Error", "Could not delete photos.");
      }
    } catch {
      Alert.alert("Error", "An error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  }, [deletionPhotos, clearDeletionPhotos, isSelectMode, selectedIds, removeDeletionPhoto]);

  const handleRestoreSelected = useCallback(() => {
    selectedIds.forEach((id) => removeDeletionPhoto(id));
    toggleSelectMode();
  }, [selectedIds, removeDeletionPhoto, toggleSelectMode]);

  const getIndexFromCoordinates = useCallback((x: number, y: number) => {
    const contentY = y + scrollOffset.current;
    if (contentY < 0) return null;
    const relativeX = x - GAP;
    if (relativeX < 0) return null;
    const row = Math.floor(contentY / (ITEM_SIZE + GAP));
    const col = Math.floor(relativeX / (ITEM_SIZE + GAP));
    if (col >= COLUMN_COUNT) return null;
    const index = row * COLUMN_COUNT + col;
    return index >= 0 && index < deletionPhotos.length ? index : null;
  }, [deletionPhotos.length]);

  const handleDragStart = useCallback((x: number, y: number) => {
    isDragging.current = true;
    setIsScrollingDisabled(true);
    const index = getIndexFromCoordinates(x, y);
    if (index !== null) {
      startDragIndex.current = index;
      lastToggledIndex.current = index;
      const photo = deletionPhotos[index];
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
  }, [getIndexFromCoordinates, deletionPhotos]);

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
          const p = deletionPhotos[i];
          if (p) {
            if (isSelectingRef.current) next.add(p.id);
            else next.delete(p.id);
          }
        }
        return next;
      });
      lastToggledIndex.current = currentIndex;
    }
  }, [getIndexFromCoordinates, deletionPhotos]);

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
              style={styles.restoreIconContainer}
              hitSlop={16}
              onPress={(e) => {
                e.stopPropagation?.();
                handleRestorePhoto(item);
              }}
            >
              <Undo2 size={18} color="#4ade80" />
            </Pressable>
          )}
        </Pressable>
      );
    },
    [handlePhotoPress, handleRestorePhoto, isSelectMode, selectedIds, handleToggleSelect],
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconGlow}>
        <Trash2 size={72} color="#ff6b6b" />
      </View>
      <ThemedText style={styles.emptyTitle}>No photos to delete</ThemedText>
      <ThemedText style={styles.emptySubtitle}>
        Swipe left on photos you want to delete{"\n"}to see them here
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
              : "Photos to Delete"}
          </ThemedText>
          {!isSelectMode && (
            <ThemedText style={styles.count}>
              {deletionPhotos.length}{" "}
              {deletionPhotos.length === 1 ? "photo" : "photos"}
            </ThemedText>
          )}
        </View>
        {deletionPhotos.length > 0 && (
          <Pressable onPress={toggleSelectMode} style={styles.selectButton}>
            <ThemedText style={styles.selectButtonText}>
              {isSelectMode ? "Cancel" : "Select"}
            </ThemedText>
          </Pressable>
        )}
      </View>

      {/* Neon separator */}
      <LinearGradient
        colors={["rgba(255,107,107,0)", "rgba(255,107,107,0.5)", "rgba(255,107,107,0)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.headerSeparator}
      />

      {deletionPhotos.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          <ThemedText style={styles.hint}>Tap to preview · Tap the restore icon to undo</ThemedText>
          <GestureDetector gesture={panGesture}>
            <View
              style={styles.listContainer}
              ref={listContainerRef}
            >
              <FlatList
                ref={flatListRef}
                data={deletionPhotos}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={COLUMN_COUNT}
                extraData={[selectedIds, isSelectMode]}
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

          <View
            style={[
              styles.deleteButtonContainer,
              { bottom: tabBarHeight + 52 },
            ]}
          >
            {isSelectMode && selectedIds.size > 0 ? (
              <View style={styles.bulkActionButtons}>
                <Button
                  onPress={handleRestoreSelected}
                  title={`Restore (${selectedIds.size})`}
                  icon={<Undo2 size={20} color="#fff" />}
                  style={[styles.bulkButton, styles.bulkRestoreButton]}
                  variant="success"
                />
                <Button
                  onPress={handleConfirmDelete}
                  title={isDeleting ? "Deleting..." : `Delete (${selectedIds.size})`}
                  icon={!isDeleting ? <Trash2 size={20} color="#fff" /> : undefined}
                  style={[styles.bulkButton, styles.bulkDeleteButton]}
                  variant="danger"
                  disabled={isDeleting}
                />
              </View>
            ) : !isSelectMode ? (
              <Button
                onPress={handleConfirmDelete}
                title={isDeleting ? "Deleting..." : `Delete ${deletionPhotos.length} photos`}
                icon={!isDeleting ? <Trash2 size={20} color="#fff" /> : undefined}
                style={styles.deleteButton}
                textStyle={styles.deleteButtonText}
                variant="danger"
                disabled={isDeleting}
              />
            ) : null}
          </View>
        </>
      )}

      <PhotoPreviewModal
        visible={previewIndex !== null}
        photos={deletionPhotos}
        initialIndex={previewIndex ?? 0}
        variant="delete"
        onClose={() => setPreviewIndex(null)}
        onRestore={(photo) => {
          removeDeletionPhoto(photo.id);
          setPreviewIndex(null);
        }}
        onDelete={(photo) => {
          Alert.alert(
            "Delete permanently",
            "This photo will be permanently deleted from your device.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  try {
                    const ids = [photo.id];
                    const success = await mediaLibraryService.deleteAssets(ids);
                    if (success) {
                      useDuplicateStore.getState().removeDuplicatesLocally(ids);
                      usePhotoStore.getState().removePhotosPermanently(ids);
                      usePhotoStore.getState().bumpDeletionVersion();
                      removeDeletionPhoto(photo.id);
                    }
                  } catch {
                    Alert.alert("Error", "Could not delete photo.");
                  }
                  setPreviewIndex(null);
                },
              },
            ],
          );
        }}
      />

      <DeletionSuccessModal
        visible={successModal.visible}
        deletedCount={successModal.count}
        freedBytes={successModal.freedBytes}
        onClose={() => setSuccessModal({ visible: false, count: 0, freedBytes: 0 })}
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
    textShadowColor: "rgba(255,107,107,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  count: {
    fontSize: 14,
    color: "rgba(255,107,107,0.7)",
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
    overflow: "visible",
  },
  photoWrapper: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.12)",
  },
  photoWrapperSelected: {
    borderColor: "rgba(255,107,107,0.6)",
    shadowColor: "#ff6b6b",
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  photo: {
    width: "100%",
    height: "100%",
    opacity: 0.7,
  },
  photoSelected: {
    opacity: 1,
  },
  restoreIconContainer: {
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
    backgroundColor: "transparent",
    shadowColor: "#ff6b6b",
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
    textShadowColor: "rgba(255,107,107,0.2)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 22,
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
    zIndex: 10,
  },
  checkCircleSelected: {
    backgroundColor: "#ff6b6b",
    borderColor: "#ff6b6b",
    shadowColor: "#ff6b6b",
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  selectButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,107,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ff6b6b",
  },
  deleteButtonContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#ff3b30",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bulkActionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  bulkButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  bulkRestoreButton: {
    backgroundColor: "#34c759",
    shadowColor: "#34c759",
  },
  bulkDeleteButton: {
    backgroundColor: "#ff3b30",
    shadowColor: "#ff3b30",
  },
});
