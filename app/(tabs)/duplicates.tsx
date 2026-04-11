import { DeletionSuccessModal } from "@/components/deletion-success-modal";
import { DuplicateGroupItem } from "@/components/duplicate-group-item";
import { DuplicatesEmptyState } from "@/components/duplicates-empty-state";
import { Button } from "@/components/ui/button";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { ThemedText } from "@/components/themed-text";
import { useDuplicates } from "@/hooks/use-duplicates";
import { useDuplicatesPanSelection } from "@/hooks/use-duplicates-pan-selection";
import { DuplicateGroup } from "@/utils/duplicate-detection";
import { ArrowLeft, RefreshCcw, Trash2, XCircle, Zap } from "lucide-react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function DuplicatesContent({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const {
    duplicateGroups,
    isScanning,
    progress,
    scanStatusText,
    hasPermission,
    hasScannedOnce,
    scanDuplicates,
    deleteDuplicates,
  } = useDuplicates();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    count: number;
    freedBytes: number;
  }>({ visible: false, count: 0, freedBytes: 0 });

  const flatPhotos = duplicateGroups.flatMap((g) => g.photos);

  const {
    isScrollingDisabled,
    flatListRef,
    listContainerRef,
    listStartY,
    scrollOffset,
    panGesture,
    onGroupHeaderLayout,
  } = useDuplicatesPanSelection({
    duplicateGroups,
    flatPhotos,
    selectedIds,
    setSelectedIds,
  });

  useEffect(() => {
    if (!hasScannedOnce && duplicateGroups.length === 0 && !isScanning) {
      scanDuplicates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasScannedOnce]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleAutoSelect = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const group of duplicateGroups) {
        for (let i = 1; i < group.photos.length; i++) {
          next.add(group.photos[i].id);
        }
      }
      return next;
    });
  };

  const handleClearSelection = () => setSelectedIds(new Set());

  const handleConfirmDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      const urisToDelete = flatPhotos.filter((p) => selectedIds.has(p.id)).map((p) => p.uri);
      const result = await deleteDuplicates(idsToDelete, urisToDelete);
      if (result.success) {
        setSelectedIds(new Set());
        setSuccessModal({ visible: true, count: idsToDelete.length, freedBytes: result.freedBytes });
      } else {
        Alert.alert(t("common.error"), t("duplicates.errorDelete"));
      }
    } catch {
      Alert.alert(t("common.error"), t("duplicates.errorGeneric"));
    } finally {
      setIsDeleting(false);
    }
  };

  const renderGroup = useCallback(
    ({ item }: { item: DuplicateGroup }) => (
      <DuplicateGroupItem
        group={item}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onHeaderLayout={onGroupHeaderLayout}
      />
    ),
    [selectedIds, handleToggleSelect, onGroupHeaderLayout],
  );

  return (
    <FuturisticHomeBackground style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {onBack && (
            <Pressable testID="duplicates-back-button" onPress={onBack} style={styles.actionIcon}>
              <ArrowLeft size={22} color="#4ade80" />
            </Pressable>
          )}
          <View>
            <ThemedText style={styles.title}>{t("duplicates.title")}</ThemedText>
            {!isScanning && duplicateGroups.length > 0 && (
              <ThemedText style={styles.count}>
                {t("duplicates.groupsFound", { count: duplicateGroups.length })}
              </ThemedText>
            )}
          </View>
        </View>
        {!isScanning && duplicateGroups.length > 0 && (
          <Pressable onPress={() => scanDuplicates(true)} style={styles.actionIcon}>
            <RefreshCcw size={22} color="#4ade80" />
          </Pressable>
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

      {duplicateGroups.length === 0 ? (
        <DuplicatesEmptyState
          isScanning={isScanning}
          progress={progress}
          scanStatusText={scanStatusText}
          hasPermission={hasPermission}
          hasScannedOnce={hasScannedOnce}
          onScan={scanDuplicates}
        />
      ) : (
        <>
          <View style={styles.toolbar}>
            <Pressable onPress={handleAutoSelect} style={styles.toolbarButton}>
              <Zap size={15} color="#4ade80" />
              <ThemedText style={styles.toolbarButtonText}>{t("duplicates.autoSelect")}</ThemedText>
            </Pressable>
            {selectedIds.size > 0 && (
              <Pressable onPress={handleClearSelection} style={styles.toolbarButton}>
                <XCircle size={15} color="#4ade80" />
                <ThemedText style={styles.toolbarButtonText}>{t("duplicates.clear")}</ThemedText>
              </Pressable>
            )}
          </View>

          <GestureDetector gesture={panGesture}>
            <View style={styles.listContainer} ref={listContainerRef}>
              <FlatList
                ref={flatListRef}
                data={duplicateGroups}
                renderItem={renderGroup}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                  styles.listContent,
                  { paddingBottom: tabBarHeight + 130 },
                ]}
                showsVerticalScrollIndicator={false}
                onLayout={(e) => {
                  listStartY.current = e.nativeEvent.layout.y;
                }}
                onScroll={(e) => {
                  scrollOffset.current = e.nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={16}
                scrollEnabled={!isScrollingDisabled}
              />
            </View>
          </GestureDetector>

          {selectedIds.size > 0 && (
            <View style={[styles.deleteButtonContainer, { bottom: tabBarHeight + 52 }]}>
              <Button
                onPress={handleConfirmDelete}
                title={
                  isDeleting
                    ? t("deleteScreen.deleting")
                    : t("duplicates.deleteCopies", { count: selectedIds.size })
                }
                icon={!isDeleting ? <Trash2 size={20} color="#fff" /> : undefined}
                style={styles.deleteButton}
                textStyle={styles.deleteButtonText}
                variant="danger"
                disabled={isDeleting}
              />
            </View>
          )}
        </>
      )}

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
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  toolbar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 10,
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.25)",
  },
  toolbarButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4ade80",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
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
});

export default function DuplicatesScreen() {
  return <DuplicatesContent />;
}
