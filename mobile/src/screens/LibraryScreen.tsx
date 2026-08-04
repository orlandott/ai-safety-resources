import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { ResourceCard } from "../components/ResourceCard";
import { formatMinutes, getResource, parseMinutes } from "../data";
import type { RootStackParamList } from "../navigation/types";
import { useLibrary, type Shelf } from "../store/library";
import { SERIF, useTheme } from "../theme";
import type { Resource } from "../types";

type Sort = "recent" | "title" | "rating" | "shortest";

const SHELF_TABS: { shelf: Shelf; label: string; empty: { icon: string; title: string; body: string } }[] = [
  {
    shelf: "want",
    label: "🔖 To start",
    empty: {
      icon: "🔖",
      title: "Nothing queued",
      body: "Put a resource on this shelf and it waits here until you're ready for it.",
    },
  },
  {
    shelf: "reading",
    label: "📖 In progress",
    empty: {
      icon: "📖",
      title: "Nothing in progress",
      body: "Move something here when you start it, then rate it and keep notes as you go.",
    },
  },
  {
    shelf: "finished",
    label: "✅ Finished",
    empty: {
      icon: "✅",
      title: "Nothing finished yet",
      body: "Finished resources land here and feed the stats on the Progress tab.",
    },
  },
];

const SORTS: { key: Sort; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "title", label: "Title" },
  { key: "rating", label: "Your rating" },
  { key: "shortest", label: "Shortest" },
];

export function LibraryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { entries, idsOn, getEntry } = useLibrary();
  const [shelf, setShelf] = useState<Shelf>("want");
  const [sort, setSort] = useState<Sort>("recent");

  const counts = useMemo(() => {
    const out: Record<Shelf, number> = { want: 0, reading: 0, finished: 0 };
    for (const entry of Object.values(entries)) out[entry.shelf] += 1;
    return out;
  }, [entries]);

  const items = useMemo(() => {
    // idsOn already returns newest-first, which is the "recent" order.
    const resources = idsOn(shelf)
      .map(getResource)
      .filter((r): r is Resource => Boolean(r));

    if (sort === "title") {
      return [...resources].sort((a, b) => a.name.localeCompare(b.name));
    }
    if (sort === "rating") {
      // Unrated items sort last rather than as zero-star.
      return [...resources].sort((a, b) => {
        const ratingA = getEntry(a.id)?.rating ?? 0;
        const ratingB = getEntry(b.id)?.rating ?? 0;
        if (ratingA === ratingB) return a.name.localeCompare(b.name);
        if (!ratingA) return 1;
        if (!ratingB) return -1;
        return ratingB - ratingA;
      });
    }
    if (sort === "shortest") {
      // Resources with no listed length go last; there's nothing to compare.
      return [...resources].sort((a, b) => {
        const minutesA = parseMinutes(a.timeLabel);
        const minutesB = parseMinutes(b.timeLabel);
        if (minutesA === null && minutesB === null) return a.name.localeCompare(b.name);
        if (minutesA === null) return 1;
        if (minutesB === null) return -1;
        return minutesA - minutesB;
      });
    }
    return resources;
  }, [idsOn, getEntry, shelf, sort]);

  // A queue is more useful with a total attached: "six things, about nine
  // hours" tells you whether it's a weekend or a season.
  const totalMinutes = useMemo(
    () => items.reduce((sum, r) => sum + (parseMinutes(r.timeLabel) ?? 0), 0),
    [items]
  );

  const tab = SHELF_TABS.find((t) => t.shelf === shelf) ?? SHELF_TABS[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
          Your library
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContent}
        >
          {SHELF_TABS.map((t) => (
            <Chip
              key={t.shelf}
              label={`${t.label} (${counts[t.shelf]})`}
              accessibilityLabel={`${t.label.replace(/^\W+\s*/, "")}, ${counts[t.shelf]} resources`}
              active={shelf === t.shelf}
              onPress={() => setShelf(t.shelf)}
            />
          ))}
        </ScrollView>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipContent}
        >
          <Text style={[styles.sortLabel, { color: theme.textMuted }]}>Sort</Text>
          {SORTS.map((s) => (
            <Chip
              key={s.key}
              label={s.label}
              accessibilityLabel={`Sort by ${s.label.toLowerCase()}`}
              active={sort === s.key}
              onPress={() => setSort(s.key)}
            />
          ))}
        </ScrollView>
        {items.length ? (
          <Text style={[styles.summary, { color: theme.textMuted }]}>
            {items.length} {items.length === 1 ? "resource" : "resources"}
            {totalMinutes ? ` · about ${formatMinutes(totalMinutes)}` : ""}
          </Text>
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => {
          const note = getEntry(item.id)?.note.trim();
          return (
            <ResourceCard
              resource={item}
              showTrack
              // Your own note is more useful than the curator's summary here.
              note={note || undefined}
              onPress={() => navigation.navigate("Resource", { id: item.id })}
            />
          );
        }}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon={tab.empty.icon} title={tab.empty.title} body={tab.empty.body} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: SERIF,
  },
  chipScroll: {
    marginHorizontal: -16,
  },
  chipContent: {
    paddingHorizontal: 16,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    alignSelf: "center",
    marginRight: 8,
  },
  summary: {
    fontSize: 12,
  },
  list: {
    paddingTop: 6,
    paddingBottom: 24,
  },
});
