import "@/i18n";
import { AchievementProvider } from "@/components/achievement-provider";
import { GradientBackground } from "@/components/ui/gradient-background";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { useDuplicateStore } from "@/stores/duplicate-store";
import { useEffect } from "react";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    // Start background scanner for duplicates
    useDuplicateStore.getState().startScan();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <GradientBackground>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "transparent" },
              animation: "fade",
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="(tabs)" />
          </Stack>
          <AchievementProvider />
          <StatusBar style="auto" />
        </GradientBackground>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
