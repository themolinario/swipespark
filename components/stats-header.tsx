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
  const progress = totalCount > 0 ? ((currentIndex + 1) / totalCount) * 100 : 0;

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{currentIndex + 1}</ThemedText>
          <ThemedText style={styles.statLabel}>/ {totalCount}</ThemedText>
        </View>
        {actionButton}
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
    fontWeight: "700",
  },
  deleteValue: {
    color: "#ff3b30",
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.6,
  },
  progressContainer: {
    height: 4,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#007aff",
    borderRadius: 2,
  },
});
