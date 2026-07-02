import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Chip } from "../components/Chip";
import { EmptyState } from "../components/EmptyState";
import { ResourceCard } from "../components/ResourceCard";
import { getResource } from "../data";
import type { RootStackParamList } from "../navigation/types";
import { useLibrary } from "../store/library";
import { useTheme } from "../theme";

type Section = "saved" | "finished";

export function SavedScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const { saved, finished } = useLibrary();
  const [section, setSection] = useState<Section>("saved");

  const ids = section === "saved" ? saved : finished;
  const items = useMemo(
    () =>
      ids
        .map(getResource)
        .filter((r): r is NonNullable<ReturnType<typeof getResource>> => Boolean(r))
        .reverse(),
    [ids]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.tabs}>
        <Chip
          label={`🔖 Saved (${saved.length})`}
          active={section === "saved"}
          onPress={() => setSection("saved")}
        />
        <Chip
          label={`✅ Finished (${finished.length})`}
          active={section === "finished"}
          onPress={() => setSection("finished")}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <ResourceCard
            resource={item}
            showTrack
            onPress={() => navigation.navigate("Resource", { id: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          section === "saved" ? (
            <EmptyState
              icon="🔖"
              title="Nothing saved yet"
              body="Tap Save on any resource to build your reading and watch list."
            />
          ) : (
            <EmptyState
              icon="✅"
              title="Nothing finished yet"
              body="Mark resources as finished to track your progress through the collection."
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
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  list: {
    paddingBottom: 24,
  },
});
