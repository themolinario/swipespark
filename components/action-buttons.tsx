import { Heart, Trash2, Undo2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "./ui/button";

interface ActionButtonsProps {
  onDelete: () => void;
  onKeep: () => void;
  onUndo: () => void;
  canUndo: boolean;
}

export const ActionButtons = memo(function ActionButtons({
  onDelete,
  onKeep,
  onUndo,
  canUndo,
}: ActionButtonsProps) {
  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete();
  };

  const handleKeep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onKeep();
  };

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUndo();
  };

  return (
    <View style={styles.container}>
      <Button
        onPress={handleDelete}
        icon={<Trash2 size={30} color="#ff3b30" />}
        variant="secondary" // Use secondary to prevent default primary background
        style={[styles.button, styles.deleteButton]} // We will override styles completely
      />

      {canUndo && (
        <Button
          onPress={handleUndo}
          icon={<Undo2 size={24} color="#ffffff" />}
          variant="secondary"
          style={[styles.button, styles.undoButton]}
        />
      )}

      <Button
        onPress={handleKeep}
        icon={<Heart size={32} color="#4ade80" />}
        variant="secondary"
        style={[styles.button, styles.keepButton]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderWidth: 1.5,
  },
  deleteButton: {
    borderColor: "#ff3b30",
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.6,
  },
  keepButton: {
    borderColor: "#4ade80",
    shadowColor: '#4ade80',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.6,
  },
  undoButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.3,
  },
});
