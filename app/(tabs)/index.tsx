import { ActionButtons } from "@/components/action-buttons";
import { DeletionSuccessModal } from "@/components/deletion-success-modal";
import { EmptyState } from "@/components/empty-state";
import { PermissionRequest } from "@/components/permission-request";
import { PhotoSwiper } from "@/components/photo-swiper";
import { StatsHeader } from "@/components/stats-header";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { usePhotos } from "@/hooks/use-photos";
import { getAssetsSize, getAssetsSizeByIds } from "@/modules/image-classifier";
import { usePhotoStore } from "@/stores/photo-store";
import { useDuplicateStore } from "@/stores/duplicate-store";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { Trash2, Undo2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DEFAULT_CARD_HEIGHT = SCREEN_HEIGHT * 0.55;

export default function HomeScreen() {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

  const [swiperContainerHeight, setSwiperContainerHeight] = useState(DEFAULT_CARD_HEIGHT);

  const [successModal, setSuccessModal] = useState<{ visible: boolean; count: number; freedBytes: number }>({
    visible: false,
    count: 0,
    freedBytes: 0,
  });

  const {
    addKeptPhoto,
    addDeletionPhoto,
    deletionPhotos,
    removeDeletionPhoto,
    clearDeletionPhotos,
  } = usePhotoStore();

  const {
    photos,
    isLoading,
    hasPermission,
    permissionDenied,
    currentIndex,
    totalCount,
    deletedCount,
    requestPermission,
    markForDeletion,
    keepPhoto,
    confirmDeletion,
    undoLastDeletion,
  } = usePhotos();

  const currentPhoto = photos[currentIndex];

  const handleDelete = useCallback(() => {
    if (currentPhoto) {
      addDeletionPhoto(currentPhoto);
      markForDeletion(currentPhoto.id);
    }
  }, [currentPhoto, markForDeletion, addDeletionPhoto]);

  const handleSwipeLeft = useCallback(
    (id: string) => {
      const photo = photos.find((p) => p.id === id);
      if (photo) {
        addDeletionPhoto(photo);
        markForDeletion(id);
      }
    },
    [photos, markForDeletion, addDeletionPhoto],
  );

  const handleKeep = useCallback(() => {
    if (currentPhoto) {
      addKeptPhoto(currentPhoto);
      keepPhoto();
    }
  }, [currentPhoto, keepPhoto, addKeptPhoto]);

  const handleConfirmDeletion = useCallback(async () => {
    // Calcola la dimensione prima di cancellare
    let freedBytes = 0;
    try {
      const uris = deletionPhotos.map((p) => p.uri);
      const ids = deletionPhotos.map((p) => p.id);
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
      // fallback: procedi senza dimensione
    }

    const count = deletionPhotos.length;
    const ids = deletionPhotos.map((p) => p.id);
    const success = await confirmDeletion();
    if (success) {
      // Update duplicate store – remove deleted photos from duplicate groups
      useDuplicateStore.getState().removeDuplicatesLocally(ids);
      clearDeletionPhotos();
      setSuccessModal({ visible: true, count, freedBytes });
    }
  }, [confirmDeletion, clearDeletionPhotos, deletionPhotos]);

  const handleUndo = useCallback(() => {
    if (deletionPhotos.length > 0) {
      const lastPhoto = deletionPhotos[deletionPhotos.length - 1];
      removeDeletionPhoto(lastPhoto.id);
    }
    undoLastDeletion();
  }, [undoLastDeletion, deletionPhotos, removeDeletionPhoto]);

  if (!hasPermission) {
    return (
      <PermissionRequest
        onRequestPermission={requestPermission}
        permissionDenied={permissionDenied}
      />
    );
  }

  if (photos.length === 0 && !isLoading) {
    return <EmptyState />;
  }

  const isComplete = currentIndex >= photos.length && !isLoading;

  return (
    <FuturisticHomeBackground
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.headerWrapper}>
      <StatsHeader
        currentIndex={currentIndex}
        totalCount={totalCount}
        deletedCount={deletedCount}
        actionButton={
          deletedCount > 0 ? (
            <Pressable
              onPress={handleConfirmDeletion}
              style={({ pressed }) => [
                styles.headerConfirmButton,
                pressed && styles.headerConfirmButtonPressed,
              ]}
            >
              <View style={styles.headerConfirmButtonGlow} />
              <Trash2 size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.headerConfirmButtonText}>
                {t("home.deleteCount", { count: deletedCount })}
              </Text>
            </Pressable>
          ) : undefined
        }
      />
      </View>

      {isComplete ? (
        <ScrollView
          contentContainerStyle={[
            styles.completeContainer,
            { paddingBottom: tabBarHeight + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <EmptyState />
          {deletedCount > 0 && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                handleUndo();
              }}
              style={({ pressed }) => [
                styles.completeUndoButton,
                pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
              ]}
            >
              <Undo2 size={20} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.completeUndoText}>{t("home.undo")}</Text>
            </Pressable>
          )}
        </ScrollView>
      ) : (
        <>
          <View
            style={styles.swiperContainer}
            onLayout={(e) => setSwiperContainerHeight(e.nativeEvent.layout.height)}
          >
            <PhotoSwiper
              photos={photos}
              currentIndex={currentIndex}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleKeep}
              cardHeight={Math.min(swiperContainerHeight - 32, DEFAULT_CARD_HEIGHT)}
            />
          </View>

          <View style={[styles.footer, { paddingBottom: tabBarHeight + 80 }]}>
            <ActionButtons
              onDelete={handleDelete}
              onKeep={handleKeep}
              onUndo={handleUndo}
              canUndo={deletedCount > 0}
            />
          </View>
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
  headerWrapper: {
    zIndex: 2,
  },
  swiperContainer: {
    flex: 1,
    minHeight: 200,
    paddingTop: 16,
    zIndex: 1,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
    zIndex: 2,
  },
  completeContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerConfirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: "rgba(255, 59, 48, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 59, 48, 0.6)",
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.7,
    overflow: "visible",
  },
  headerConfirmButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
  headerConfirmButtonGlow: {
    position: "absolute",
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 20,
    borderCurve: 'continuous',
    backgroundColor: "rgba(255, 59, 48, 0.08)",
  },
  headerConfirmButtonText: {
    color: "#ff6b6b",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(255, 59, 48, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  completeUndoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    borderCurve: 'continuous',
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
  },
  completeUndoText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
