import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";

export type ButtonVariant = "primary" | "secondary" | "danger" | "success";

interface ButtonProps {
  onPress: () => void;
  title?: string;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: ButtonVariant;
}

export const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  icon,
  style,
  textStyle,
  variant = "primary",
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const colors = Colors[colorScheme];

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const getBackgroundColor = () => {
    switch (variant) {
      case "primary":
        return colors.tint;
      case "secondary":
        return colorScheme === "dark" ? "#333333" : "#e0e0e0";
      case "danger":
        return "#ff3b30";
      case "success":
        return "#34c759";
      default:
        return colors.tint;
    }
  };

  const getTextColor = () => {
    if (variant === "secondary") {
      return colors.text;
    }
    return "#ffffff";
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: getBackgroundColor() },
        pressed && styles.pressed,
        style,
      ]}
    >
      {icon && (
        <View style={[styles.iconContainer, title ? { marginRight: 8 } : null]}>
          {icon}
        </View>
      )}
      {title && (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
  },
});
