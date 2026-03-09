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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Undo2, Trash2 } from "lucide-react-native";
import { PhotoAsset } from "@/services/media-library.service";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface PhotoPreviewModalProps {
  visible: boolean;
  photos: PhotoAsset[];
  initialIndex: number;
  onClose: () => void;
  variant: "kept" | "delete";
  onRestore?: (photo: PhotoAsset) => void;
  onDelete?: (photo: PhotoAsset) => void;
}

export function PhotoPreviewModal({
  visible,
  photos,
  initialIndex,
  onClose,
  variant,
  onRestore,
  onDelete,
}: PhotoPreviewModalProps) {
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      // Scroll to initial index after modal opens
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

  const renderPhoto = useCallback(
    ({ item }: { item: PhotoAsset }) => (
      <View style={styles.slide}>
        <Image
          source={{ uri: item.uri }}
          style={styles.image}
          contentFit="contain"
          transition={200}
        />
      </View>
    ),
    [],
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
        {/* Close button */}
        <Pressable
          style={[styles.closeButton, { top: insets.top + 12 }]}
          onPress={onClose}
          hitSlop={16}
        >
          <X size={24} color="#fff" />
        </Pressable>

        {/* Counter */}
        <View style={[styles.counter, { top: insets.top + 18 }]}>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
        </View>

        {/* Photo carousel */}
        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderPhoto}
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

        {/* Action buttons */}
        <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + 20 }]}>
          {variant === "kept" ? (
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
              <Text style={styles.actionButtonText}>Remove from list</Text>
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
                <Text style={styles.actionButtonText}>Restore</Text>
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
                <Text style={styles.actionButtonText}>Delete</Text>
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
    gap: 8,
  },
  restoreButton: {
    backgroundColor: "#34c759",
    shadowColor: "#34c759",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  deleteButton: {
    backgroundColor: "#ff3b30",
    shadowColor: "#ff3b30",
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
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


