import React, { useLayoutEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, StyleSheet, View } from "react-native";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { ResourceCard } from "../components/ResourceCard";
import { getTrack, getTrackResources, LEVELS } from "../data";
import type { RootScreenProps } from "../navigation/types";
import { useTheme } from "../theme";

export function CategoryScreen({ navigation, route }: RootScreenProps<"Category">) {
  const theme = useTheme();
  const { trackKey } = route.params;
  const track = getTrack(trackKey);
  const [level, setLevel] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: track?.label ?? "Category" });
  }, [navigation, track]);

  const all = getTrackResources(trackKey);
  const filtered = useMemo(
    () => (level ? all.filter((r) => r.level === level) : all),
    [all, level]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Chip label={`All (${all.length})`} active={level === null} onPress={() => setLevel(null)} />
          {LEVELS.map((l) => {
            const count = all.filter((r) => r.level === l).length;
            if (count === 0) return null;
            return (
              <Chip
                key={l}
                label={`${l} (${count})`}
                active={level === l}
                onPress={() => setLevel(level === l ? null : l)}
              />
            );
          })}
        </ScrollView>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <ResourceCard
            resource={item}
            onPress={() => navigation.navigate("Resource", { id: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="🔍"
            title="Nothing here"
            body="No resources match this filter."
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filters: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  list: {
    paddingBottom: 24,
  },
});
