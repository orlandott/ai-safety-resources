import { Platform, useColorScheme } from "react-native";
import { useIncreaseContrast } from "./a11y";

// Palette mirrors the website (public/style.css): warm cream/brown grounds
// with the site's green accent, in both light and dark.
export interface Theme {
  dark: boolean;
  background: string;
  card: string;
  cardSoft: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  onAccent: string;
  accentSoft: string;
  accentSoftBorder: string;
  accentText: string;
  chipBg: string;
  chipBorder: string;
  chipActiveBg: string;
  chipActiveText: string;
  tabBar: string;
  progressTrack: string;
  danger: string;
}

const light: Theme = {
  dark: false,
  background: "#f4f1ea",
  card: "#ffffff",
  cardSoft: "#f9f7f1",
  cardBorder: "#e6ddce",
  text: "#382110",
  textSecondary: "#5c5142",
  textMuted: "#6f6659",
  accent: "#2f7a52",
  onAccent: "#ffffff",
  accentSoft: "#eef8f1",
  accentSoftBorder: "#b5d6bf",
  accentText: "#2f7a52",
  chipBg: "#f9f7f1",
  chipBorder: "#e6ddce",
  chipActiveBg: "#2f7a52",
  chipActiveText: "#ffffff",
  tabBar: "#f9f7f1",
  progressTrack: "#e9dfd0",
  danger: "#b3382c",
};

const dark: Theme = {
  dark: true,
  background: "#15110d",
  card: "#1f1913",
  cardSoft: "#251e17",
  cardBorder: "#3b3128",
  text: "#ede4d3",
  textSecondary: "#cabfa9",
  textMuted: "#a99b85",
  accent: "#4fb87e",
  onAccent: "#0e231a",
  accentSoft: "rgba(79, 184, 126, 0.14)",
  accentSoftBorder: "rgba(79, 184, 126, 0.42)",
  accentText: "#7fd2a4",
  chipBg: "#251e17",
  chipBorder: "#3b3128",
  chipActiveBg: "#4fb87e",
  chipActiveText: "#0e231a",
  tabBar: "#1a1510",
  progressTrack: "#3b3128",
  danger: "#e07060",
};

// High-contrast variants, used only when the system setting asks for it
// (iOS "Increase Contrast", Android "High contrast text"). Text is pushed to
// >= 7:1 (WCAG AAA) and borders to >= 3:1 against their grounds; the regular
// palettes above are untouched.
const lightHighContrast: Theme = {
  ...light,
  text: "#241505",
  textSecondary: "#43392a",
  textMuted: "#4d4335",
  accent: "#1e5c3c",
  accentText: "#1e5c3c",
  accentSoftBorder: "#2f7a52",
  cardBorder: "#8a7a5f",
  chipBorder: "#8a7a5f",
  chipActiveBg: "#1e5c3c",
  progressTrack: "#cbbc9e",
  danger: "#8f2b21",
};

const darkHighContrast: Theme = {
  ...dark,
  text: "#fff8ea",
  textSecondary: "#e3d9c4",
  textMuted: "#d3c6ae",
  accent: "#66d195",
  onAccent: "#06170f",
  accentText: "#a8e8c6",
  accentSoftBorder: "#66d195",
  cardBorder: "#7f6e59",
  chipBorder: "#7f6e59",
  chipActiveBg: "#66d195",
  chipActiveText: "#06170f",
  progressTrack: "#5a4c3d",
  danger: "#ff9d8f",
};

export function useTheme(): Theme {
  const isDark = useColorScheme() === "dark";
  const increaseContrast = useIncreaseContrast();
  if (increaseContrast) return isDark ? darkHighContrast : lightHighContrast;
  return isDark ? dark : light;
}

// The site sets headings and cover initials in Hahmlet (a serif); use each
// platform's serif so the app reads the same without bundling font files.
export const SERIF = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia, 'Times New Roman', serif",
});
