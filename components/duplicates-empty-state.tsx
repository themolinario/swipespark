import { ThemedText } from "@/components/themed-text";
import { AnimatedScanner } from "@/components/ui/animated-scanner";
import { AlertCircle, Images, RefreshCcw, Search } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";

interface DuplicatesEmptyStateProps {
  isScanning: boolean;
  progress: number;
  scanStatusText: string;
  hasPermission: boolean | null;
  hasScannedOnce: boolean;
  onScan: (rescan?: boolean) => void;
}

export function DuplicatesEmptyState({
  isScanning,
  progress,
  scanStatusText,
  hasPermission,
  hasScannedOnce,
  onScan,
}: DuplicatesEmptyStateProps) {
  const { t } = useTranslation();

  if (isScanning) {
    const progressPercent = Math.round(progress * 100);
    return (
      <View style={styles.container}>
        <View style={styles.iconGlow}>
          <AnimatedScanner color="#4ade80" size={72} />
        </View>
        <ThemedText style={styles.title}>{t("duplicates.scanningLibrary")}</ThemedText>
        <ThemedText style={styles.subtitle}>
          {scanStatusText || t("duplicates.scanningSubtitle")}
        </ThemedText>
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progressPercent}%`,
                experimental_backgroundImage:
                  "linear-gradient(to right, #4ade80, #38E0D2)",
              },
            ]}
          />
        </View>
        <ThemedText style={styles.progressText}>
          {t("duplicates.percentComplete", { percent: (progress * 100).toFixed(1) })}
        </ThemedText>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <View style={styles.iconGlow}>
          <AlertCircle size={72} color="#4ade80" />
        </View>
        <ThemedText style={styles.title}>{t("duplicates.permissionNeeded")}</ThemedText>
        <ThemedText style={styles.subtitle}>{t("duplicates.permissionMessage")}</ThemedText>
        <Pressable onPress={() => onScan()} style={styles.scanButton}>
          <AlertCircle size={20} color="#4ade80" />
          <ThemedText style={styles.scanButtonText}>{t("duplicates.grantPermission")}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconGlow}>
        <Images size={72} color="#4ade80" />
      </View>
      <ThemedText style={styles.title}>
        {hasScannedOnce ? t("duplicates.noDuplicatesFound") : t("duplicates.startScanTitle")}
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        {hasScannedOnce ? t("duplicates.noDuplicatesMessage") : t("duplicates.startScanMessage")}
      </ThemedText>
      <Pressable onPress={() => onScan(hasScannedOnce)} style={styles.scanButton}>
        {hasScannedOnce ? (
          <RefreshCcw size={20} color="#4ade80" />
        ) : (
          <Search size={20} color="#4ade80" />
        )}
        <ThemedText style={styles.scanButtonText}>
          {hasScannedOnce ? t("duplicates.scanAgain") : t("duplicates.startScan")}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  iconGlow: {
    padding: 20,
    borderRadius: 60,
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 0.4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 12,
    color: "#fff",
    textShadowColor: "rgba(74,222,128,0.2)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.45)",
    textAlign: "center",
    lineHeight: 22,
  },
  progressBarContainer: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderRadius: 3,
    marginTop: 24,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressText: {
    marginTop: 12,
    fontSize: 13,
    color: "rgba(74,222,128,0.6)",
  },
  scanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    borderCurve: "continuous",
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.4)",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.3,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4ade80",
    letterSpacing: 0.5,
  },
});
