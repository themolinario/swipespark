import { Sparkles } from "lucide-react-native";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

export const EmptyState = memo(function EmptyState() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Sparkles size={72} color="#4ade80" strokeWidth={1.5} />
        </View>
        <ThemedText style={styles.title}>All done!</ThemedText>
        <ThemedText style={styles.description}>
          You&apos;ve reviewed all the photos in your camera roll.
        </ThemedText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  content: {
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(74, 222, 128, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    color: "#4ade80",
    letterSpacing: 1,
    textShadowColor: "rgba(74, 222, 128, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    color: "rgba(255, 255, 255, 0.7)",
    lineHeight: 24,
  },
});
