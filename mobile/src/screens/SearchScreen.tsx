import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { ResourceCard } from "../components/ResourceCard";
import {
  formatMinutes,
  getTrackResources,
  parseMinutes,
  resources,
  searchResources,
  tracks,
} from "../data";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme";
import type { Resource } from "../types";

// "I have twenty minutes — what can I actually finish?" is the question the
// listed run times can answer, so it gets its own filter row.
const BUDGETS: { key: string; label: string; minutes: number }[] = [
  { key: "15", label: "≤ 15 min", minutes: 15 },
  { key: "30", label: "≤ 30 min", minutes: 30 },
  { key: "60", label: "≤ 1 hr", minutes: 60 },
  { key: "180", label: "≤ 3 hr", minutes: 180 },
];

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [trackKey, setTrackKey] = useState<string | null>(null);
  const [budget, setBudget] = useState<number | null>(null);
  const insets = useSafeAreaInsets();

  const searching = query.trim().length > 0;

  const results = useMemo(() => {
    // With no query, a filter on its own is still a useful browse: pick the
    // pool it implies rather than showing nothing.
    const pool: Resource[] = searching
      ? searchResources(query, trackKey ?? undefined)
      : trackKey
        ? getTrackResources(trackKey)
        : budget
          ? resources
          : [];

    if (budget === null) return pool;

    const withinBudget = pool.filter((r) => {
      const minutes = parseMinutes(r.timeLabel);
      return minutes !== null && minutes <= budget;
    });
    // Keep relevance order when there's a query; otherwise shortest first, so
    // the top of the list is the thing you can finish soonest.
    if (searching) return withinBudget;
    return [...withinBudget].sort(
      (a, b) => (parseMinutes(a.timeLabel) ?? 0) - (parseMinutes(b.timeLabel) ?? 0)
    );
  }, [query, searching, trackKey, budget]);

  const filtered = searching || trackKey !== null || budget !== null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.searchWrap, { paddingTop: insets.top + 12 }]}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search titles, authors, topics…"
          placeholderTextColor={theme.textMuted}
          accessibilityLabel="Search titles, authors, topics"
          accessibilityRole="search"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={[
            styles.input,
            {
              backgroundColor: theme.card,
              borderColor: theme.cardBorder,
              color: theme.text,
            },
          ]}
        />
      </View>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Chip label="All" active={trackKey === null} onPress={() => setTrackKey(null)} />
          {tracks.map((t) => (
            <Chip
              key={t.key}
              label={t.label}
              active={trackKey === t.key}
              onPress={() => setTrackKey(trackKey === t.key ? null : t.key)}
            />
          ))}
        </ScrollView>
      </View>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeFilters}
        >
          <Text style={[styles.filterLabel, { color: theme.textMuted }]}>Time</Text>
          <Chip
            label="Any"
            accessibilityLabel="Any length"
            active={budget === null}
            onPress={() => setBudget(null)}
          />
          {BUDGETS.map((b) => (
            <Chip
              key={b.key}
              label={b.label}
              accessibilityLabel={`Up to ${formatMinutes(b.minutes)}`}
              active={budget === b.minutes}
              onPress={() => setBudget(budget === b.minutes ? null : b.minutes)}
            />
          ))}
        </ScrollView>
      </View>
      <FlatList
        data={results}
        keyExtractor={(r) => r.id}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
        renderItem={({ item }) => (
          <ResourceCard
            resource={item}
            showTrack
            onPress={() => navigation.navigate("Resource", { id: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          filtered ? (
            <EmptyState
              icon="🕳️"
              title="No matches"
              body="Try a different word, or loosen the category and time filters."
            />
          ) : (
            <EmptyState
              icon="🔭"
              title={`Search ${resources.length} resources`}
              body="Find books, papers, films, podcasts, and more — or pick a time filter to see what fits the gap you have."
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchWrap: {
    paddingHorizontal: 16,
  },
  input: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  timeFilters: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignItems: "center",
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginRight: 8,
  },
  list: {
    paddingBottom: 24,
  },
});
