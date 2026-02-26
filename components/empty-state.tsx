import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

export const EmptyState = memo(function EmptyState() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ThemedText style={styles.icon}>🎉</ThemedText>
        <ThemedText style={styles.title}>All done!</ThemedText>
        <ThemedText style={styles.description}>
          You've reviewed all the photos in your camera roll.
        </ThemedText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  icon: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 24,
  },
});
