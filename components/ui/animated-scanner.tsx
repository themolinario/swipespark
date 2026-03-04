import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

interface AnimatedScannerProps {
    color?: string;
    size?: number;
}

const Ring = ({ delay, color, size }: { delay: number; color: string; size: number }) => {
    const ring = useSharedValue(0);

    useEffect(() => {
        ring.value = withDelay(
            delay,
            withRepeat(
                withTiming(1, {
                    duration: 3000,
                    easing: Easing.out(Easing.ease),
                }),
                -1,
                false
            )
        );
    }, [delay, ring]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: 1 - ring.value,
            transform: [
                {
                    scale: interpolate(ring.value, [0, 1], [0.3, 1.5]),
                },
            ],
        };
    });

    return (
        <Animated.View
            style={[
                styles.ring,
                {
                    borderColor: color,
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                },
                animatedStyle,
            ]}
        />
    );
};

export function AnimatedScanner({ color = "#007AFF", size = 80 }: AnimatedScannerProps) {
    const scale = useSharedValue(1);

    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1.1, {
                duration: 1500,
                easing: Easing.inOut(Easing.ease),
            }),
            -1,
            true // reverse
        );
    }, [scale]);

    const iconStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: scale.value }],
        };
    });

    return (
        <View style={[styles.container, { width: size * 1.5, height: size * 1.5 }]}>
            <Ring delay={0} color={color} size={size} />
            <Ring delay={1000} color={color} size={size} />
            <Ring delay={2000} color={color} size={size} />
            <Animated.View style={[styles.iconContainer, iconStyle]}>
                <Ionicons name="scan-outline" size={size * 0.5} color={color} />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
    },
    iconContainer: {
        position: "absolute",
        justifyContent: "center",
        alignItems: "center",
    },
    ring: {
        position: "absolute",
        borderWidth: 2,
    },
});
