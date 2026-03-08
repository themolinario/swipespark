import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, ViewProps } from "react-native";

export function GradientBackground({ children, style, ...props }: ViewProps) {
  const colorScheme = useColorScheme();

  // Reuse gradient colors from welcome screen for consistency
  const gradientColors =
    colorScheme === "dark"
      ? (["#010D08", "#0E291B", "#000000"] as const) // Deep green/black gradient for dark mode
      : (["#f0faf4", "#d6f5e0", "#e8faf0"] as const); // White to light green for light mode

  return (
    <LinearGradient
      colors={gradientColors}
      style={[styles.container, style]}
      {...props}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
