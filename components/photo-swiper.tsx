import { memo, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { PhotoCard } from "./photo-card";
import { PhotoAsset } from "@/services/media-library.service";

const VISIBLE_CARDS = 3;

interface PhotoSwiperProps {
  photos: PhotoAsset[];
  currentIndex: number;
  onSwipeLeft: (id: string) => void;
  onSwipeRight: () => void;
  cardHeight: number;
  onPress?: (photo: PhotoAsset) => void;
}

export const PhotoSwiper = memo(function PhotoSwiper({
  photos,
  currentIndex,
  onSwipeLeft,
  onSwipeRight,
  cardHeight,
  onPress,
}: PhotoSwiperProps) {
  const visiblePhotos = useMemo(() => {
    return photos.slice(currentIndex, currentIndex + VISIBLE_CARDS).reverse();
  }, [photos, currentIndex]);

  if (visiblePhotos.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {visiblePhotos.map((photo, index) => {
        const actualIndex = visiblePhotos.length - 1 - index;
        const isActive = actualIndex === 0;
        const scale = 1 - actualIndex * 0.05;
        const translateY = actualIndex * -10;

        return (
          <View
            key={photo.id}
            style={[
              styles.cardWrapper,
              {
                transform: [{ scale }, { translateY }],
                zIndex: VISIBLE_CARDS - actualIndex,
              },
            ]}
          >
            <PhotoCard
              photo={photo}
              onSwipeLeft={() => onSwipeLeft(photo.id)}
              onSwipeRight={onSwipeRight}
              isActive={isActive}
              cardHeight={cardHeight}
              onPress={onPress ? () => onPress(photo) : undefined}
            />
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cardWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
});
