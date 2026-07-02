import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { TRACK_ICONS } from "../data";
import { useLibrary } from "../store/library";
import { SERIF, useTheme } from "../theme";
import type { Resource } from "../types";
import { LevelBadge } from "./LevelBadge";
import { Poster } from "./Poster";

interface ResourceCardProps {
  resource: Resource;
  onPress: () => void;
  showTrack?: boolean;
  note?: string;
}

export function ResourceCard({ resource, onPress, showTrack = false, note }: ResourceCardProps) {
  const theme = useTheme();
  const { isSaved, isFinished } = useLibrary();

  const meta = [
    resource.author,
    resource.year ? String(resource.year) : "",
    resource.timeLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.cardBorder },
        pressed && styles.pressed,
      ]}
    >
      <Poster
        uri={resource.image}
        title={resource.name}
        track={resource.track}
        style={styles.poster}
      />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
            {resource.name}
          </Text>
          {isFinished(resource.id) ? (
            <Text style={styles.marker}>✅</Text>
          ) : isSaved(resource.id) ? (
            <Text style={styles.marker}>🔖</Text>
          ) : null}
        </View>
        {meta ? (
          <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {note ? (
          <Text style={[styles.note, { color: theme.textSecondary }]} numberOfLines={3}>
            {note}
          </Text>
        ) : resource.summary ? (
          <Text style={[styles.note, { color: theme.textSecondary }]} numberOfLines={2}>
            {resource.summary}
          </Text>
        ) : null}
        <View style={styles.badges}>
          <LevelBadge level={resource.level} />
          {showTrack ? (
            <Text style={[styles.track, { color: theme.textMuted }]}>
              {TRACK_ICONS[resource.track] ?? ""} {resource.trackLabel}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginBottom: 10,
    overflow: "hidden",
  },
  pressed: {
    opacity: 0.85,
  },
  poster: {
    width: 76,
    minHeight: 104,
  },
  body: {
    flex: 1,
    padding: 12,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
    fontFamily: SERIF,
  },
  marker: {
    fontSize: 13,
  },
  meta: {
    fontSize: 12,
  },
  note: {
    fontSize: 13,
    lineHeight: 18,
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  track: {
    fontSize: 12,
  },
});
