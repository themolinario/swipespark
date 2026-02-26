import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, ViewProps } from "react-native";

export function GradientBackground({ children, style, ...props }: ViewProps) {
  const colorScheme = useColorScheme();

  // Reuse gradient colors from welcome screen for consistency
  const gradientColors =
    colorScheme === "dark"
      ? (["#0f0c29", "#302b63", "#24243e"] as const) // Deep purple/dark blue gradient for dark mode
      : (["#ffffff", "#e6f7ff", "#d6efff"] as const); // White to light blue for light mode

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
