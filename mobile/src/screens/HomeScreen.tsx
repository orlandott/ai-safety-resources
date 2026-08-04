import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLargeTextMode } from "../a11y";
import { ProgressBar } from "../components/ProgressBar";
import { ResourceCard } from "../components/ResourceCard";
import { getResource, paths, TRACK_ICONS, tracks } from "../data";
import type { RootStackParamList } from "../navigation/types";
import { recommend } from "../recommend";
import { useLibrary } from "../store/library";
import { SERIF, useTheme } from "../theme";
import type { Resource } from "../types";

// Enough to be worth scrolling, few enough that the paths below stay on screen.
const SUGGESTION_COUNT = 4;
const IN_PROGRESS_COUNT = 3;

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const largeText = useLargeTextMode();
  const insets = useSafeAreaInsets();
  const { entries, idsOn } = useLibrary();

  const suggestions = useMemo(() => recommend(entries, SUGGESTION_COUNT), [entries]);
  const inProgress = useMemo(
    () =>
      idsOn("reading")
        .slice(0, IN_PROGRESS_COUNT)
        .map(getResource)
        .filter((r): r is Resource => Boolean(r)),
    [idsOn]
  );
  const pathProgress = useMemo(
    () =>
      paths.map((path) => ({
        path,
        done: path.steps.filter((s) => entries[s.resourceId]?.shelf === "finished").length,
      })),
    [entries]
  );

  const hasLibrary = Object.keys(entries).length > 0;

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <View style={styles.brand}>
        <Image
          source={require("../../assets/logo-emblem.png")}
          style={styles.logo}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
          AI Safety Resources
        </Text>
      </View>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Books, papers, films, and more for exploring AI safety and alignment — for the curious and
        the deeply engaged.
      </Text>

      {inProgress.length ? (
        <>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
            Pick up where you left off
          </Text>
          <View style={styles.cards}>
            {inProgress.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                showTrack
                onPress={() => navigation.navigate("Resource", { id: resource.id })}
              />
            ))}
          </View>
        </>
      ) : null}

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        {hasLibrary ? "Suggested for you" : "Start here"}
      </Text>
      <Text style={[styles.sectionNote, { color: theme.textMuted }]}>
        {hasLibrary
          ? "Worked out on this device from what you've shelved, rated, and finished."
          : "The curator's opening sequence. Shelve a few things and this becomes your own."}
      </Text>
      <View style={styles.cards}>
        {suggestions.map(({ resource, reason }) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            reason={reason}
            showTrack
            onPress={() => navigation.navigate("Resource", { id: resource.id })}
          />
        ))}
      </View>

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        Where do I start?
      </Text>
      {pathProgress.map(({ path, done }) => (
        <Pressable
          key={path.slug}
          onPress={() => navigation.navigate("Path", { slug: path.slug })}
          accessibilityRole="button"
          accessibilityLabel={`${path.audience}. ${path.title}. ${path.blurb} ${done} of ${path.steps.length} steps finished`}
          accessibilityHint="Opens learning path"
          style={({ pressed }) => [
            styles.pathCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.pathAudience, { color: theme.accent }]}>{path.audience}</Text>
          <Text style={[styles.pathTitle, { color: theme.text }]}>{path.title}</Text>
          <Text
            style={[styles.pathBlurb, { color: theme.textSecondary }]}
            numberOfLines={largeText ? 4 : 2}
          >
            {path.blurb}
          </Text>
          <View style={styles.pathProgress}>
            <ProgressBar
              value={done}
              max={path.steps.length}
              caption={`${done}/${path.steps.length}`}
              muted={done === 0}
              // The Pressable above already speaks the counts.
              accessibilityLabel={`${done} of ${path.steps.length} steps finished`}
            />
          </View>
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
            <Text
              style={[styles.trackLabel, { color: theme.text }]}
              numberOfLines={largeText ? 2 : 1}
            >
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
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  heading: {
    flex: 1,
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
  sectionNote: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: -6,
    marginBottom: 12,
  },
  cards: {
    // ResourceCard carries its own 16pt margin for full-width lists; cancel
    // this screen's padding so the cards line up with the headings.
    marginHorizontal: -16,
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
  pathProgress: {
    marginTop: 8,
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
