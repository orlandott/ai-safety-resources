import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProgressBar } from "../components/ProgressBar";
import { StarRating } from "../components/StarRating";
import { formatMinutes, resources, TRACK_ICONS } from "../data";
import type { RootStackParamList } from "../navigation/types";
import { computeStats } from "../stats";
import { useLibrary } from "../store/library";
import { SERIF, useTheme } from "../theme";

const MAX_GOAL = 30;

export function ProgressScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { entries, goal, setGoal } = useLibrary();
  const stats = useMemo(() => computeStats(entries), [entries]);

  const goalTarget = goal || 0;
  const timeCaption = stats.perInstalment
    ? "From each resource's listed length; series count one episode."
    : "From each resource's listed length.";

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 12 }]}
    >
      <Text accessibilityRole="header" style={[styles.heading, { color: theme.text }]}>
        Your progress
      </Text>
      <Text style={[styles.subheading, { color: theme.textMuted }]}>
        Everything here is worked out on this device from the resources you've shelved.
      </Text>

      {stats.finished === 0 ? (
        <View
          style={[
            styles.hint,
            { backgroundColor: theme.accentSoft, borderColor: theme.accentSoftBorder },
          ]}
        >
          <Text style={[styles.hintText, { color: theme.accentText }]}>
            Mark something finished and this fills in — hours spent, topics covered, and how far
            through each learning path you are.
          </Text>
        </View>
      ) : null}

      <View style={styles.tiles}>
        <Tile label="Finished" value={String(stats.finished)} caption={`of ${resources.length}`} />
        <Tile
          label="Time invested"
          value={stats.minutes ? formatMinutes(stats.minutes) : "—"}
          caption={stats.minutes ? timeCaption : "Nothing finished yet"}
        />
        <Tile
          label="Categories"
          value={`${stats.tracksExplored}`}
          caption={`of ${stats.byTrack.length} explored`}
        />
        <Tile
          label="On your shelves"
          value={String(stats.want + stats.reading)}
          caption={`${stats.reading} in progress · ${stats.want} to start`}
        />
      </View>

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        This month
      </Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Monthly goal"
          accessibilityValue={{
            text: goalTarget ? `${goalTarget} resources a month` : "No goal set",
          }}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(event) => {
            if (event.nativeEvent.actionName === "increment") {
              setGoal(Math.min(MAX_GOAL, goalTarget + 1));
            } else if (event.nativeEvent.actionName === "decrement") {
              setGoal(Math.max(0, goalTarget - 1));
            }
          }}
          style={styles.goalRow}
        >
          <View style={styles.goalText}>
            <Text style={[styles.goalValue, { color: theme.text }]}>
              {goalTarget ? `${goalTarget} a month` : "No goal set"}
            </Text>
            <Text style={[styles.goalCaption, { color: theme.textMuted }]}>
              {goalTarget
                ? `${stats.finishedThisMonth} finished so far`
                : "Set a target to pace yourself"}
            </Text>
          </View>
          <Stepper
            onDecrement={() => setGoal(Math.max(0, goalTarget - 1))}
            onIncrement={() => setGoal(Math.min(MAX_GOAL, goalTarget + 1))}
            canDecrement={goalTarget > 0}
            canIncrement={goalTarget < MAX_GOAL}
          />
        </View>
        {goalTarget ? (
          <ProgressBar
            value={stats.finishedThisMonth}
            max={goalTarget}
            caption={`${stats.finishedThisMonth}/${goalTarget}`}
            accessibilityLabel={`${stats.finishedThisMonth} of ${goalTarget} finished this month`}
          />
        ) : null}
      </View>

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        Learning paths
      </Text>
      {stats.byPath.map(({ path, finished, total }) => (
        <Pressable
          key={path.slug}
          onPress={() => navigation.navigate("Path", { slug: path.slug })}
          accessibilityRole="button"
          accessibilityLabel={`${path.title}, ${finished} of ${total} steps finished`}
          accessibilityHint="Opens learning path"
          style={({ pressed }) => [
            styles.card,
            styles.rowCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.rowTitle, { color: theme.text }]}>{path.title}</Text>
          <ProgressBar
            value={finished}
            max={total}
            caption={`${finished}/${total}`}
            accessibilityLabel={`${finished} of ${total} steps finished`}
          />
        </Pressable>
      ))}

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        By category
      </Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {stats.byTrack.map(({ track, finished, total }) => (
          <View key={track.key}>
            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
              {TRACK_ICONS[track.key] ?? "📄"} {track.label}
            </Text>
            <ProgressBar
              value={finished}
              max={total}
              caption={`${finished}/${total}`}
              muted={finished === 0}
              accessibilityLabel={`${track.label}, ${finished} of ${total} finished`}
            />
          </View>
        ))}
      </View>

      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
        By level
      </Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
        {stats.byLevel.map(({ level, finished, total }) => (
          <View key={level}>
            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{level}</Text>
            <ProgressBar
              value={finished}
              max={total}
              caption={`${finished}/${total}`}
              muted={finished === 0}
              accessibilityLabel={`${level}, ${finished} of ${total} finished`}
            />
          </View>
        ))}
      </View>

      {stats.topTags.length ? (
        <>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
            Topics you've covered
          </Text>
          <View style={styles.tags}>
            {stats.topTags.map(({ tag, count }) => (
              <View
                key={tag}
                style={[
                  styles.tag,
                  { backgroundColor: theme.cardSoft, borderColor: theme.cardBorder },
                ]}
                accessible
                accessibilityLabel={`${tag}, ${count} finished`}
              >
                <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                  {tag} · {count}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      {stats.rated ? (
        <>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.text }]}>
            Your ratings
          </Text>
          <View
            style={[styles.card, styles.ratingCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
          >
            <StarRating value={Math.round(stats.averageRating)} size={20} />
            <Text style={[styles.goalCaption, { color: theme.textMuted }]}>
              {stats.averageRating.toFixed(1)} average across {stats.rated}{" "}
              {stats.rated === 1 ? "rating" : "ratings"}
              {stats.notes ? ` · ${stats.notes} with notes` : ""}
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function Tile({ label, value, caption }: { label: string; value: string; caption: string }) {
  const theme = useTheme();
  return (
    <View
      style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
      accessible
      accessibilityLabel={`${label}: ${value}. ${caption}`}
    >
      <Text style={[styles.tileLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.tileCaption, { color: theme.textMuted }]}>{caption}</Text>
    </View>
  );
}

function Stepper({
  onDecrement,
  onIncrement,
  canDecrement,
  canIncrement,
}: {
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement: boolean;
  canIncrement: boolean;
}) {
  const theme = useTheme();
  const button = (
    glyph: string,
    label: string,
    onPress: () => void,
    enabled: boolean
  ) => (
    <Pressable
      onPress={enabled ? onPress : undefined}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      style={({ pressed }) => [
        styles.stepperButton,
        { backgroundColor: theme.cardSoft, borderColor: theme.cardBorder },
        !enabled && styles.stepperDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.stepperGlyph, { color: theme.accentText }]}>{glyph}</Text>
    </Pressable>
  );

  return (
    <View style={styles.stepper}>
      {button("−", "Lower the monthly goal", onDecrement, canDecrement)}
      {button("+", "Raise the monthly goal", onIncrement, canIncrement)}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: SERIF,
  },
  subheading: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  hint: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 14,
  },
  hintText: {
    fontSize: 13,
    lineHeight: 19,
  },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  tile: {
    width: "48%",
    flexGrow: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 2,
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  tileValue: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: SERIF,
  },
  tileCaption: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: SERIF,
    marginTop: 26,
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  rowCard: {
    marginBottom: 10,
    gap: 8,
  },
  pressed: {
    opacity: 0.85,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: SERIF,
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  goalText: {
    flex: 1,
    gap: 2,
  },
  goalValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  goalCaption: {
    fontSize: 12,
    lineHeight: 17,
  },
  stepper: {
    flexDirection: "row",
    gap: 8,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperDisabled: {
    opacity: 0.4,
  },
  stepperGlyph: {
    fontSize: 20,
    fontWeight: "700",
  },
  barLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 5,
  },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
  },
  ratingCard: {
    gap: 6,
  },
});
