import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { paths, TRACK_ICONS, tracks } from "../data";
import type { RootStackParamList } from "../navigation/types";
import { SERIF, useTheme } from "../theme";

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
        AI Safety Resources
      </Text>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Books, papers, films, and more for exploring AI safety and alignment — for the
        curious and the deeply engaged.
      </Text>

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        Where do I start?
      </Text>
      {paths.map((p) => (
        <Pressable
          key={p.slug}
          onPress={() => navigation.navigate("Path", { slug: p.slug })}
          accessibilityRole="button"
          accessibilityHint="Opens learning path"
          style={({ pressed }) => [
            styles.pathCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.pathAudience, { color: theme.accent }]}>{p.audience}</Text>
          <Text style={[styles.pathTitle, { color: theme.text }]}>{p.title}</Text>
          <Text style={[styles.pathBlurb, { color: theme.textSecondary }]} numberOfLines={2}>
            {p.blurb}
          </Text>
          <Text style={[styles.pathMeta, { color: theme.textMuted }]}>
            {p.steps.length} steps
          </Text>
        </Pressable>
      ))}

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        Browse by category
      </Text>
      <View style={styles.grid}>
        {tracks.map((t) => (
          <Pressable
            key={t.key}
            onPress={() => navigation.navigate("Category", { trackKey: t.key })}
            accessibilityRole="button"
            accessibilityLabel={`${t.label}, ${t.count} resources`}
            style={({ pressed }) => [
              styles.trackCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.trackIcon}>{TRACK_ICONS[t.key] ?? "📄"}</Text>
            <Text style={[styles.trackLabel, { color: theme.text }]} numberOfLines={1}>
              {t.label}
            </Text>
            <Text style={[styles.trackCount, { color: theme.textMuted }]}>{t.count}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: SERIF,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 24,
    marginBottom: 10,
    fontFamily: SERIF,
  },
  pathCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    gap: 2,
  },
  pressed: {
    opacity: 0.85,
  },
  pathAudience: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  pathTitle: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: SERIF,
  },
  pathBlurb: {
    fontSize: 13,
    lineHeight: 18,
  },
  pathMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  trackCard: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    alignItems: "flex-start",
    gap: 4,
  },
  trackIcon: {
    fontSize: 24,
  },
  trackLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  trackCount: {
    fontSize: 12,
  },
});
