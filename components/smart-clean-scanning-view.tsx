import { AnimatedScanner } from "@/components/ui/animated-scanner";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { Square } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface SmartCleanScanningViewProps {
  scanningLabel: string;
  searchProgress: number;
  searchStatusText: string;
  onStop: () => void;
}

export function SmartCleanScanningView({
  scanningLabel,
  searchProgress,
  searchStatusText,
  onStop,
}: SmartCleanScanningViewProps) {
  const { t } = useTranslation();

  return (
    <FuturisticHomeBackground style={styles.container}>
      <View style={styles.scannerGlow}>
        <AnimatedScanner color="#4ade80" />
      </View>

      <Text style={styles.title}>{t("smart.scanningFor", { category: scanningLabel })}</Text>

      <Text style={styles.progress}>
        {t("smart.percentComplete", { percent: Math.round(searchProgress) })}
      </Text>

      {!!searchStatusText && (
        <Text style={styles.detail}>{searchStatusText}</Text>
      )}

      {searchProgress > 0 && searchProgress < 100 && (
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(searchProgress, 100)}%`,
                experimental_backgroundImage:
                  "linear-gradient(to right, #4ade80, #38E0D2, #2dd4bf)",
              },
            ]}
          />
        </View>
      )}

      <Text style={styles.backgroundHint}>{t("smart.backgroundSearchRunning")}</Text>

      <Pressable
        style={({ pressed }) => [styles.stopButton, pressed && { opacity: 0.7 }]}
        onPress={onStop}
      >
        <Square size={16} color="#ff6b6b" />
        <Text style={styles.stopButtonText}>{t("common.stop")}</Text>
      </Pressable>
    </FuturisticHomeBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  scannerGlow: {
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    shadowOpacity: 0.4,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginTop: 32,
    textAlign: "center",
    textShadowColor: "rgba(74,222,128,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  progress: {
    fontSize: 14,
    marginTop: 8,
    color: "rgba(74,222,128,0.6)",
  },
  detail: {
    fontSize: 12,
    marginTop: 4,
    color: "rgba(255,255,255,0.35)",
  },
  progressBarContainer: {
    width: "80%",
    height: 6,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderRadius: 3,
    marginTop: 24,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
  },
  backgroundHint: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 16,
    paddingHorizontal: 20,
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,107,107,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.3)",
  },
  stopButtonText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "600",
  },
});
