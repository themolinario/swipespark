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
      <View style={[StyleSheet.absoluteFillObject, { experimental_backgroundImage: 'linear-gradient(to bottom, #010D08 0%, #031F14 30%, #010A06 70%, #000000 100%)' }]} />

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
  },
});
