import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from "react-native-reanimated";

export function AnimatedGradientBackground({ children, style, ...props }: ViewProps) {
    const colorScheme = useColorScheme();

    const isDark = colorScheme === "dark";

    // Gradient Colors
    const colorsDark1 = ["#010D08", "#0E291B", "#000000"] as const;
    const colorsDark2 = ["#000000", "#010D08", "#0E291B"] as const;

    const colorsLight1 = ["#f0faf4", "#d6f5e0", "#e8faf0"] as const;
    const colorsLight2 = ["#e8faf0", "#f0faf4", "#d6f5e0"] as const;

    const colors1 = isDark ? colorsDark1 : colorsLight1;
    const colors2 = isDark ? colorsDark2 : colorsLight2;

    const progress = useSharedValue(0);

    useEffect(() => {
        progress.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0, { duration: 5000, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, [progress]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: progress.value,
        };
    });

    return (
        <View style={[styles.container, style]} {...props}>
            <LinearGradient
                colors={colors1}
                style={StyleSheet.absoluteFill}
            />
            <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]} pointerEvents="none">
                <LinearGradient
                    colors={colors2}
                    style={StyleSheet.absoluteFill}
                />
            </Animated.View>
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
