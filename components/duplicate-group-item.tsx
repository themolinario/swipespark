import { ThemedText } from "@/components/themed-text";
import {
  DUPLICATES_GAP,
  DUPLICATES_PHOTO_SIZE,
} from "@/hooks/use-duplicates-pan-selection";
import { PhotoAsset } from "@/services/media-library.service";
import { DuplicateGroup } from "@/utils/duplicate-detection";
import { Image } from "expo-image";
import { Check } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

interface DuplicateGroupItemProps {
  group: DuplicateGroup;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onHeaderLayout: (groupId: string, height: number) => void;
}

export const DuplicateGroupItem = React.memo(function DuplicateGroupItem({
  group,
  selectedIds,
  onToggleSelect,
  onHeaderLayout,
}: DuplicateGroupItemProps) {
  const { t } = useTranslation();
  const firstPhoto = group.photos[0] as PhotoAsset & { filename: string; width: number; height: number };

  return (
    <View style={styles.groupContainer}>
      <View
        style={styles.groupHeader}
        onLayout={(e) => onHeaderLayout(group.id, e.nativeEvent.layout.height)}
      >
        <View style={styles.groupHeaderText}>
          <ThemedText style={styles.groupTitle} numberOfLines={1}>
            {firstPhoto.filename}
          </ThemedText>
          <ThemedText style={styles.groupSubtitle}>
            {firstPhoto.width}x{firstPhoto.height} •{" "}
            {t("duplicates.copies", { count: group.photos.length })}
          </ThemedText>
        </View>
      </View>
      <View style={styles.groupPhotos}>
        {group.photos.map((photo) => {
          const isSelected = selectedIds.has(photo.id);
          return (
            <Pressable
              key={photo.id}
              style={styles.photoContainer}
              onPress={() => onToggleSelect(photo.id)}
            >
              <View style={[styles.photoWrapper, isSelected && styles.photoWrapperSelected]}>
                <Image
                  source={{ uri: photo.uri }}
                  style={[styles.photo, isSelected && styles.photoSelected]}
                  contentFit="cover"
                  transition={200}
                />
              </View>
              {isSelected && (
                <View style={styles.checkCircle}>
                  <Check size={14} color="#fff" />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  groupContainer: {
    marginBottom: 24,
    backgroundColor: "rgba(74,222,128,0.03)",
    borderRadius: 14,
    borderCurve: "continuous",
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.08)",
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  groupHeaderText: {
    flex: 1,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  groupSubtitle: {
    fontSize: 13,
    color: "rgba(74,222,128,0.6)",
    marginTop: 2,
  },
  groupPhotos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DUPLICATES_GAP,
  },
  photoContainer: {
    width: DUPLICATES_PHOTO_SIZE,
    height: DUPLICATES_PHOTO_SIZE,
  },
  photoWrapper: {
    flex: 1,
    borderRadius: 10,
    borderCurve: "continuous",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.12)",
  },
  photoWrapperSelected: {
    borderColor: "rgba(74,222,128,0.6)",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoSelected: {
    opacity: 0.65,
  },
  checkCircle: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4ade80",
    borderColor: "#4ade80",
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.6,
  },
});
