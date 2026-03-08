import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "./themed-text";

interface StatsHeaderProps {
  currentIndex: number;
  totalCount: number;
  deletedCount: number;
  actionButton?: React.ReactNode;
}

export const StatsHeader = memo(function StatsHeader({
  currentIndex,
  totalCount,
  deletedCount,
  actionButton,
}: StatsHeaderProps) {
  const displayedIndex = totalCount > 0 ? Math.min(currentIndex + 1, totalCount) : 0;
  const progress = totalCount > 0 ? (displayedIndex / totalCount) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{displayedIndex}</ThemedText>
          <ThemedText style={styles.statLabel}>/ {totalCount}</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, styles.deleteValue]}>
            {deletedCount}
          </ThemedText>
          <ThemedText style={styles.statLabel}>to delete</ThemedText>
        </View>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>
      {actionButton && (
          <View style={styles.actionButtonWrapper}>
            {actionButton}
          </View>
      )}

    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    textShadowColor: "rgba(255, 255, 255, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  deleteValue: {
    color: "#ff3b30",
    textShadowColor: "rgba(255, 59, 48, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  actionButtonWrapper: {
    alignItems: "center",
    marginTop: 10,
  },
  progressContainer: {
    height: 4,
    backgroundColor: "rgba(74, 222, 128, 0.15)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#4ade80",
    borderRadius: 2,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
});
