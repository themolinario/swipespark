import { memo, useCallback } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { PhotoAsset } from "@/services/media-library.service";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const CARD_WIDTH = SCREEN_WIDTH * 0.88;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.55;

interface PhotoCardProps {
  photo: PhotoAsset;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isActive: boolean;
}

export const PhotoCard = memo(function PhotoCard({
  photo,
  onSwipeLeft,
  onSwipeRight,
  isActive,
}: PhotoCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  const handleSwipeComplete = useCallback(
    (direction: "left" | "right") => {
      if (direction === "left") {
        onSwipeLeft();
      } else {
        onSwipeRight();
      }
    },
    [onSwipeLeft, onSwipeRight],
  );

  const panGesture = Gesture.Pan()
    .enabled(isActive)
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY * 0.5;
      rotation.value = (event.translationX / SCREEN_WIDTH) * 20;
    })
    .onEnd((event) => {
      if (Math.abs(event.translationX) > SWIPE_THRESHOLD) {
        const direction = event.translationX > 0 ? "right" : "left";
        const targetX =
          direction === "right" ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;

        translateX.value = withSpring(targetX, { damping: 20 });
        runOnJS(handleSwipeComplete)(direction);
      } else {
        translateX.value = withSpring(0, { damping: 15 });
        translateY.value = withSpring(0, { damping: 15 });
        rotation.value = withSpring(0, { damping: 15 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));

  const leftIndicatorStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, -translateX.value / SWIPE_THRESHOLD),
  }));

  const rightIndicatorStyle = useAnimatedStyle(() => ({
    opacity: Math.max(0, translateX.value / SWIPE_THRESHOLD),
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Image
          source={{ uri: photo.uri }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          recyclingKey={photo.id}
        />
        <Animated.View
          style={[styles.indicator, styles.deleteIndicator, leftIndicatorStyle]}
        >
          <View style={[styles.indicatorContent, styles.deleteIndicatorContent]}>
            <Animated.Text style={[styles.indicatorText, styles.deleteIndicatorText]}>TRASH</Animated.Text>
          </View>
        </Animated.View>
        <Animated.View
          style={[styles.indicator, styles.keepIndicator, rightIndicatorStyle]}
        >
          <View style={[styles.indicatorContent, styles.keepIndicatorContent]}>
            <Animated.Text style={[styles.indicatorText, styles.keepIndicatorText]}>KEEP</Animated.Text>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 20,
    overflow: "hidden",
    position: "absolute",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: 1,
    borderColor: "rgba(74, 222, 128, 0.3)",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  indicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteIndicator: {
    backgroundColor: "rgba(255, 59, 48, 0.15)",
  },
  keepIndicator: {
    backgroundColor: "rgba(74, 222, 128, 0.15)",
  },
  indicatorContent: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  deleteIndicatorContent: {
    borderColor: "#ff3b30",
    shadowColor: "#ff3b30",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  keepIndicatorContent: {
    borderColor: "#4ade80",
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
    elevation: 10,
  },
  indicatorText: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 4,
  },
  deleteIndicatorText: {
    color: "#ff3b30",
    textShadowColor: "#ff3b30",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  keepIndicatorText: {
    color: "#4ade80",
    textShadowColor: "#4ade80",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
