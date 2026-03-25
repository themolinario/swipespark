import { GlassView } from "@/components/ui/glass-view";
import { useStatsStore } from "@/stores/stats-store";
import { memo } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getDiskInfo } from "@/modules/disk-info";
import { HardDrive, Trash2, ImageMinus } from "lucide-react-native";
import { ThemedText } from "./themed-text";

interface DeletionSuccessModalProps {
  visible: boolean;
  deletedCount: number;
  freedBytes: number;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DeletionSuccessModal = memo(function DeletionSuccessModal({
  visible,
  deletedCount,
  freedBytes,
  onClose,
}: DeletionSuccessModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { totalPhotosDeleted, totalBytesFreed } = useStatsStore();

  const { total: totalDisk, available: availableDisk } = getDiskInfo();
  const usedDisk = totalDisk - availableDisk;
  const usedPercentage = totalDisk > 0 ? (usedDisk / totalDisk) * 100 : 0;
  const barColor = usedPercentage >= 90 ? "#ff4444" : usedPercentage >= 80 ? "#ffaa00" : "#4ade80";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassView style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} tint="default">
          <View style={styles.handle} />

          <ThemedText style={styles.title} lightColor="#000" darkColor="#fff">
            {t("deletionSuccess.title")}
          </ThemedText>
          <ThemedText style={styles.subtitle} lightColor="#333" darkColor="#ddd">
            {t("deletionSuccess.subtitle", { count: deletedCount })}
          </ThemedText>

          <View style={styles.spaceContainer}>
            <View style={styles.spaceRow}>
              <Trash2 size={18} color="#4da6ff" />
              <ThemedText style={styles.spaceLabel} lightColor="#666" darkColor="#aaa">
                {t("deletionSuccess.spaceFreed")}
              </ThemedText>
            </View>
            <ThemedText style={styles.spaceValue} lightColor="#007aff" darkColor="#4da6ff">
              {formatSize(freedBytes)}
            </ThemedText>
          </View>

          <View style={styles.storageSection}>
            <View style={styles.storageTitleRow}>
              <HardDrive size={16} color="#aaa" />
              <ThemedText style={styles.storageTitleText} lightColor="#666" darkColor="#aaa">
                {t("deletionSuccess.deviceStorage")}
              </ThemedText>
            </View>
            <View style={styles.storageBar}>
              <View style={[styles.storageBarFill, { width: `${Math.min(usedPercentage, 100)}%`, backgroundColor: barColor }]} />
            </View>
            <View style={styles.storageLabels}>
              <ThemedText style={styles.storageDetail} lightColor="#666" darkColor="#888">
                {t("deletionSuccess.used", { size: formatSize(usedDisk) })}
              </ThemedText>
              <ThemedText style={styles.storageDetail} lightColor="#666" darkColor="#888">
                {t("deletionSuccess.available", { size: formatSize(availableDisk) })}
              </ThemedText>
              <ThemedText style={styles.storageDetail} lightColor="#666" darkColor="#888">
                {t("deletionSuccess.total", { size: formatSize(totalDisk) })}
              </ThemedText>
            </View>
          </View>

          <View style={styles.lifetimeSection}>
            <ThemedText style={styles.lifetimeSectionTitle} lightColor="#666" darkColor="#aaa">
              {t("deletionSuccess.lifetimeStats")}
            </ThemedText>
            <View style={styles.lifetimeRow}>
              <View style={styles.lifetimeStat}>
                <ImageMinus size={18} color="#ff6b6b" />
                <ThemedText style={styles.lifetimeValue} lightColor="#000" darkColor="#fff">
                  {totalPhotosDeleted.toLocaleString()}
                </ThemedText>
                <ThemedText style={styles.lifetimeLabel} lightColor="#666" darkColor="#888">
                  {t("deletionSuccess.photosDeleted")}
                </ThemedText>
              </View>
              <View style={styles.lifetimeDivider} />
              <View style={styles.lifetimeStat}>
                <Trash2 size={18} color="#4ade80" />
                <ThemedText style={styles.lifetimeValue} lightColor="#000" darkColor="#fff">
                  {formatSize(totalBytesFreed)}
                </ThemedText>
                <ThemedText style={styles.lifetimeLabel} lightColor="#666" darkColor="#888">
                  {t("deletionSuccess.totalFreed")}
                </ThemedText>
              </View>
            </View>
          </View>

          <Pressable style={styles.closeButton} onPress={onClose}>
            <ThemedText style={styles.closeText}>{t("deletionSuccess.close")}</ThemedText>
          </Pressable>
        </GlassView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderCurve: "continuous",
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: "rgba(30, 30, 30, 0.95)",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  spaceContainer: {
    alignItems: "center",
    backgroundColor: "rgba(0, 122, 255, 0.08)",
    borderRadius: 14,
    borderCurve: "continuous",
    paddingHorizontal: 24,
    paddingVertical: 14,
    marginBottom: 16,
  },
  spaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  spaceLabel: {
    fontSize: 13,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spaceValue: {
    fontSize: 36,
    fontWeight: "700",
    lineHeight: 44,
  },
  storageSection: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    borderCurve: "continuous",
    padding: 16,
    marginBottom: 16,
  },
  storageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  storageTitleText: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  storageBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    marginBottom: 8,
  },
  storageBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#4da6ff",
  },
  storageLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  storageDetail: {
    fontSize: 12,
    fontWeight: "500",
  },
  storageTotal: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 4,
  },
  lifetimeSection: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    borderCurve: "continuous",
    padding: 16,
    marginBottom: 20,
  },
  lifetimeSectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: "center",
  },
  lifetimeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  lifetimeStat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  lifetimeValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  lifetimeLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  lifetimeDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  closeButton: {
    backgroundColor: "#007aff",
    borderRadius: 12,
    borderCurve: "continuous",
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
