const tintColorLight = "#4ade80";
const tintColorDark = "#4ade80";

export const Colors = {
  light: {
    text: "#fff", // Forced to light text for dark theme look
    background: "#000000", // Forced to dark background
    tint: tintColorLight,
    icon: "#687076",
    tabIconDefault: "#687076",
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: "#fff",
    background: "#000000",
    tint: tintColorDark,
    icon: "#9BA1A6",
    tabIconDefault: "#9BA1A6",
    tabIconSelected: tintColorDark,
  },
};
