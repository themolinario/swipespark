import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
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
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];
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
        icon={<Ionicons name="trash" size={32} color="#fff" />}
        variant="danger"
        style={styles.button}
      />

      {canUndo && (
        <Button
          onPress={handleUndo}
          icon={<Ionicons name="arrow-undo" size={24} color={colors.text} />}
          variant="secondary"
          style={[styles.button, styles.undoButton]}
        />
      )}

      <Button
        onPress={handleKeep}
        icon={<Ionicons name="heart" size={36} color="#fff" />}
        variant="success"
        style={styles.button}
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    overflow: "visible",
  },

  undoButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    // backgroundColor: '#8e8e93', // Removed for glass effect
  },
});
