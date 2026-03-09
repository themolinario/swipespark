import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/themed-text";
import { FuturisticWelcomeBackground } from "@/components/ui/futuristic-welcome-background";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";

const ONBOARDING_KEY = "swipespark_onboarding_done";

async function completeOnboarding() {
  await AsyncStorage.setItem(ONBOARDING_KEY, "true");
  router.replace("/(tabs)");
}
import { Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();

  const buttonScale = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const buttonGlow = useSharedValue(0);

  useEffect(() => {
    buttonOpacity.value = withDelay(400, withTiming(1, { duration: 800 }));
    buttonScale.value = withDelay(400, withSpring(1, { damping: 12, stiffness: 100 }));

    buttonGlow.value = withDelay(
      1200,
      withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
  }, [buttonGlow, buttonOpacity, buttonScale]);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
    transform: [{ scale: buttonScale.value }],
  }));

  const buttonGlowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(buttonGlow.value, [0, 1], [0.3, 0.8]),
    transform: [{ scale: interpolate(buttonGlow.value, [0, 1], [1, 1.05]) }],
  }));

  return (
    <FuturisticWelcomeBackground>
      <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.heroContainer}>
          <View style={styles.logoShadowContainer}>
            <View style={styles.logoMask}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
          </View>
        </View>

        <View style={styles.textContainer}>
          <ThemedText style={styles.title}>
            WELCOME TO THE{"\n"}
            <ThemedText style={styles.titleHighlight}>FUTURE OF PHOTO CLEANING.</ThemedText>
          </ThemedText>

          <ThemedText style={styles.subtitle}>
            Optimized Swipe for clearing memory, automated duplicate removal, and AI-powered image analysis.
          </ThemedText>
        </View>

        <Animated.View style={[styles.buttonWrapper, buttonAnimatedStyle]}>
          <Animated.View style={[styles.buttonGlowBackground, buttonGlowAnimatedStyle]} pointerEvents="none" />
          <Pressable onPress={completeOnboarding} style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}>
            <LinearGradient
              colors={["rgba(66, 245, 135, 0.18)", "rgba(33, 90, 58, 0.18)", "rgba(56, 224, 210, 0.12)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            />
            <View style={styles.buttonInnerBorder}>
              <ThemedText style={styles.buttonText}>START CLEANING</ThemedText>
            </View>
          </Pressable>
        </Animated.View>
      </View>
    </FuturisticWelcomeBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  heroContainer: {
    height: 300,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  logoShadowContainer: {
    width: 190,
    height: 190,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#42F587",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 40,
    elevation: 20,
  },
  logoMask: {
    width: 190,
    height: 190,
    borderRadius: 95,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.2,
    borderColor: "rgba(66, 245, 135, 0.45)",
    backgroundColor: "rgba(10, 20, 14, 0.58)",
  },
  logoImage: {
    width: "105%",
    height: "105%",
  },
  textContainer: {
    alignItems: "center",
    gap: 16,
    maxWidth: "100%",
    marginBottom: 40,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    color: "#ffffff",
    letterSpacing: 1,
    lineHeight: 38,
  },
  titleHighlight: {
    fontSize: 28,
    fontWeight: "800",
    color: "#42F587",
    textShadowColor: "rgba(56, 224, 210, 0.75)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    color: "rgba(232, 251, 240, 0.82)",
    lineHeight: 24,
    maxWidth: "90%",
  },
  buttonWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 30,
  },
  buttonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  buttonGlowBackground: {
    position: "absolute",
    width: "90%",
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(33, 90, 58, 0.42)",
    shadowColor: "#38E0D2",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 28,
    elevation: 20,
  },
  button: {
    width: "90%",
    height: 60,
    borderRadius: 30,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(66, 245, 135, 0.9)",
    backgroundColor: "rgba(10, 20, 14, 0.78)",
  },
  buttonPressed: {
    transform: [{ scale: 0.96 }],
    backgroundColor: "rgba(66, 245, 135, 0.12)",
  },
  buttonInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 224, 210, 0.38)",
    borderRadius: 30,
  },
  buttonText: {
    color: "#E8FBF0",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 2,
    textShadowColor: "#42F587",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
