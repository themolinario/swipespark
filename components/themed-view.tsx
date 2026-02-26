import { View, type ViewProps } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  transparent?: boolean;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  transparent = false,
  ...otherProps
}: ThemedViewProps) {
  const backgroundColor = useThemeColor(
    { light: lightColor, dark: darkColor },
    "background",
  );

  return (
    <View
      style={[
        { backgroundColor: transparent ? "transparent" : backgroundColor },
        style,
      ]}
      {...otherProps}
    />
  );
}
