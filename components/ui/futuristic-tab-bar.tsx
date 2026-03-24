import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Haptics from "expo-haptics";
import React, { useEffect } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

// ─── Futuristic Tab Bar ──────────────────────────────────────────

export function FuturisticTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  // Animated glow pulse for the top border
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [glowPulse]);

  const glowLineStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.4, 1]),
    shadowOpacity: interpolate(glowPulse.value, [0, 1], [0.3, 0.8]),
  }));

  return (
    <View
      style={[
        styles.outerContainer,
        { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
      ]}
    >
      {/* Animated top glow line */}
      <Animated.View style={[styles.glowLine, glowLineStyle]} />

      {/* Background */}
      <View style={[styles.backgroundContainer, { experimental_backgroundImage: 'linear-gradient(to bottom, rgba(5, 15, 10, 0.95), rgba(0, 0, 0, 0.98))' }]}>
        {/* Subtle green ambient overlay */}
        <View style={styles.ambientOverlay} />
      </View>

      {/* Tab items */}
      <View style={styles.tabsContainer}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : options.title ?? route.name;

          const onPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          return (
            <TabItem
              key={route.key}
              isFocused={isFocused}
              label={label}
              onPress={onPress}
              onLongPress={onLongPress}
              options={options}
              tintColor={colors.tint}
              inactiveColor={colors.tabIconDefault}
            />
          );
        })}
      </View>
    </View>
  );
}

// ─── Single Tab Item ─────────────────────────────────────────────

interface TabItemProps {
  isFocused: boolean;
  label: string;
  onPress: () => void;
  onLongPress: () => void;
  options: any;
  tintColor: string;
  inactiveColor: string;
}

function TabItem({
  isFocused,
  label,
  onPress,
  onLongPress,
  options,
  tintColor,
  inactiveColor,
}: TabItemProps) {
  const focusAnim = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    focusAnim.value = withSpring(isFocused ? 1 : 0, {
      damping: 15,
      stiffness: 150,
      mass: 0.8,
    });
  }, [isFocused, focusAnim]);

  const iconContainerStyle = useAnimatedStyle(() => {
    const scale = interpolate(focusAnim.value, [0, 1], [1, 1.15]);
    const translateY = interpolate(focusAnim.value, [0, 1], [0, -2]);
    return {
      transform: [{ scale }, { translateY }],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const opacity = interpolate(focusAnim.value, [0, 1], [0.5, 1]);
    const scale = interpolate(focusAnim.value, [0, 1], [0.9, 1]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  const glowDotStyle = useAnimatedStyle(() => {
    const opacity = interpolate(focusAnim.value, [0, 1], [0, 1]);
    const scaleX = interpolate(focusAnim.value, [0, 1], [0, 1]);
    return {
      opacity,
      transform: [{ scaleX }],
    };
  });

  const bgStyle = useAnimatedStyle(() => {
    const opacity = interpolate(focusAnim.value, [0, 1], [0, 0.12]);
    return { opacity };
  });

  const color = isFocused ? tintColor : inactiveColor;
  const iconSize = 22;

  const renderIcon = () => {
    if (options.tabBarIcon) {
      return options.tabBarIcon({ color, size: iconSize, focused: isFocused });
    }
    return null;
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={options.tabBarAccessibilityLabel}
      style={styles.tabItem}
    >
      {/* Active background glow */}
      <Animated.View style={[styles.activeBackground, { experimental_backgroundImage: 'linear-gradient(to bottom, rgba(74, 222, 128, 0.3), rgba(74, 222, 128, 0.0))' }, bgStyle]} />

      {/* Icon */}
      <Animated.View style={[styles.iconWrapper, iconContainerStyle]}>
        {/* Icon glow when active (behind icon) */}
        {isFocused && (
          <View
            style={[
              styles.iconGlow,
              Platform.OS === "android"
                ? { backgroundColor: `${tintColor}20` }
                : { shadowColor: tintColor },
            ]}
          />
        )}
        {renderIcon()}
      </Animated.View>

      {/* Label */}
      <Animated.Text
        style={[
          styles.label,
          { color },
          labelStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Animated.Text>

      {/* Bottom glow indicator dot */}
      <Animated.View style={[styles.glowDot, { experimental_backgroundImage: `linear-gradient(to bottom, ${tintColor}, rgba(74, 222, 128, 0))` }, glowDotStyle]} />
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  outerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  ambientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(74, 222, 128, 0.02)",
  },
  glowLine: {
    height: 1,
    backgroundColor: "#4ade80",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    ...Platform.select({
      ios: { shadowOpacity: 1 },
      android: { elevation: 0 },
    }),
    zIndex: 10,
  },
  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingHorizontal: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    position: "relative",
  },
  activeBackground: {
    position: "absolute",
    top: 0,
    left: 4,
    right: 4,
    bottom: 0,
    borderRadius: 12,
    borderCurve: 'continuous',
    overflow: "hidden",
  },
  iconWrapper: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconGlow: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginTop: 2,
    textTransform: "uppercase",
  },
  glowDot: {
    width: 20,
    height: 3,
    marginTop: 4,
    borderRadius: 1.5,
    overflow: "hidden",
  },
});






