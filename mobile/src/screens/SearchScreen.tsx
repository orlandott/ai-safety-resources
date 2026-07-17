import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { ResourceCard } from "../components/ResourceCard";
import { searchResources, tracks } from "../data";
import type { RootStackParamList } from "../navigation/types";
import { useTheme } from "../theme";

export function SearchScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [trackKey, setTrackKey] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const results = useMemo(
    () => searchResources(query, trackKey ?? undefined),
    [query, trackKey]
  );

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
          query.trim() ? (
            <EmptyState
              icon="🕳️"
              title="No matches"
              body="Try a different word, or clear the category filter."
            />
          ) : (
            <EmptyState
              icon="🔭"
              title="Search 329 resources"
              body="Find books, papers, films, podcasts, and more across every category."
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
  list: {
    paddingBottom: 24,
  },
});
