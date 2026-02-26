import { ActionButtons } from "@/components/action-buttons";
import { EmptyState } from "@/components/empty-state";
import { PermissionRequest } from "@/components/permission-request";
import { PhotoSwiper } from "@/components/photo-swiper";
import { StatsHeader } from "@/components/stats-header";
import { ThemedView } from "@/components/themed-view";
import { Button } from "@/components/ui/button";
import { usePhotos } from "@/hooks/use-photos";
import { usePhotoStore } from "@/stores/photo-store";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();

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
    const success = await confirmDeletion();
    if (success) {
      clearDeletionPhotos();
    }
  }, [confirmDeletion, clearDeletionPhotos]);

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
    <ThemedView
      style={[styles.container, { paddingTop: insets.top }]}
      transparent
    >
      <StatsHeader
        currentIndex={currentIndex}
        totalCount={totalCount}
        deletedCount={deletedCount}
        actionButton={
          deletedCount > 0 ? (
            <Button
              onPress={handleConfirmDeletion}
              title={`Delete ${deletedCount}`}
              style={styles.headerConfirmButton}
              textStyle={styles.headerConfirmButtonText}
              variant="danger"
            />
          ) : undefined
        }
      />

      {isComplete ? (
        <ScrollView
          contentContainerStyle={[
            styles.completeContainer,
            { paddingBottom: tabBarHeight + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <EmptyState />
        </ScrollView>
      ) : (
        <>
          <View style={styles.swiperContainer}>
            <PhotoSwiper
              photos={photos}
              currentIndex={currentIndex}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleKeep}
            />
          </View>

          <View style={[styles.footer, { paddingBottom: tabBarHeight + 30 }]}>
            <ActionButtons
              onDelete={handleDelete}
              onKeep={handleKeep}
              onUndo={handleUndo}
              canUndo={deletedCount > 0}
            />
          </View>
        </>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  swiperContainer: {
    flex: 1,
    minHeight: 200,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  completeContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerConfirmButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerConfirmButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
