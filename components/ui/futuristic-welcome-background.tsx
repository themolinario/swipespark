import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, View, ViewProps } from "react-native";
import Animated,
{
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

type NodeConfig = {
  x: number;
  y: number;
  size: number;
  delay: number;
  floatX: number;
  floatY: number;
};

const NODES: NodeConfig[] = [
  { x: 0.12, y: 0.18, size: 5, delay: 0, floatX: 22, floatY: 34 },
  { x: 0.84, y: 0.14, size: 6, delay: 400, floatX: -16, floatY: 28 },
  { x: 0.72, y: 0.32, size: 8, delay: 1200, floatX: -28, floatY: 20 },
  { x: 0.22, y: 0.36, size: 7, delay: 800, floatX: 18, floatY: -30 },
  { x: 0.5, y: 0.12, size: 4, delay: 1600, floatX: -12, floatY: 24 },
  { x: 0.14, y: 0.7, size: 6, delay: 2100, floatX: 24, floatY: -26 },
  { x: 0.82, y: 0.64, size: 7, delay: 2400, floatX: -20, floatY: 22 },
  { x: 0.42, y: 0.82, size: 5, delay: 1100, floatX: 18, floatY: -18 },
  { x: 0.62, y: 0.9, size: 4, delay: 2800, floatX: -14, floatY: -24 },
];

function Particle({ config }: { config: NodeConfig }) {
  const pulse = useSharedValue(0);
  const drift = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    drift.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 5200, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
  }, [config, drift, pulse]);

  const animatedStyle = useAnimatedStyle(() => {
    const r = Math.round(interpolate(pulse.value, [0, 1], [33, 66]));
    const g = Math.round(interpolate(pulse.value, [0, 1], [90, 245]));
    const b = Math.round(interpolate(pulse.value, [0, 1], [58, 135]));

    return {
      opacity: interpolate(pulse.value, [0, 1], [0.28, 1]),
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.95)`,
      shadowColor: "#42F587",
      shadowOpacity: interpolate(pulse.value, [0, 1], [0.24, 0.92]),
      shadowRadius: interpolate(pulse.value, [0, 1], [8, 20]),
      transform: [
        { translateX: interpolate(drift.value, [0, 1], [-config.floatX, config.floatX]) },
        { translateY: interpolate(drift.value, [0, 1], [-config.floatY, config.floatY]) },
        { scale: interpolate(pulse.value, [0, 1], [0.84, 1.22]) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.node,
        {
          left: `${config.x * 100}%`,
          top: `${config.y * 100}%`,
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          marginLeft: -(config.size / 2),
          marginTop: -(config.size / 2),
        },
        animatedStyle,
      ]}
    />
  );
}

export function FuturisticWelcomeBackground({ children, style, ...props }: ViewProps) {
  const overlayPhase = useSharedValue(0);

  useEffect(() => {
    overlayPhase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 9000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [overlayPhase]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(overlayPhase.value, [0, 1], [0.3, 0.85]),
  }));

  const vignetteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(overlayPhase.value, [0, 1], [0.45, 0.72]),
  }));

  return (
    <View style={[styles.container, style]} {...props}>
      {/* Base gradient */}
      <LinearGradient colors={["#0E291B", "#132E1F", "#080F0B"]} style={StyleSheet.absoluteFillObject} />

      {/* Animated overlay gradient */}
      <Animated.View style={[StyleSheet.absoluteFillObject, overlayStyle]} pointerEvents="none">
        <LinearGradient
          colors={[
            "rgba(14, 41, 27, 0.82)",
            "rgba(21, 58, 38, 0.58)",
            "rgba(33, 90, 58, 0.42)",
            "rgba(8, 15, 11, 0.86)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Particles */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {NODES.map((node, index) => (
          <Particle key={`particle-${index}`} config={node} />
        ))}
      </View>

      {/* Vignette */}
      <Animated.View pointerEvents="none" style={[styles.vignette, vignetteStyle]} />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  node: {
    position: "absolute",
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8, 20, 12, 0.48)",
  },
});
