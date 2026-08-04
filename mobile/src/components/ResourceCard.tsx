import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLargeTextMode } from "../a11y";
import { shelfLabel, TRACK_ICONS } from "../data";
import { useLibrary, type Shelf } from "../store/library";
import { SERIF, useTheme } from "../theme";
import type { Resource } from "../types";
import { LevelBadge } from "./LevelBadge";
import { Poster } from "./Poster";
import { StarRating } from "./StarRating";

interface ResourceCardProps {
  resource: Resource;
  onPress: () => void;
  showTrack?: boolean;
  note?: string;
  /** Why the app is surfacing this, e.g. "Next in I'm technical". */
  reason?: string;
  /** Spoken position context, e.g. "Step 2 of 8" on a learning path. */
  positionLabel?: string;
}

const SHELF_MARKERS: Record<Shelf, string> = {
  want: "🔖",
  reading: "📖",
  finished: "✅",
};

export function ResourceCard({
  resource,
  onPress,
  showTrack = false,
  note,
  reason,
  positionLabel,
}: ResourceCardProps) {
  const theme = useTheme();
  const { getEntry, shelfOf } = useLibrary();
  // At accessibility text sizes, truncation eats too much — allow extra lines.
  const largeText = useLargeTextMode();

  const entry = getEntry(resource.id);
  const shelf = shelfOf(resource.id);

  const meta = [
    resource.author,
    resource.year ? String(resource.year) : "",
    resource.timeLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  // One spoken label for the whole card: says the shelf and rating in words
  // instead of the ✅/★ markers, and folds in the same text VoiceOver would
  // otherwise read piecemeal.
  const accessibilityLabel = [
    positionLabel,
    reason,
    resource.name,
    meta,
    resource.level,
    showTrack ? resource.trackLabel : "",
    shelf ? shelfLabel(shelf, resource.track) : "",
    entry?.rating ? `Rated ${entry.rating} out of 5` : "",
    entry?.note.trim() ? "Has your notes" : "",
    note ?? resource.summary,
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens details"
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
        {reason ? (
          <Text
            style={[styles.reason, { color: theme.accentText }]}
            numberOfLines={largeText ? 3 : 1}
          >
            {reason}
          </Text>
        ) : null}
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={largeText ? 4 : 2}>
            {resource.name}
          </Text>
          {shelf ? <Text style={styles.marker}>{SHELF_MARKERS[shelf]}</Text> : null}
        </View>
        {meta ? (
          <Text style={[styles.meta, { color: theme.textMuted }]} numberOfLines={largeText ? 2 : 1}>
            {meta}
          </Text>
        ) : null}
        {note ? (
          <Text style={[styles.note, { color: theme.textSecondary }]} numberOfLines={largeText ? 6 : 3}>
            {note}
          </Text>
        ) : resource.summary ? (
          <Text style={[styles.note, { color: theme.textSecondary }]} numberOfLines={largeText ? 4 : 2}>
            {resource.summary}
          </Text>
        ) : null}
        <View style={styles.badges}>
          <LevelBadge level={resource.level} />
          {entry?.rating ? <StarRating value={entry.rating} size={12} /> : null}
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
  reason: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
    flexWrap: "wrap",
    gap: 8,
    marginTop: 2,
  },
  track: {
    fontSize: 12,
  },
});
