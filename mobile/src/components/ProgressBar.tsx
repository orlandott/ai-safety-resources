import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

interface ProgressBarProps {
  value: number;
  max: number;
  /** Text shown beside the bar, e.g. "3/8". Never the only cue — the bar's
      accessibilityValue carries the same numbers for screen readers. */
  caption?: string;
  accessibilityLabel: string;
  /** Renders in the danger/neutral tone instead of the accent. */
  muted?: boolean;
}

export function ProgressBar({ value, max, caption, accessibilityLabel, muted }: ProgressBarProps) {
  const theme = useTheme();
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max, now: value }}
    >
      <View style={[styles.track, { backgroundColor: theme.progressTrack }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: muted ? theme.textMuted : theme.accent, width: `${pct * 100}%` },
          ]}
        />
      </View>
      {caption ? (
        <Text style={[styles.caption, { color: theme.textMuted }]}>{caption}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  caption: {
    fontSize: 12,
    fontWeight: "600",
    minWidth: 46,
    textAlign: "right",
  },
});
