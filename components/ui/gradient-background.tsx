import { useColorScheme } from "@/hooks/use-color-scheme";
import React from "react";
import { StyleSheet, View, ViewProps } from "react-native";

export function GradientBackground({ children, style, ...props }: ViewProps) {
  const colorScheme = useColorScheme();

  const backgroundImage =
    colorScheme === "dark"
      ? 'linear-gradient(to bottom, #010D08, #0E291B, #000000)'
      : 'linear-gradient(to bottom, #f0faf4, #d6f5e0, #e8faf0)';

  return (
    <View
      style={[styles.container, { experimental_backgroundImage: backgroundImage }, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
