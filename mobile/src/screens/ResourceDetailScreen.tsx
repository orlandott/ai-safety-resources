import React from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LevelBadge } from "../components/LevelBadge";
import { getResource, TRACK_ICONS } from "../data";
import type { RootScreenProps } from "../navigation/types";
import { useLibrary } from "../store/library";
import { useTheme } from "../theme";

export function ResourceDetailScreen({ route }: RootScreenProps<"Resource">) {
  const theme = useTheme();
  const resource = getResource(route.params.id);
  const { isSaved, isFinished, toggleSaved, toggleFinished } = useLibrary();

  if (!resource) return null;

  const saved = isSaved(resource.id);
  const finished = isFinished(resource.id);
  const meta = [
    resource.author,
    resource.year ? String(resource.year) : "",
    resource.timeLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
    >
      {resource.image ? (
        <Image source={{ uri: resource.image }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={[styles.poster, styles.posterFallback, { backgroundColor: theme.accentSoft }]}>
          <Text style={styles.posterIcon}>{TRACK_ICONS[resource.track] ?? "📄"}</Text>
        </View>
      )}

      <Text style={[styles.trackLabel, { color: theme.accent }]}>
        {TRACK_ICONS[resource.track] ?? ""} {resource.trackLabel}
      </Text>
      <Text style={[styles.title, { color: theme.text }]}>{resource.name}</Text>
      {meta ? <Text style={[styles.meta, { color: theme.textMuted }]}>{meta}</Text> : null}

      <View style={styles.badges}>
        <LevelBadge level={resource.level} />
        {resource.tags.map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: theme.chipBg }]}>
            <Text style={[styles.tagText, { color: theme.textSecondary }]}>{tag}</Text>
          </View>
        ))}
      </View>

      {resource.summary ? (
        <Text style={[styles.summary, { color: theme.textSecondary }]}>{resource.summary}</Text>
      ) : null}

      <Pressable
        onPress={() => Linking.openURL(resource.link).catch(() => {})}
        style={({ pressed }) => [
          styles.primaryButton,
          { backgroundColor: theme.accent },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.primaryButtonText, { color: theme.dark ? "#101321" : "#ffffff" }]}>
          Open resource ↗
        </Text>
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          onPress={() => toggleSaved(resource.id)}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: saved ? theme.accentSoft : theme.card,
              borderColor: saved ? theme.accent : theme.cardBorder,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: saved ? theme.accent : theme.textSecondary }]}>
            {saved ? "🔖 Saved" : "🔖 Save"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => toggleFinished(resource.id)}
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: finished ? theme.accentSoft : theme.card,
              borderColor: finished ? theme.accent : theme.cardBorder,
            },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, { color: finished ? theme.accent : theme.textSecondary }]}>
            {finished ? "✅ Finished" : "☑️ Mark finished"}
          </Text>
        </Pressable>
      </View>

      <Text style={[styles.link, { color: theme.textMuted }]} numberOfLines={2}>
        {resource.link}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  poster: {
    width: 140,
    height: 200,
    borderRadius: 12,
    alignSelf: "center",
    marginBottom: 20,
  },
  posterFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  posterIcon: {
    fontSize: 48,
  },
  trackLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30,
    marginTop: 4,
  },
  meta: {
    fontSize: 14,
    marginTop: 6,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  tag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  summary: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 16,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  link: {
    fontSize: 12,
    marginTop: 20,
    textAlign: "center",
  },
});
