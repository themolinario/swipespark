import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  ViewProps,
} from "react-native";
import Animated,
{
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

// ─── Main Component ─────────────────────────────────────────────
export function FuturisticHomeBackground({
  children,
  style,
  ...props
}: ViewProps) {
  const overlayPhase = useSharedValue(0);

  useEffect(() => {
    overlayPhase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 10000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 10000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [overlayPhase]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(overlayPhase.value, [0, 1], [0.3, 0.65]),
  }));

  const vignetteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(overlayPhase.value, [0, 1], [0.5, 0.7]),
  }));

  return (
    <View style={[styles.container, style]} {...props}>
      {/* Base gradient */}
      <LinearGradient
        colors={["#010D08", "#031F14", "#010A06", "#000000"]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Animated overlay gradient */}
      <Animated.View
        style={[StyleSheet.absoluteFillObject, overlayStyle]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={[
            "rgba(14,41,27,0.6)",
            "rgba(21,58,38,0.35)",
            "rgba(8,15,11,0.7)",
          ]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Vignette */}
      <Animated.View
        pointerEvents="none"
        style={[styles.vignette, vignetteStyle]}
      />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 120,
    shadowOffset: { width: 0, height: 0 },
  },
});
