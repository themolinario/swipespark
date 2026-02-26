import { GlassView } from "@/components/ui/glass-view";
import { memo } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

interface ConfirmDeletionModalProps {
  visible: boolean;
  deletedCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeletionModal = memo(function ConfirmDeletionModal({
  visible,
  deletedCount,
  onConfirm,
  onCancel,
}: ConfirmDeletionModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <GlassView style={styles.modal} tint="default">
          <ThemedText style={styles.icon}>🗑️</ThemedText>
          <ThemedText style={styles.title} lightColor="#000" darkColor="#fff">
            Delete {deletedCount} photos?
          </ThemedText>
          <ThemedText
            style={styles.description}
            lightColor="#666"
            darkColor="#aaa"
          >
            This action cannot be undone. The photos will be moved to the trash.
          </ThemedText>
          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
            >
              <ThemedText
                style={styles.cancelText}
                lightColor="#007aff"
                darkColor="#007aff"
              >
                Cancel
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.button, styles.confirmButton]}
              onPress={onConfirm}
            >
              <ThemedText style={styles.confirmText}>Delete</ThemedText>
            </Pressable>
          </View>
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
    padding: 24,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
    overflow: "hidden",
  },
  icon: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  confirmButton: {
    backgroundColor: "#ff3b30",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
