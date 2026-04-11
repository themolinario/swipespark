import { PhotoAsset } from "@/services/media-library.service";
import { Image } from "expo-image";
import { Check, Play } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export interface PhotoGridItemTheme {
  borderDefault: string;
  borderSelected: string;
  checkCircleSelected: string;
}

interface PhotoGridItemProps {
  photo: PhotoAsset;
  isSelected: boolean;
  isSelectMode: boolean;
  itemSize: number;
  gap: number;
  theme: PhotoGridItemTheme;
  defaultOpacity: number;
  selectedOpacity: number;
  onPress: (photo: PhotoAsset) => void;
  onLongPress: (photo: PhotoAsset) => void;
  actionIcon?: React.ReactNode;
  onActionPress?: (photo: PhotoAsset) => void;
}

export const PhotoGridItem = React.memo(function PhotoGridItem({
  photo,
  isSelected,
  isSelectMode,
  itemSize,
  gap,
  theme,
  defaultOpacity,
  selectedOpacity,
  onPress,
  onLongPress,
  actionIcon,
  onActionPress,
}: PhotoGridItemProps) {
  return (
    <Pressable
      style={[styles.item, { width: itemSize, height: itemSize, margin: gap / 2 }]}
      onLongPress={() => onLongPress(photo)}
      onPress={() => onPress(photo)}
    >
      <View
        style={[
          styles.wrapper,
          { borderColor: isSelected ? theme.borderSelected : theme.borderDefault },
        ]}
      >
        <Image
          source={{ uri: photo.uri }}
          style={[styles.photo, { opacity: isSelected ? selectedOpacity : defaultOpacity }]}
          contentFit="cover"
          transition={200}
        />
        {photo.mediaType === "video" && (
          <View style={styles.videoBadge}>
            <Play size={10} color="#fff" fill="#fff" />
            <Text style={styles.videoBadgeText}>{formatDuration(photo.duration)}</Text>
          </View>
        )}
      </View>
      {isSelectMode ? (
        <View
          style={[
            styles.checkCircle,
            isSelected && {
              backgroundColor: theme.checkCircleSelected,
              borderColor: theme.checkCircleSelected,
              shadowColor: theme.checkCircleSelected,
            },
          ]}
        >
          {isSelected && <Check size={14} color="#fff" />}
        </View>
      ) : actionIcon != null ? (
        <Pressable
          style={styles.actionButton}
          hitSlop={16}
          onPress={(e) => {
            e.stopPropagation?.();
            onActionPress?.(photo);
          }}
        >
          {actionIcon}
        </Pressable>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  item: {
    overflow: "visible",
  },
  wrapper: {
    flex: 1,
    borderRadius: 10,
    borderCurve: "continuous",
    overflow: "hidden",
    borderWidth: 1,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  videoBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderCurve: "continuous",
  },
  videoBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  actionButton: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    justifyContent: "center",
    alignItems: "center",
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
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.6,
  },
});
