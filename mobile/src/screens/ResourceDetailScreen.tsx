import React, { useMemo } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LevelBadge } from "../components/LevelBadge";
import { Poster } from "../components/Poster";
import { ResourceCard } from "../components/ResourceCard";
import { ShelfPicker } from "../components/ShelfPicker";
import { StarRating } from "../components/StarRating";
import { formatMinutes, getResource, isPerInstalment, parseMinutes, TRACK_ICONS } from "../data";
import type { RootScreenProps } from "../navigation/types";
import { relatedTo } from "../recommend";
import { useLibrary } from "../store/library";
import { SERIF, useTheme } from "../theme";

export function ResourceDetailScreen({ navigation, route }: RootScreenProps<"Resource">) {
  const theme = useTheme();
  const resource = getResource(route.params.id);
  const { getEntry, shelfOf, setShelf, setRating, setNote } = useLibrary();
  const related = useMemo(() => (resource ? relatedTo(resource) : []), [resource]);

  if (!resource) return null;

  const entry = getEntry(resource.id);
  const shelf = shelfOf(resource.id);
  const minutes = parseMinutes(resource.timeLabel);
  const meta = [resource.author, resource.year ? String(resource.year) : ""]
    .filter(Boolean)
    .join(" · ");

  const share = () => {
    Share.share({
      message: `${resource.name}${resource.author ? ` — ${resource.author}` : ""}\n${resource.link}`,
      url: resource.link,
    }).catch(() => {
      // Dismissed, or the platform refused the sheet. Nothing to recover from.
    });
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      <Poster
        uri={resource.image}
        title={resource.name}
        track={resource.track}
        style={styles.poster}
        initialsSize={40}
      />

      <Text
        style={[styles.trackLabel, { color: theme.accent }]}
        accessibilityLabel={resource.trackLabel}
      >
        {TRACK_ICONS[resource.track] ?? ""} {resource.trackLabel}
      </Text>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
        {resource.name}
      </Text>
      {meta ? <Text style={[styles.meta, { color: theme.textMuted }]}>{meta}</Text> : null}
      {resource.timeLabel ? (
        <Text
          style={[styles.meta, { color: theme.textMuted }]}
          // The clock emoji and the tilde both read badly aloud.
          accessibilityLabel={
            minutes === null
              ? resource.timeLabel
              : `About ${formatMinutes(minutes)}${
                  isPerInstalment(resource.timeLabel) ? " per episode" : ""
                }`
          }
        >
          ⏱ {resource.timeLabel.replace(/^~/, "About ")}
        </Text>
      ) : null}

      <View style={styles.badges}>
        <LevelBadge level={resource.level} />
        {resource.tags.map((tag) => (
          <View
            key={tag}
            style={[styles.tag, { backgroundColor: theme.cardSoft, borderColor: theme.cardBorder }]}
          >
            <Text style={[styles.tagText, { color: theme.textMuted }]}>{tag}</Text>
          </View>
        ))}
      </View>

      {resource.summary ? (
        <Text style={[styles.summary, { color: theme.textSecondary }]}>{resource.summary}</Text>
      ) : null}

      <View style={styles.buttonRow}>
        <Pressable
          onPress={() => Linking.openURL(resource.link).catch(() => {})}
          accessibilityRole="link"
          accessibilityLabel="Open resource"
          accessibilityHint="Opens in the browser"
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.primaryButtonText, { color: theme.onAccent }]}>
            Open resource ↗
          </Text>
        </Pressable>
        <Pressable
          onPress={share}
          accessibilityRole="button"
          accessibilityLabel="Share"
          accessibilityHint="Opens the share sheet"
          style={({ pressed }) => [
            styles.shareButton,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.shareButtonText, { color: theme.textSecondary }]}>Share</Text>
        </Pressable>
      </View>

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        Your shelf
      </Text>
      <ShelfPicker
        track={resource.track}
        value={shelf}
        onChange={(next) => setShelf(resource.id, next)}
      />

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        Your rating
      </Text>
      <StarRating value={entry?.rating ?? 0} onChange={(value) => setRating(resource.id, value)} />

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        Your notes
      </Text>
      <TextInput
        value={entry?.note ?? ""}
        onChangeText={(text) => setNote(resource.id, text)}
        placeholder="What stood out? What did it change your mind about?"
        placeholderTextColor={theme.textMuted}
        accessibilityLabel="Your notes on this resource"
        multiline
        textAlignVertical="top"
        style={[
          styles.noteInput,
          { backgroundColor: theme.card, borderColor: theme.cardBorder, color: theme.text },
        ]}
      />
      <Text style={[styles.caption, { color: theme.textMuted }]}>
        Ratings and notes stay on this device. Rating or noting a resource also puts it on your
        shelf.
      </Text>

      {related.length ? (
        <>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
            Related
          </Text>
          <View style={styles.related}>
            {related.map((item) => (
              <ResourceCard
                key={item.id}
                resource={item}
                showTrack
                onPress={() => navigation.push("Resource", { id: item.id })}
              />
            ))}
          </View>
        </>
      ) : null}

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
    overflow: "hidden",
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
    fontFamily: SERIF,
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
    borderWidth: 1,
    paddingHorizontal: 9,
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
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  shareButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 18,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: SERIF,
    marginTop: 26,
    marginBottom: 10,
  },
  noteInput: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    fontSize: 15,
    lineHeight: 21,
    minHeight: 110,
  },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  related: {
    // ResourceCard carries its own 16pt horizontal margin for list use; cancel
    // this screen's 20pt padding so the cards line up with the text above.
    marginHorizontal: -20,
  },
  link: {
    fontSize: 12,
    marginTop: 24,
    textAlign: "center",
  },
});
