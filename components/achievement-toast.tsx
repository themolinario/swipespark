import { ACHIEVEMENTS, type AchievementId } from "@/stores/achievement-store";
import * as Haptics from "expo-haptics";
import {
  CheckCircle,
  Copy,
  Crown,
  Flame,
  HardDrive,
  Sparkles,
  Trash2,
} from "lucide-react-native";
import { memo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICON_MAP: Record<string, React.FC<{ size: number; color: string }>> = {
  Trash2,
  Flame,
  HardDrive,
  Copy,
  CheckCircle,
  Sparkles,
  Crown,
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOAST_WIDTH = SCREEN_WIDTH - 48;
const SWIPE_THRESHOLD = -40;

interface AchievementToastProps {
  achievementId: AchievementId;
  onDismiss: () => void;
}

export const AchievementToast = memo(function AchievementToast({
  achievementId,
  onDismiss,
}: AchievementToastProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const def = ACHIEVEMENTS.find((a) => a.id === achievementId);

  const glowOpacity = useSharedValue(0.4);
  const iconScale = useSharedValue(0.5);
  const shimmerX = useSharedValue(-TOAST_WIDTH);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      3,
      true
    );

    iconScale.value = withSequence(
      withTiming(1.3, { duration: 300 }),
      withTiming(1, { duration: 200 })
    );

    shimmerX.value = withDelay(
      200,
      withTiming(TOAST_WIDTH, { duration: 800 })
    );
  }, [glowOpacity, iconScale, shimmerX]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY;
        opacity.value = 1 + e.translationY / 150;
      }
    })
    .onEnd((e) => {
      if (e.translationY < SWIPE_THRESHOLD) {
        translateY.value = withTiming(-200, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)();
        });
      } else {
        translateY.value = withSpring(0);
        opacity.value = withSpring(1);
      }
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    translateY.value = withTiming(-200, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 }, () => {
      runOnJS(onDismiss)();
    });
  });

  const composed = Gesture.Race(panGesture, tapGesture);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const containerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!def) return null;

  const IconComponent = ICON_MAP[def.icon] ?? Sparkles;
  const title = t(`achievements.${achievementId}.title`);
  const description = t(`achievements.${achievementId}.desc`);
  const tierLabel = def.tier ? t(`achievements.tier.${def.tier}`) : null;

  return (
    <Animated.View
      entering={SlideInUp.duration(500).springify()}
      style={[styles.container, { top: insets.top + 8 }]}
    >
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.touchable, containerAnimStyle]}>
          <Animated.View style={[styles.glowBg, { backgroundColor: def.color }, glowStyle]} />

          <View style={styles.toast}>
            <Animated.View style={[styles.shimmer, shimmerStyle]} />

            <View style={styles.content}>
              <Animated.View style={[styles.iconContainer, { backgroundColor: `${def.color}22` }, iconAnimStyle]}>
                <IconComponent size={28} color={def.color} />
              </Animated.View>

              <View style={styles.textContainer}>
                <Animated.Text
                  entering={FadeIn.delay(200).duration(300)}
                  style={styles.unlockLabel}
                >
                  {t("achievements.unlocked")}
                </Animated.Text>
                <Animated.Text
                  entering={FadeIn.delay(350).duration(300)}
                  style={styles.title}
                  numberOfLines={1}
                >
                  {title}
                </Animated.Text>
                <Animated.Text
                  entering={FadeIn.delay(500).duration(300)}
                  style={styles.description}
                  numberOfLines={1}
                >
                  {description}
                </Animated.Text>
              </View>

              {tierLabel && (
                <Animated.View
                  entering={FadeIn.delay(400).duration(300)}
                  style={[styles.tierBadge, { borderColor: def.color }]}
                >
                  <Animated.Text style={[styles.tierText, { color: def.color }]}>
                    {tierLabel}
                  </Animated.Text>
                </Animated.View>
              )}
            </View>
          </View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 24,
    right: 24,
    zIndex: 9999,
    alignItems: "center",
  },
  touchable: {
    width: "100%",
  },
  glowBg: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 24,
    opacity: 0.4,
  },
  toast: {
    width: "100%",
    backgroundColor: "rgba(20, 20, 20, 0.95)",
    borderRadius: 16,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    transform: [{ skewX: "-15deg" }],
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 1,
  },
  unlockLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  description: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
  },
  tierBadge: {
    borderWidth: 1,
    borderRadius: 8,
    borderCurve: "continuous",
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tierText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
