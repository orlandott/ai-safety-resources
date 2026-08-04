import React, { useLayoutEffect } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { ProgressBar } from "../components/ProgressBar";
import { ResourceCard } from "../components/ResourceCard";
import { getPath, getResource } from "../data";
import type { RootScreenProps } from "../navigation/types";
import { useLibrary } from "../store/library";
import { useTheme } from "../theme";

export function PathScreen({ navigation, route }: RootScreenProps<"Path">) {
  const theme = useTheme();
  const path = getPath(route.params.slug);
  const { isFinished } = useLibrary();

  useLayoutEffect(() => {
    navigation.setOptions({ title: path?.title ?? "Path" });
  }, [navigation, path]);

  if (!path) return null;

  const steps = path.steps
    .map((s) => ({ resource: getResource(s.resourceId), why: s.why }))
    .filter((s): s is { resource: NonNullable<ReturnType<typeof getResource>>; why: string } =>
      Boolean(s.resource)
    );
  const done = steps.filter((s) => isFinished(s.resource.id)).length;

  return (
    <FlatList
      style={{ backgroundColor: theme.background }}
      data={steps}
      keyExtractor={(s) => s.resource.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={[styles.description, { color: theme.textSecondary }]}>
            {path.description}
          </Text>
          <ProgressBar
            value={done}
            max={steps.length}
            caption={`${done}/${steps.length}`}
            accessibilityLabel={`${done} of ${steps.length} steps finished`}
          />
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={styles.stepRow}>
          {/* The card's positionLabel speaks the step; the bare number would
              read out of context. */}
          <Text
            style={[styles.stepNumber, { color: theme.accent }]}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {index + 1}
          </Text>
          <View style={styles.stepCard}>
            <ResourceCard
              resource={item.resource}
              note={item.why}
              showTrack
              positionLabel={`Step ${index + 1} of ${steps.length}`}
              onPress={() => navigation.navigate("Resource", { id: item.resource.id })}
            />
          </View>
        </View>
      )}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 24,
    marginLeft: 8,
    marginTop: 12,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  stepCard: {
    flex: 1,
    marginLeft: -16,
    paddingLeft: 16,
  },
  list: {
    paddingBottom: 24,
  },
});
