import { Platform, useColorScheme } from "react-native";

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

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

// The site sets headings and cover initials in Hahmlet (a serif); use each
// platform's serif so the app reads the same without bundling font files.
export const SERIF = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia, 'Times New Roman', serif",
});
