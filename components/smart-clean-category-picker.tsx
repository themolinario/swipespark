import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { SmartCategory } from "@/utils/category-mapper";
import {
  Users,
  Image as ImageIcon,
  FileText,
  PawPrint,
  Utensils,
  Car,
  Home,
  Search,
  ArrowLeft,
  Wand2,
  Square,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type CategoryLabelKey =
  | "smart.categoryPeople"
  | "smart.categoryLandscapes"
  | "smart.categoryDocuments"
  | "smart.categoryAnimals"
  | "smart.categoryFood"
  | "smart.categoryVehicles"
  | "smart.categoryInteriors"
  | "smart.categoryCustom";

export const SMART_CATEGORIES: { label: SmartCategory; labelKey: CategoryLabelKey; Icon: any }[] = [
  { label: "People", labelKey: "smart.categoryPeople", Icon: Users },
  { label: "Landscapes", labelKey: "smart.categoryLandscapes", Icon: ImageIcon },
  { label: "Documents", labelKey: "smart.categoryDocuments", Icon: FileText },
  { label: "Animals", labelKey: "smart.categoryAnimals", Icon: PawPrint },
  { label: "Food", labelKey: "smart.categoryFood", Icon: Utensils },
  { label: "Vehicles", labelKey: "smart.categoryVehicles", Icon: Car },
  { label: "Interiors", labelKey: "smart.categoryInteriors", Icon: Home },
  { label: "Custom", labelKey: "smart.categoryCustom", Icon: Search },
];

interface SmartCleanCategoryPickerProps {
  isSearchRunning: boolean;
  onCategoryPress: (category: SmartCategory) => void;
  onStop: () => void;
  onBack?: () => void;
}

export function SmartCleanCategoryPicker({
  isSearchRunning,
  onCategoryPress,
  onStop,
  onBack,
}: SmartCleanCategoryPickerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <FuturisticHomeBackground style={styles.container}>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isSearchRunning}
      >
        <View style={styles.headerTextContainer}>
          <View style={styles.headerRow}>
            {onBack && (
              <Pressable onPress={onBack} style={styles.backButton}>
                <ArrowLeft size={22} color="#4ade80" />
              </Pressable>
            )}
            <View style={styles.headerIconGlow}>
              <Wand2 size={24} color="#4ade80" />
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {t("smart.title")}
            </Text>
          </View>
          <Text style={styles.subtitle} numberOfLines={3}>
            {t("smart.subtitle")}
          </Text>
        </View>

        <View
          style={[
            styles.separator,
            {
              experimental_backgroundImage:
                "linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.4), rgba(74,222,128,0))",
            },
          ]}
        />

        {isSearchRunning && (
          <View style={styles.backgroundSearchBanner}>
            <Text style={styles.backgroundSearchText}>
              {t("smart.backgroundSearchRunning")}
            </Text>
            <Pressable
              style={({ pressed }) => [styles.stopButton, pressed && { opacity: 0.7 }]}
              onPress={onStop}
            >
              <Square size={16} color="#ff6b6b" />
              <Text style={styles.stopButtonText}>{t("common.stop")}</Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.categoryGrid, isSearchRunning && styles.disabledOverlay]}>
          {SMART_CATEGORIES.map((cat) => (
            <Pressable
              key={cat.label}
              style={({ pressed }) => [
                styles.categoryCard,
                pressed && !isSearchRunning && styles.categoryCardPressed,
                isSearchRunning && styles.categoryCardDisabled,
              ]}
              onPress={() => !isSearchRunning && onCategoryPress(cat.label)}
              disabled={isSearchRunning}
            >
              <View style={styles.categoryIconWrapper}>
                <cat.Icon
                  size={32}
                  color={isSearchRunning ? "rgba(74,222,128,0.3)" : "#4ade80"}
                />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  isSearchRunning && styles.categoryLabelDisabled,
                ]}
              >
                {t(cat.labelKey)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </FuturisticHomeBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  headerTextContainer: {
    marginTop: 16,
    marginBottom: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 2,
  },
  headerIconGlow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    shadowOpacity: 0.4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(74,222,128,0.1)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(74,222,128,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
    color: "rgba(255,255,255,0.45)",
    lineHeight: 18,
  },
  separator: {
    height: 1,
    marginVertical: 14,
  },
  backgroundSearchBanner: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    borderCurve: "continuous",
    backgroundColor: "rgba(74,222,128,0.08)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.25)",
    gap: 12,
    alignItems: "center",
  },
  backgroundSearchText: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderCurve: "continuous",
    backgroundColor: "rgba(255,107,107,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.4)",
  },
  stopButtonText: {
    color: "#ff6b6b",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledOverlay: {
    opacity: 0.4,
  },
  categoryCardDisabled: {
    borderColor: "rgba(74,222,128,0.06)",
  },
  categoryLabelDisabled: {
    color: "rgba(255,255,255,0.3)",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  categoryCard: {
    width: "46%",
    aspectRatio: 1.15,
    borderRadius: 16,
    borderCurve: "continuous",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
    backgroundColor: "rgba(74,222,128,0.04)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.15)",
  },
  categoryCardPressed: {
    backgroundColor: "rgba(74,222,128,0.12)",
    borderColor: "rgba(74,222,128,0.4)",
  },
  categoryIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(74,222,128,0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
});
