import { useColorScheme } from "react-native";

export interface Theme {
  dark: boolean;
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  chipBg: string;
  chipActiveBg: string;
  chipActiveText: string;
  tabBar: string;
  danger: string;
}

const light: Theme = {
  dark: false,
  background: "#f6f7fb",
  card: "#ffffff",
  cardBorder: "#e4e7f0",
  text: "#171a26",
  textSecondary: "#3f4457",
  textMuted: "#7a8095",
  accent: "#4f5dd4",
  accentSoft: "#eceefc",
  chipBg: "#e9ebf3",
  chipActiveBg: "#4f5dd4",
  chipActiveText: "#ffffff",
  tabBar: "#ffffff",
  danger: "#c0392b",
};

const dark: Theme = {
  dark: true,
  background: "#101321",
  card: "#1a1e30",
  cardBorder: "#282d45",
  text: "#eceef6",
  textSecondary: "#c0c4d6",
  textMuted: "#8a90a8",
  accent: "#8b96f2",
  accentSoft: "#242a4a",
  chipBg: "#242942",
  chipActiveBg: "#8b96f2",
  chipActiveText: "#101321",
  tabBar: "#161a2b",
  danger: "#e07060",
};

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}

export const LEVEL_COLORS: Record<string, { bg: string; bgDark: string; text: string; textDark: string }> = {
  Beginner: { bg: "#e2f4e8", bgDark: "#1d3a2a", text: "#1e7c43", textDark: "#7fd8a2" },
  Intermediate: { bg: "#fdf0dc", bgDark: "#3d2f1a", text: "#a86a12", textDark: "#efc27d" },
  Advanced: { bg: "#fbe3e1", bgDark: "#3f2323", text: "#b3382c", textDark: "#f0968c" },
};
