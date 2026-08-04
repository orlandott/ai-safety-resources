import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";

interface StarRatingProps {
  value: number;
  /** Omit to render a read-only summary of someone's existing rating. */
  onChange?: (rating: number) => void;
  size?: number;
}

const STARS = [1, 2, 3, 4, 5];

export function StarRating({ value, onChange, size = 28 }: StarRatingProps) {
  const theme = useTheme();

  // Read-only: one element, one spoken sentence. The glyphs alone would read
  // as "black star black star white star…".
  if (!onChange) {
    if (!value) return null;
    return (
      <Text
        style={[styles.static, { color: theme.accentText, fontSize: size }]}
        accessibilityLabel={`Rated ${value} out of 5`}
      >
        {"★".repeat(value)}
        <Text style={{ color: theme.textMuted }}>{"★".repeat(5 - value)}</Text>
      </Text>
    );
  }

  return (
    <View style={styles.row}>
      {STARS.map((star) => {
        const on = star <= value;
        return (
          <Pressable
            key={star}
            onPress={() => onChange(star)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Rate ${star} ${star === 1 ? "star" : "stars"}`}
            accessibilityHint={
              star === value ? "Clears your rating" : "Sets your rating for this resource"
            }
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            style={({ pressed }) => [styles.star, pressed && styles.pressed]}
          >
            <Text style={{ fontSize: size, color: on ? theme.accent : theme.progressTrack }}>
              ★
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  star: {
    paddingRight: 6,
    minHeight: 44,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.6,
  },
  static: {
    letterSpacing: 1,
  },
});
