import { GlassView } from "@/components/ui/glass-view";
import { memo } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
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
  const formattedSize = formatSize(freedBytes);
  const photoLabel = deletedCount === 1 ? "photo" : "photos";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <GlassView style={styles.modal} tint="default">
          <ThemedText style={styles.title} lightColor="#000" darkColor="#fff">
            Done!
          </ThemedText>
          <ThemedText style={styles.subtitle} lightColor="#333" darkColor="#ddd">
            {deletedCount} {photoLabel} permanently deleted
          </ThemedText>
          <View style={styles.spaceContainer}>
            <ThemedText style={styles.spaceLabel} lightColor="#666" darkColor="#aaa">
              Space freed
            </ThemedText>
            <ThemedText style={styles.spaceValue} lightColor="#007aff" darkColor="#4da6ff">
              {formattedSize}
            </ThemedText>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <ThemedText style={styles.closeText}>Great!</ThemedText>
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
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  modal: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 6,
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
    paddingHorizontal: 32,
    paddingVertical: 16,
    marginBottom: 24,
    width: "100%",
  },
  spaceLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spaceValue: {
    fontSize: 36,
    fontWeight: "700",
  },
  closeButton: {
    backgroundColor: "#007aff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
    width: "100%",
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});










