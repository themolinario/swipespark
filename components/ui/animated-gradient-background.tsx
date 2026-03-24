import { useColorScheme } from "@/hooks/use-color-scheme";
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

    const bg1 = isDark
        ? 'linear-gradient(to bottom, #010D08, #0E291B, #000000)'
        : 'linear-gradient(to bottom, #f0faf4, #d6f5e0, #e8faf0)';

    const bg2 = isDark
        ? 'linear-gradient(to bottom, #000000, #010D08, #0E291B)'
        : 'linear-gradient(to bottom, #e8faf0, #f0faf4, #d6f5e0)';

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
            <View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: bg1 }]} />
            <Animated.View style={[StyleSheet.absoluteFill, { experimental_backgroundImage: bg2 }, animatedStyle]} pointerEvents="none" />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
