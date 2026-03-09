import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  StyleSheet,
  View,
  ViewProps,
} from "react-native";

// ─── Main Component ─────────────────────────────────────────────
export function FuturisticHomeBackground({
  children,
  style,
  ...props
}: ViewProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      {/* Base gradient */}
      <LinearGradient
        colors={["#010D08", "#031F14", "#010A06", "#000000"]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Static overlay gradient */}
      <View
        style={[StyleSheet.absoluteFillObject, { opacity: 0.45 }]}
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
      </View>

      {/* Vignette */}
      <View
        pointerEvents="none"
        style={[styles.vignette, { opacity: 0.6 }]}
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
