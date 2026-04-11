import { PhotoGridItem, PhotoGridItemTheme } from "@/components/photo-grid-item";
import { PhotoPreviewModal } from "@/components/photo-preview-modal";
import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { usePhotoSelection } from "@/hooks/use-photo-selection";
import { usePanGestureSelection } from "@/hooks/use-pan-gesture-selection";
import { PhotoAsset } from "@/services/media-library.service";
import { usePhotoStore } from "@/stores/photo-store";
import { Undo2, Heart } from "lucide-react-native";
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

const KEPT_THEME: PhotoGridItemTheme = {
  borderDefault: "rgba(74,222,128,0.12)",
  borderSelected: "rgba(74,222,128,0.6)",
  checkCircleSelected: "#4ade80",
};

export default function KeptPhotosScreen() {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const {
    isSelectMode,
    setIsSelectMode,
    selectedIds,
    setSelectedIds,
    handleToggleSelect,
    handleSelectAll,
    toggleSelectMode,
  } = usePhotoSelection();

  const { keptPhotos, removeKeptPhoto } = usePhotoStore();

  const handleLongPress = useCallback((photo: PhotoAsset) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      handleToggleSelect(photo.id);
    }
  }, [isSelectMode, setIsSelectMode, handleToggleSelect]);

  const handleRemovePhoto = useCallback((photo: PhotoAsset) => {
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
  }, [removeKeptPhoto, t]);

  const handlePhotoPress = useCallback((photo: PhotoAsset) => {
    if (isSelectMode) {
      handleToggleSelect(photo.id);
      return;
    }
    const index = keptPhotos.findIndex((p) => p.id === photo.id);
    if (index >= 0) setPreviewIndex(index);
  }, [isSelectMode, handleToggleSelect, keptPhotos]);

  const {
    isScrollingDisabled,
    flatListRef,
    listContainerRef,
    listStartY,
    scrollOffset,
    panGesture,
  } = usePanGestureSelection({
    items: keptPhotos,
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
        theme={KEPT_THEME}
        defaultOpacity={1}
        selectedOpacity={0.75}
        actionIcon={actionIcon}
        onPress={handlePhotoPress}
        onLongPress={handleLongPress}
        onActionPress={handleRemovePhoto}
      />
    ),
    [handlePhotoPress, handleLongPress, handleRemovePhoto, isSelectMode, selectedIds],
  );

  const hasVideoInSelection = keptPhotos.some(
    (p) => selectedIds.has(p.id) && p.mediaType === "video",
  );

  return (
    <FuturisticHomeBackground style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText style={styles.title}>
            {isSelectMode
              ? t(hasVideoInSelection ? "keptScreen.selectedCountMixed" : "keptScreen.selectedCount", { count: selectedIds.size })
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
              <Pressable
                onPress={() => handleSelectAll(keptPhotos.map((p) => p.id))}
                style={styles.selectButton}
              >
                <ThemedText style={styles.selectButtonText}>
                  {selectedIds.size === keptPhotos.length
                    ? t("keptScreen.deselectAll")
                    : t("keptScreen.selectAll")}
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

      <View
        style={[
          styles.headerSeparator,
          {
            experimental_backgroundImage:
              "linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.5), rgba(74,222,128,0))",
          },
        ]}
      />

      {keptPhotos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconGlow}>
            <Heart size={72} color="#4ade80" />
          </View>
          <ThemedText style={styles.emptyTitle}>{t("keptScreen.emptyTitle")}</ThemedText>
          <ThemedText style={styles.emptySubtitle}>{t("keptScreen.emptySubtitle")}</ThemedText>
        </View>
      ) : (
        <>
          <ThemedText style={styles.hint}>{t("keptScreen.hint")}</ThemedText>
          <GestureDetector gesture={panGesture}>
            <View style={styles.listContainer} ref={listContainerRef}>
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
                contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + 130 }]}
                showsVerticalScrollIndicator
                scrollEnabled={!isScrollingDisabled}
              />
            </View>
          </GestureDetector>
          {isSelectMode && selectedIds.size > 0 && (
            <View style={[styles.actionButtonContainer, { bottom: tabBarHeight + 44 }]}>
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
    shadowColor: "#4ade80",
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
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4ade80",
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
    borderCurve: "continuous",
    gap: 8,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.3,
  },
});
