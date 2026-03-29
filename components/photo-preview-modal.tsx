import { Image } from "expo-image";
import React, { useCallback, useRef, useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Undo2, Trash2, Play } from "lucide-react-native";
import { PhotoAsset } from "@/services/media-library.service";

let videoModule: { useVideoPlayer: any; VideoView: any } | null = null;
try {
  videoModule = require("expo-video");
} catch {
  // expo-video not available
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface PhotoPreviewModalProps {
  visible: boolean;
  photos: PhotoAsset[];
  initialIndex: number;
  onClose: () => void;
  variant: "kept" | "delete" | "view-only";
  onRestore?: (photo: PhotoAsset) => void;
  onDelete?: (photo: PhotoAsset) => void;
}

function ImageSlide({ item }: { item: PhotoAsset }) {
  return (
    <View style={styles.slide}>
      <Image
        source={{ uri: item.uri }}
        style={styles.image}
        contentFit="contain"
        transition={200}
      />
    </View>
  );
}

const VideoSlideInner = React.memo(function VideoSlideInner({ item, playing }: { item: PhotoAsset; playing: boolean }) {
  const player = videoModule!.useVideoPlayer(item.uri, (p: any) => {
    p.loop = false;
  });

  useEffect(() => {
    if (playing) {
      player.play();
    } else {
      player.pause();
    }
  }, [playing, player]);

  useEffect(() => {
    return () => {
      try {
        player.pause();
        player.release?.();
      } catch {}
    };
  }, [player]);

  return (
    <View style={styles.slide}>
      {React.createElement(videoModule!.VideoView, {
        player,
        style: styles.video,
        contentFit: "contain",
        nativeControls: true,
      })}
    </View>
  );
});

const VideoSlide = React.memo(function VideoSlide({ item, playing }: { item: PhotoAsset; playing: boolean }) {
  if (!videoModule) {
    return (
      <View style={styles.slide}>
        <View style={styles.videoFallback}>
          <Image
            source={{ uri: item.uri }}
            style={styles.image}
            contentFit="contain"
            transition={200}
          />
          <View style={styles.playOverlay}>
            <Play size={48} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" />
          </View>
        </View>
      </View>
    );
  }
  return <VideoSlideInner item={item} playing={playing} />;
});

export function PhotoPreviewModal({
  visible,
  photos,
  initialIndex,
  onClose,
  variant,
  onRestore,
  onDelete,
}: PhotoPreviewModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: initialIndex * SCREEN_WIDTH,
          animated: false,
        });
      }, 50);
    }
  }, [visible, initialIndex]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const currentPhoto = photos[currentIndex];

  const renderItem = useCallback(
    ({ item, index }: { item: PhotoAsset; index: number }) => {
      if (item.mediaType === "video") {
        return (
          <VideoSlide
            item={item}
            playing={visible && currentIndex === index}
          />
        );
      }
      return <ImageSlide item={item} />;
    },
    [visible, currentIndex],
  );

  if (photos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={16}
        >
          <X size={24} color="#fff" />
        </Pressable>

        <View style={[styles.counter, { top: insets.top + 18 }]}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          style={styles.carousel}
        />

        <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + 20 }]}>
          {variant === "view-only" ? null : variant === "kept" ? (
            <Pressable
              style={[styles.actionButton, styles.restoreButton]}
              onPress={() => {
                if (currentPhoto && onRestore) {
                  onRestore(currentPhoto);
                }
              }}
              hitSlop={8}
            >
              <Undo2 size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t("preview.removeFromList")}</Text>
            </Pressable>
          ) : (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionButton, styles.restoreButton, styles.flex1]}
                onPress={() => {
                  if (currentPhoto && onRestore) {
                    onRestore(currentPhoto);
                  }
                }}
                hitSlop={8}
              >
                <Undo2 size={20} color="#fff" />
                <Text style={styles.actionButtonText}>{t("preview.restore")}</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.deleteButton, styles.flex1]}
                onPress={() => {
                  if (currentPhoto && onDelete) {
                    onDelete(currentPhoto);
                  }
                }}
                hitSlop={8}
              >
                <Trash2 size={20} color="#fff" />
                <Text style={styles.actionButtonText}>{t("preview.delete")}</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  carousel: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  videoFallback: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: "center",
    alignItems: "center",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  closeButton: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 10,
  },
  counter: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  counterText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    fontWeight: "600",
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderCurve: 'continuous',
    gap: 8,
  },
  restoreButton: {
    backgroundColor: "#34c759",
    shadowColor: '#34c759',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.4,
  },
  deleteButton: {
    backgroundColor: "#ff3b30",
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.4,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  flex1: {
    flex: 1,
  },
});
