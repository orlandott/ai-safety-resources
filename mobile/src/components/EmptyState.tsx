import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

export function EmptyState({ icon, title, body }: { icon: string; title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text
        style={styles.icon}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {icon}
      </Text>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.textMuted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 60,
    gap: 8,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
  },
  body: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
