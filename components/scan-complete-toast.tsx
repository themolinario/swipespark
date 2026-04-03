import { useSmartCleanStore } from "@/stores/smart-clean-store";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react-native";

const DISPLAY_DURATION = 4000;

export function ScanCompleteToast() {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const scanComplete = useSmartCleanStore((s) => s.scanComplete);
    const matchedCount = useSmartCleanStore((s) => s.matchedPhotos.length);

    const [visible, setVisible] = useState(false);
    const translateY = useRef(new Animated.Value(-120)).current;
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevComplete = useRef(false);

    useEffect(() => {
        if (scanComplete && !prevComplete.current) {
            prevComplete.current = true;
            setVisible(true);
            translateY.setValue(-120);
            Animated.spring(translateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 80,
                friction: 10,
            }).start();
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(dismiss, DISPLAY_DURATION);
        } else if (!scanComplete) {
            prevComplete.current = false;
            setVisible(false);
            translateY.setValue(-120);
        }
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [scanComplete]);

    const dismiss = () => {
        if (timer.current) clearTimeout(timer.current);
        Animated.timing(translateY, {
            toValue: -120,
            duration: 280,
            useNativeDriver: true,
        }).start(() => setVisible(false));
    };

    const handlePress = () => {
        dismiss();
        router.push("/(tabs)/smart-clean");
    };

    if (!visible) return null;

    return (
        <Animated.View
            style={[styles.wrapper, { top: insets.top + 12, transform: [{ translateY }] }]}
            pointerEvents="box-none"
        >
            <Pressable style={({ pressed }) => [styles.toast, pressed && { opacity: 0.85 }]} onPress={handlePress}>
                <View style={styles.iconWrapper}>
                    <Check size={20} color="#4ade80" />
                </View>
                <View style={styles.textWrapper}>
                    <Text style={styles.title}>{t("smart.scanCompleteToastTitle")}</Text>
                    <Text style={styles.body}>{t("smart.scanCompleteToastBody", { count: matchedCount })}</Text>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        left: 16,
        right: 16,
        zIndex: 9999,
    },
    toast: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(74,222,128,0.35)",
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 12,
        shadowColor: "#4ade80",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 8,
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(74,222,128,0.12)",
        alignItems: "center",
        justifyContent: "center",
    },
    textWrapper: {
        flex: 1,
        gap: 2,
    },
    title: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
        letterSpacing: 0.2,
    },
    body: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 12,
        letterSpacing: 0.1,
    },
});
