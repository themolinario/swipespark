import { PhotoGridItem, PhotoGridItemTheme } from "@/components/photo-grid-item";
import { PhotoPreviewModal } from "@/components/photo-preview-modal";
import { Button } from "@/components/ui/button";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { usePhotoSelection } from "@/hooks/use-photo-selection";
import { usePanGestureSelection } from "@/hooks/use-pan-gesture-selection";
import { PhotoAsset } from "@/services/media-library.service";
import { ArrowLeft, Search, Square, Trash2 } from "lucide-react-native";
import * as MediaLibrary from "expo-media-library";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const GAP = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GAP * (COLUMN_COUNT + 1)) / COLUMN_COUNT;

const SMART_CLEAN_THEME: PhotoGridItemTheme = {
  borderDefault: "rgba(74,222,128,0.12)",
  borderSelected: "rgba(74,222,128,0.6)",
  checkCircleSelected: "#4ade80",
};

interface SmartCleanReviewResultsProps {
  matchedPhotos: MediaLibrary.Asset[];
  scanComplete: boolean;
  isSearchRunning: boolean;
  baseTitle: string;
  scanningSubtitle: string;
  onStop: () => void;
  onBack: () => void;
  onConfirmDeletion: (selectedPhotos: MediaLibrary.Asset[]) => void;
}

export function SmartCleanReviewResults({
  matchedPhotos,
  scanComplete,
  isSearchRunning,
  baseTitle,
  scanningSubtitle,
  onStop,
  onBack,
  onConfirmDeletion,
}: SmartCleanReviewResultsProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
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

  const {
    isScrollingDisabled,
    flatListRef,
    listContainerRef,
    listStartY,
    scrollOffset,
    panGesture,
  } = usePanGestureSelection({
    items: matchedPhotos,
    selectedIds,
    setSelectedIds,
    isSelectMode,
    columnCount: COLUMN_COUNT,
    gap: GAP,
    itemSize: ITEM_SIZE,
  });

  const handlePress = useCallback((photo: PhotoAsset) => {
    if (isSelectMode) {
      handleToggleSelect(photo.id);
    } else {
      const idx = matchedPhotos.findIndex((p) => p.id === photo.id);
      if (idx >= 0) setPreviewIndex(idx);
    }
  }, [isSelectMode, handleToggleSelect, matchedPhotos]);

  const handleLongPress = useCallback((photo: PhotoAsset) => {
    if (!isSelectMode) {
      setIsSelectMode(true);
      handleToggleSelect(photo.id);
    }
  }, [isSelectMode, setIsSelectMode, handleToggleSelect]);

  const renderItem = useCallback(
    ({ item }: { item: MediaLibrary.Asset }) => (
      <PhotoGridItem
        photo={item as PhotoAsset}
        isSelected={selectedIds.has(item.id)}
        isSelectMode={isSelectMode}
        itemSize={ITEM_SIZE}
        gap={GAP}
        theme={SMART_CLEAN_THEME}
        defaultOpacity={1}
        selectedOpacity={0.65}
        onPress={handlePress}
        onLongPress={handleLongPress}
      />
    ),
    [isSelectMode, selectedIds, handlePress, handleLongPress],
  );

  const renderListFooter = useCallback(() => {
    if (!isSearchRunning) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color="#4ade80" size="small" />
        <Text style={styles.loadingFooterText}>{t("smart.searchingMore")}</Text>
      </View>
    );
  }, [isSearchRunning, t]);

  const title = isSelectMode
    ? t("smart.selectedCount", { count: selectedIds.size })
    : baseTitle;

  return (
    <FuturisticHomeBackground style={styles.container}>
      <View style={[styles.inner, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={22} color="#4ade80" />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {!isSelectMode && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {scanningSubtitle}
              </Text>
            )}
          </View>
          {matchedPhotos.length > 0 && (
            <View style={styles.headerButtons}>
              {isSelectMode && (
                <Pressable
                  onPress={() => handleSelectAll(matchedPhotos.map((p) => p.id))}
                  style={styles.selectButton}
                >
                  <Text style={styles.selectButtonText}>
                    {selectedIds.size === matchedPhotos.length
                      ? t("deleteScreen.deselectAll")
                      : t("deleteScreen.selectAll")}
                  </Text>
                </Pressable>
              )}
              <Pressable onPress={toggleSelectMode} style={styles.selectButton}>
                <Text style={styles.selectButtonText}>
                  {isSelectMode ? t("common.cancel") : t("deleteScreen.select")}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <View
          style={[
            styles.separator,
            {
              experimental_backgroundImage:
                "linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.4), rgba(74,222,128,0))",
            },
          ]}
        />

        {isSearchRunning && (
          <View style={styles.searchBanner}>
            <Text style={styles.searchBannerText}>
              {t("smart.backgroundSearchRunning")}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.stopButton, pressed && { opacity: 0.7 }]}
              onPress={onStop}
            >
              <Square size={12} color="#ff6b6b" />
              <Text style={styles.stopButtonText}>{t("common.stop")}</Text>
            </Pressable>
          </View>
        )}

        {matchedPhotos.length === 0 && scanComplete ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconGlow}>
              <Search size={72} color="#4ade80" />
            </View>
            <Text style={styles.emptyLabel}>{t("smart.noMatchingPhotos")}</Text>
            <Pressable style={styles.goBackButton} onPress={onBack}>
              <ArrowLeft size={18} color="#fff" />
              <Text style={styles.goBackButtonText}>{t("smart.goBack")}</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <GestureDetector gesture={panGesture}>
              <View style={styles.listContainer} ref={listContainerRef}>
                <FlatList
                  ref={flatListRef}
                  data={matchedPhotos}
                  keyExtractor={(item) => item.id}
                  numColumns={COLUMN_COUNT}
                  extraData={[selectedIds, isSelectMode]}
                  contentContainerStyle={[
                    styles.gridContent,
                    { paddingBottom: tabBarHeight + 130 },
                  ]}
                  onLayout={(e) => {
                    listStartY.current = e.nativeEvent.layout.y;
                  }}
                  onScroll={(e) => {
                    scrollOffset.current = e.nativeEvent.contentOffset.y;
                  }}
                  scrollEventThrottle={16}
                  scrollEnabled={!isScrollingDisabled}
                  ListFooterComponent={renderListFooter}
                  renderItem={renderItem}
                />
              </View>
            </GestureDetector>

            {isSelectMode && selectedIds.size > 0 && (
              <View style={[styles.deleteButtonContainer, { bottom: tabBarHeight + 52 }]}>
                <Button
                  onPress={() =>
                    onConfirmDeletion(matchedPhotos.filter((p) => selectedIds.has(p.id)))
                  }
                  title={t("smart.deletePhotos", { count: selectedIds.size })}
                  icon={<Trash2 size={20} color="#fff" />}
                  style={styles.deleteButton}
                  textStyle={styles.deleteButtonText}
                  variant="danger"
                />
              </View>
            )}
          </>
        )}
      </View>

      <PhotoPreviewModal
        visible={previewIndex !== null}
        photos={matchedPhotos as unknown as PhotoAsset[]}
        initialIndex={previewIndex ?? 0}
        variant="view-only"
        onClose={() => setPreviewIndex(null)}
      />
    </FuturisticHomeBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(74,222,128,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 18,
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
  separator: {
    height: 1,
    marginHorizontal: 20,
    marginVertical: 14,
  },
  searchBanner: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    borderCurve: "continuous",
    backgroundColor: "rgba(74,222,128,0.06)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.2)",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  searchBannerText: {
    flex: 1,
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    lineHeight: 15,
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,107,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
  },
  stopButtonText: {
    color: "#ff6b6b",
    fontSize: 11,
    fontWeight: "600",
  },
  listContainer: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: GAP,
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  loadingFooterText: {
    color: "rgba(74,222,128,0.6)",
    fontSize: 13,
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
  emptyState: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 80,
    gap: 16,
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
  emptyLabel: {
    fontSize: 17,
    color: "rgba(255,255,255,0.5)",
    marginTop: 8,
  },
  goBackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
    borderCurve: "continuous",
    backgroundColor: "rgba(74,222,128,0.15)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.5)",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.3,
  },
  goBackButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
});
