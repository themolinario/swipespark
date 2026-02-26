import { useColorScheme } from "@/hooks/use-color-scheme";
import { GlassView as ExpoGlassView } from "expo-glass-effect";
import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";

export interface GlassViewProps {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number; // Kept for compatibility/fallback logic if needed in future
  tint?: "light" | "dark" | "default";
  glassStyle?: "regular" | "clear" | "none"; // Map to supported styles
}

export const GlassView: React.FC<GlassViewProps> = ({
  children,
  style,
  tint = "default",
  glassStyle = "regular",
}) => {
  const colorScheme = useColorScheme();

  const glassColorScheme = tint === "default" ? "auto" : tint;

  if (Platform.OS !== "ios") {
    // Fallback for Android/Web if needed (transparent or semi-transparent view)
    // expo-glass-effect handles fallback to View, but we might want custom styling here.
    // For now, let's trust expo-glass-effect's fallback or add a simple background.
    const isDark = colorScheme === "dark";
    const fallbackBackgroundColor = isDark
      ? "rgba(30, 30, 30, 0.8)"
      : "rgba(255, 255, 255, 0.8)";

    return (
      <View
        style={[
          styles.fallback,
          { backgroundColor: fallbackBackgroundColor },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <ExpoGlassView
      glassEffectStyle={glassStyle}
      colorScheme={glassColorScheme}
      style={style}
    >
      {children}
    </ExpoGlassView>
  );
};

const styles = StyleSheet.create({
  fallback: {
    overflow: "hidden",
  },
});
