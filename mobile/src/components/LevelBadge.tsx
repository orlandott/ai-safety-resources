import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { LEVEL_COLORS, useTheme } from "../theme";

export function LevelBadge({ level }: { level: string }) {
  const theme = useTheme();
  const colors = LEVEL_COLORS[level];
  if (!colors) return null;
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.dark ? colors.bgDark : colors.bg },
      ]}
    >
      <Text style={[styles.text, { color: theme.dark ? colors.textDark : colors.text }]}>
        {level}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontWeight: "600",
  },
});
