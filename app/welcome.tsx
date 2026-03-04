import { ThemedText } from "@/components/themed-text";
import { Button } from "@/components/ui/button";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();

  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);

  const titleTranslateY = useSharedValue(20);
  const titleOpacity = useSharedValue(0);

  const subtitleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);

  const buttonScale = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    // Logo entrance
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 600 }));
    logoScale.value = withDelay(
      100,
      withSpring(1, { damping: 12, stiffness: 100 }),
    );

    // Title entrance
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(
      300,
      withSpring(0, { damping: 12, stiffness: 90 }),
    );

    // Subtitle entrance
    subtitleOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    subtitleTranslateY.value = withDelay(
      500,
      withSpring(0, { damping: 12, stiffness: 90 }),
    );

    // Button entrance
    buttonOpacity.value = withDelay(700, withTiming(1, { duration: 600 }));
    buttonScale.value = withDelay(
      700,
      withSpring(1, { damping: 12, stiffness: 100 }),
    );

    // Hints entrance
    hintOpacity.value = withDelay(1000, withTiming(1, { duration: 800 }));
  }, [
    logoOpacity,
    logoScale,
    titleOpacity,
    titleTranslateY,
    subtitleOpacity,
    subtitleTranslateY,
    buttonOpacity,
    buttonScale,
    hintOpacity,
  ]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const hintContainerStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const handleStart = () => {
    router.replace("/(tabs)");
  };

  // Gradient colors based on theme
  const gradientColors =
    colorScheme === "dark"
      ? (["#0f0c29", "#302b63", "#24243e"] as const) // Deep purple/dark blue gradient for dark mode
      : (["#ffffff", "#e6f7ff", "#d6efff"] as const); // White to light blue for light mode

  return (
    <LinearGradient
      colors={gradientColors}
      style={[
        styles.container,
        { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 },
      ]}
    >
      <View style={styles.content}>
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.logo}>
            <Image
              source={require("../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        <Animated.View style={titleAnimatedStyle}>
          <ThemedText style={styles.title}>SwipeSpark</ThemedText>
        </Animated.View>

        <Animated.View style={subtitleAnimatedStyle}>
          <ThemedText style={styles.subtitle}>
            Free up space on your phone{"\n"}with a simple swipe
          </ThemedText>
        </Animated.View>
      </View>

      <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
        <Button
          title="Start"
          onPress={handleStart}
          style={styles.startButton}
          textStyle={styles.startButtonText}
        />

        <Animated.View style={[styles.hintsContainer, hintContainerStyle]}>
          <View style={styles.hintRow}>
            <ThemedText style={styles.hintIcon}>←</ThemedText>
            <ThemedText style={styles.hintText}>
              Swipe left to delete
            </ThemedText>
          </View>

          <View style={styles.hintRow}>
            <ThemedText style={styles.hintText}>Swipe right to keep</ThemedText>
            <ThemedText style={styles.hintIcon}>→</ThemedText>
          </View>
        </Animated.View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "visible",
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    overflow: "visible",
  },
  logoContainer: {
    marginBottom: -40,
    zIndex: 10,
    overflow: "visible",
  },
  logo: {
    width: 300,
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    width: 500,
    height: 500,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 24,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: "center",
  },
  startButton: {
    borderRadius: 30,
    marginBottom: 12,
    paddingHorizontal: 48,
    paddingVertical: 14,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  hintsContainer: {
    alignItems: "center",
    gap: 8,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hintText: {
    fontSize: 14,
    opacity: 0.6,
  },
  hintIcon: {
    fontSize: 16,
    opacity: 0.8,
    fontWeight: "bold",
  },
});
