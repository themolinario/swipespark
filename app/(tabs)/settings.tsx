import { ThemedText } from "@/components/themed-text";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { getDiskInfo } from "@/modules/disk-info";
import { useStatsStore } from "@/stores/stats-store";
import { setLanguage } from "@/i18n";
import { Settings, Globe, HardDrive, ImageMinus, Trash2, Check } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const LANGUAGES = [
    { code: "en", labelKey: "settings.languageEn" },
    { code: "it", labelKey: "settings.languageIt" },
] as const;

function formatSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SettingsScreen() {
    const { t, i18n } = useTranslation();
    const insets = useSafeAreaInsets();
    const { totalPhotosDeleted, totalBytesFreed } = useStatsStore();
    const [currentLang, setCurrentLang] = useState(i18n.language);

    const { total: totalDisk, available: availableDisk } = getDiskInfo();
    const usedDisk = totalDisk - availableDisk;
    const usedPercentage = totalDisk > 0 ? (usedDisk / totalDisk) * 100 : 0;
    const barColor = usedPercentage >= 90 ? "#ff4444" : usedPercentage >= 80 ? "#ffaa00" : "#4ade80";

    const handleLanguageChange = async (code: string) => {
        setCurrentLang(code);
        await setLanguage(code);
    };

    return (
        <FuturisticHomeBackground style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <View style={styles.headerRow}>
                        <View style={styles.headerIconGlow}>
                            <Settings size={24} color="#4ade80" />
                        </View>
                        <ThemedText style={styles.title}>{t("settings.title")}</ThemedText>
                    </View>
                </View>

                <View style={[styles.separator, { experimental_backgroundImage: 'linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.5), rgba(74,222,128,0))' }]} />

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Globe size={16} color="#4ade80" />
                        <ThemedText style={styles.sectionTitle}>{t("settings.language")}</ThemedText>
                    </View>
                    <View style={styles.languageList}>
                        {LANGUAGES.map((lang) => (
                            <Pressable
                                key={lang.code}
                                style={[styles.languageRow, currentLang === lang.code && styles.languageRowActive]}
                                onPress={() => handleLanguageChange(lang.code)}
                            >
                                <ThemedText style={[styles.languageLabel, currentLang === lang.code && styles.languageLabelActive]}>
                                    {t(lang.labelKey)}
                                </ThemedText>
                                {currentLang === lang.code && <Check size={18} color="#4ade80" />}
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <HardDrive size={16} color="#4ade80" />
                        <ThemedText style={styles.sectionTitle}>{t("settings.deviceStorage")}</ThemedText>
                    </View>
                    <View style={styles.storageCard}>
                        <View style={styles.storageBar}>
                            <View style={[styles.storageBarFill, { width: `${Math.min(usedPercentage, 100)}%`, backgroundColor: barColor }]} />
                        </View>
                        <View style={styles.storageLabels}>
                            <ThemedText style={styles.storageDetail}>
                                {t("settings.used", { size: formatSize(usedDisk) })}
                            </ThemedText>
                            <ThemedText style={styles.storageDetail}>
                                {t("settings.available", { size: formatSize(availableDisk) })}
                            </ThemedText>
                            <ThemedText style={styles.storageDetail}>
                                {t("settings.total", { size: formatSize(totalDisk) })}
                            </ThemedText>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionTitle}>{t("settings.lifetimeStats")}</ThemedText>
                    </View>
                    <View style={styles.statsCard}>
                        <View style={styles.statItem}>
                            <ImageMinus size={20} color="#ff6b6b" />
                            <ThemedText style={styles.statValue}>
                                {totalPhotosDeleted.toLocaleString()}
                            </ThemedText>
                            <ThemedText style={styles.statLabel}>
                                {t("settings.photosDeleted")}
                            </ThemedText>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Trash2 size={20} color="#4ade80" />
                            <ThemedText style={styles.statValue}>
                                {formatSize(totalBytesFreed)}
                            </ThemedText>
                            <ThemedText style={styles.statLabel}>
                                {t("settings.totalFreed")}
                            </ThemedText>
                        </View>
                    </View>
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
        paddingBottom: 120,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    headerIconGlow: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(74,222,128,0.1)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.3)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#4ade80",
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 10,
        shadowOpacity: 0.3,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        lineHeight: 36,
        color: "#fff",
        textShadowColor: "rgba(74,222,128,0.3)",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    separator: {
        height: 1,
        marginHorizontal: 20,
        marginBottom: 24,
    },
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: "rgba(74,222,128,0.7)",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    languageList: {
        borderRadius: 14,
        borderCurve: "continuous",
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.1)",
    },
    languageRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: "rgba(74,222,128,0.03)",
        borderBottomWidth: 1,
        borderBottomColor: "rgba(74,222,128,0.08)",
    },
    languageRowActive: {
        backgroundColor: "rgba(74,222,128,0.08)",
    },
    languageLabel: {
        fontSize: 16,
        color: "rgba(255,255,255,0.6)",
    },
    languageLabelActive: {
        color: "#fff",
        fontWeight: "600",
    },
    storageCard: {
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 16,
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.1)",
    },
    storageBar: {
        height: 8,
        borderRadius: 4,
        backgroundColor: "rgba(255,255,255,0.1)",
        overflow: "hidden",
        marginBottom: 10,
    },
    storageBarFill: {
        height: "100%",
        borderRadius: 4,
    },
    storageLabels: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    storageDetail: {
        fontSize: 12,
        fontWeight: "500",
        color: "rgba(255,255,255,0.5)",
    },
    statsCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        borderCurve: "continuous",
        padding: 20,
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.1)",
    },
    statItem: {
        flex: 1,
        alignItems: "center",
        gap: 6,
    },
    statValue: {
        fontSize: 22,
        fontWeight: "700",
        color: "#fff",
    },
    statLabel: {
        fontSize: 11,
        fontWeight: "500",
        color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase",
        letterSpacing: 0.3,
    },
    statDivider: {
        width: 1,
        height: 50,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
});
