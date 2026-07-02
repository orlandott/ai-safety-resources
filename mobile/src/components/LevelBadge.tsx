import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

// Matches the site's .level-pill: accent-soft ground, accent text, hairline
// accent border — the same for every level.
export function LevelBadge({ level }: { level: string }) {
  const theme = useTheme();
  if (!level) return null;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.accentSoft, borderColor: theme.accentSoftBorder },
      ]}
    >
      <Text style={[styles.text, { color: theme.accentText }]}>{level}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
