import { ThemedText } from "@/components/themed-text";
import { FuturisticHomeBackground } from "@/components/ui/futuristic-home-background";
import { DuplicatesContent } from "./duplicates";
import { SmartCleanContent } from "./smart-clean";
import { Copy, Wand2, Wrench } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ActiveView = "menu" | "duplicates" | "smart-clean";

export default function ToolsScreen() {
    const [activeView, setActiveView] = useState<ActiveView>("menu");
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();

    if (activeView === "duplicates") {
        return <DuplicatesContent onBack={() => setActiveView("menu")} />;
    }

    if (activeView === "smart-clean") {
        return <SmartCleanContent onBack={() => setActiveView("menu")} />;
    }

    return (
        <FuturisticHomeBackground style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <View style={styles.headerRow}>
                    <View style={styles.headerIconGlow}>
                        <Wrench size={24} color="#4ade80" />
                    </View>
                    <ThemedText style={styles.title}>{t("tools.title")}</ThemedText>
                </View>
            </View>

            <View style={[styles.separator, { experimental_backgroundImage: 'linear-gradient(to right, rgba(74,222,128,0), rgba(74,222,128,0.5), rgba(74,222,128,0))' }]} />

            <View style={styles.cardsContainer}>
                <Pressable
                    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                    onPress={() => setActiveView("duplicates")}
                >
                    <View style={styles.cardIconContainer}>
                        <Copy size={28} color="#4ade80" />
                    </View>
                    <View style={styles.cardText}>
                        <ThemedText style={styles.cardTitle}>{t("tools.duplicatesTitle")}</ThemedText>
                        <ThemedText style={styles.cardDesc}>{t("tools.duplicatesDesc")}</ThemedText>
                    </View>
                </Pressable>

                <Pressable
                    style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                    onPress={() => setActiveView("smart-clean")}
                >
                    <View style={styles.cardIconContainer}>
                        <Wand2 size={28} color="#4ade80" />
                    </View>
                    <View style={styles.cardText}>
                        <ThemedText style={styles.cardTitle}>{t("tools.smartCleanTitle")}</ThemedText>
                        <ThemedText style={styles.cardDesc}>{t("tools.smartCleanDesc")}</ThemedText>
                    </View>
                </Pressable>
            </View>
        </FuturisticHomeBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
    cardsContainer: {
        paddingHorizontal: 20,
        gap: 16,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        padding: 20,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: "rgba(74,222,128,0.04)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.15)",
    },
    cardPressed: {
        backgroundColor: "rgba(74,222,128,0.1)",
    },
    cardIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        borderCurve: "continuous",
        backgroundColor: "rgba(74,222,128,0.08)",
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.2)",
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#4ade80",
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 12,
        shadowOpacity: 0.2,
    },
    cardText: {
        flex: 1,
        gap: 4,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#fff",
    },
    cardDesc: {
        fontSize: 14,
        color: "rgba(255,255,255,0.5)",
        lineHeight: 20,
    },
});
