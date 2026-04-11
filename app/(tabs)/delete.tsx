import { DeletionSuccessModal } from "@/components/deletion-success-modal";
import { PhotoGridItem, PhotoGridItemTheme } from "@/components/photo-grid-item";
import { PhotoPreviewModal } from "@/components/photo-preview-modal";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { usePhotoSelection } from "@/hooks/use-photo-selection";
import { usePanGestureSelection } from "@/hooks/use-pan-gesture-selection";
import { mediaLibraryService, PhotoAsset } from "@/services/media-library.service";
import { usePhotoStore } from "@/stores/photo-store";
import { useDuplicateStore } from "@/stores/duplicate-store";
import { useStatsStore } from "@/stores/stats-store";
import { calculateFreedBytes } from "@/utils/asset-size";
import { Undo2, Trash2 } from "lucide-react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const COLUMN_COUNT = 3;
const GAP = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

const DELETE_THEME: PhotoGridItemTheme = {
  borderDefault: "rgba(255,107,107,0.12)",
  borderSelected: "rgba(255,107,107,0.6)",
  checkCircleSelected: "#ff6b6b",
};

export default function DeletePhotosScreen() {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [successModal, setSuccessModal] = useState<{ visible: boolean; count: number; freedBytes: number }>({
    visible: false,
    count: 0,
    freedBytes: 0,
  });

  const {
    isSelectMode,
    setIsSelectMode,
    selectedIds,
    setSelectedIds,
    handleToggleSelect,
    handleSelectAll,
    toggleSelectMode,
  } = usePhotoSelection();

  const { deletionPhotos, removeDeletionPhoto, clearDeletionPhotos } = usePhotoStore();

  const handleLongPress = useCallback((photo: PhotoAsset) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      handleToggleSelect(photo.id);
    }
  }, [isSelectMode, setIsSelectMode, handleToggleSelect]);

  const handleRestorePhoto = useCallback((photo: PhotoAsset) => {
    Alert.alert(
      t("deleteScreen.removeFromList"),
      t("deleteScreen.restoreMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("deleteScreen.restore"),
          style: "default",
          onPress: () => removeDeletionPhoto(photo.id),
        },
      ],
    );
  }, [removeDeletionPhoto, t]);

  const handlePhotoPress = useCallback((photo: PhotoAsset) => {
    if (isSelectMode) {
      handleToggleSelect(photo.id);
      return;
    }
    const index = deletionPhotos.findIndex((p) => p.id === photo.id);
    if (index >= 0) setPreviewIndex(index);
  }, [isSelectMode, handleToggleSelect, deletionPhotos]);

  const handleConfirmDelete = async () => {
    const photosToDelete = isSelectMode
      ? deletionPhotos.filter((p) => selectedIds.has(p.id))
      : deletionPhotos;

    if (photosToDelete.length === 0) return;

    setIsDeleting(true);
    try {
      const ids = photosToDelete.map((p) => p.id);
      const uris = photosToDelete.map((p) => p.uri);
      const freedBytes = await calculateFreedBytes(ids, uris);
      const success = await mediaLibraryService.deleteAssets(ids);

      if (success) {
        useDuplicateStore.getState().removeDuplicatesLocally(ids);
        usePhotoStore.getState().removePhotosPermanently(ids);
        usePhotoStore.getState().bumpDeletionVersion();
        useStatsStore.getState().recordDeletion(ids.length, freedBytes);

        if (isSelectMode) {
          ids.forEach((id) => removeDeletionPhoto(id));
          setSelectedIds(new Set());
          setIsSelectMode(false);
        } else {
          clearDeletionPhotos();
        }
        setSuccessModal({ visible: true, count: ids.length, freedBytes });
      } else {
        Alert.alert(t("common.error"), t("deleteScreen.errorDelete"));
      }
    } catch {
      Alert.alert(t("common.error"), t("deleteScreen.errorGeneric"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestoreSelected = () => {
    selectedIds.forEach((id) => removeDeletionPhoto(id));
    toggleSelectMode();
  };

  const {
    isScrollingDisabled,
    flatListRef,
    listContainerRef,
    scrollOffset,
    panGesture,
  } = usePanGestureSelection({
    items: deletionPhotos,
    selectedIds,
    setSelectedIds,
    isSelectMode,
    columnCount: COLUMN_COUNT,
    gap: GAP,
    itemSize: ITEM_SIZE,
  });

  const actionIcon = <Undo2 size={18} color="#4ade80" />;

  const renderItem = useCallback(
    ({ item }: { item: PhotoAsset }) => (
      <PhotoGridItem
        photo={item}
        isSelected={selectedIds.has(item.id)}
        isSelectMode={isSelectMode}
        itemSize={ITEM_SIZE}
        gap={GAP}
        theme={DELETE_THEME}
        defaultOpacity={0.7}
        selectedOpacity={1}
        actionIcon={actionIcon}
        onPress={handlePhotoPress}
        onLongPress={handleLongPress}
        onActionPress={handleRestorePhoto}
      />
    ),
    [handlePhotoPress, handleLongPress, handleRestorePhoto, isSelectMode, selectedIds],
  );

  const hasVideoInSelection = deletionPhotos.some(
    (p) => selectedIds.has(p.id) && p.mediaType === "video",
  );

  return (
    <FuturisticHomeBackground style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.title}>
            {isSelectMode
              ? t(hasVideoInSelection ? "deleteScreen.selectedCountMixed" : "deleteScreen.selectedCount", { count: selectedIds.size })
              : t("deleteScreen.title")}
          </ThemedText>
          {!isSelectMode && (
            <ThemedText style={styles.count}>
              {t("deleteScreen.photoCount", { count: deletionPhotos.length })}
            </ThemedText>
          )}
        </View>
        {deletionPhotos.length > 0 && (
          <View style={styles.headerButtons}>
            {isSelectMode && (
              <Pressable
                onPress={() => handleSelectAll(deletionPhotos.map((p) => p.id))}
                style={styles.selectButton}
              >
                <ThemedText style={styles.selectButtonText}>
                  {selectedIds.size === deletionPhotos.length
                    ? t("deleteScreen.deselectAll")
                    : t("deleteScreen.selectAll")}
                </ThemedText>
              </Pressable>
            )}
            <Pressable onPress={toggleSelectMode} style={styles.selectButton}>
              <ThemedText style={styles.selectButtonText}>
                {isSelectMode ? t("common.cancel") : t("deleteScreen.select")}
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>

      <View
        style={[
          styles.headerSeparator,
          {
            experimental_backgroundImage:
              "linear-gradient(to right, rgba(255,107,107,0), rgba(255,107,107,0.5), rgba(255,107,107,0))",
          },
        ]}
      />

      {deletionPhotos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconGlow}>
            <Trash2 size={72} color="#ff6b6b" />
          </View>
          <ThemedText style={styles.emptyTitle}>{t("deleteScreen.emptyTitle")}</ThemedText>
          <ThemedText style={styles.emptySubtitle}>{t("deleteScreen.emptySubtitle")}</ThemedText>
        </View>
      ) : (
        <>
          <ThemedText style={styles.hint}>{t("deleteScreen.hint")}</ThemedText>
          <GestureDetector gesture={panGesture}>
            <View style={styles.listContainer} ref={listContainerRef}>
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
                contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 130 }]}
                showsVerticalScrollIndicator
                scrollEnabled={!isScrollingDisabled}
              />
            </View>
          </GestureDetector>

          <View style={[styles.deleteButtonContainer, { bottom: tabBarHeight + 52 }]}>
            {isSelectMode && selectedIds.size > 0 ? (
              <View style={styles.bulkActionButtons}>
                <Button
                  onPress={handleRestoreSelected}
                  title={t("deleteScreen.restoreCount", { count: selectedIds.size })}
                  icon={<Undo2 size={20} color="#fff" />}
                  style={[styles.bulkButton, styles.bulkRestoreButton]}
                  variant="success"
                />
                <Button
                  onPress={handleConfirmDelete}
                  title={
                    isDeleting
                      ? t("deleteScreen.deleting")
                      : t("deleteScreen.deleteCount", { count: selectedIds.size })
                  }
                  icon={!isDeleting ? <Trash2 size={20} color="#fff" /> : undefined}
                  style={[styles.bulkButton, styles.bulkDeleteButton]}
                  variant="danger"
                  disabled={isDeleting}
                />
              </View>
            ) : !isSelectMode ? (
              <Button
                onPress={handleConfirmDelete}
                title={
                  isDeleting
                    ? t("deleteScreen.deleting")
                    : t("deleteScreen.deletePhotos", { count: deletionPhotos.length })
                }
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
            t("deleteScreen.deletePermanently"),
            t("deleteScreen.deletePermanentlyMessage"),
            [
              { text: t("common.cancel"), style: "cancel" },
              {
                text: t("common.delete"),
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
                    Alert.alert(t("common.error"), t("deleteScreen.errorDeleteSingle"));
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
    backgroundColor: "rgba(255,107,107,0.01)",
    shadowColor: "#ff6b6b",
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
  headerLeft: {
    flex: 1,
    minWidth: 0,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flexShrink: 0,
  },
  selectButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderCurve: "continuous",
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
    borderCurve: "continuous",
    gap: 8,
    shadowColor: "#ff3b30",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.4,
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
    borderCurve: "continuous",
    gap: 8,
  },
  bulkRestoreButton: {
    backgroundColor: "#34c759",
    shadowColor: "#34c759",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.4,
  },
  bulkDeleteButton: {
    backgroundColor: "#ff3b30",
    shadowColor: "#ff3b30",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.4,
  },
});
