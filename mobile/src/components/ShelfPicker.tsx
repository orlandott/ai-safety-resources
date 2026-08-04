import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLargeTextMode } from "../a11y";
import { shelfLabel } from "../data";
import { SHELVES, type Shelf } from "../store/library";
import { useTheme } from "../theme";

interface ShelfPickerProps {
  track: string;
  value: Shelf | null;
  onChange: (shelf: Shelf | null) => void;
}

const GLYPHS: Record<Shelf, string> = {
  want: "🔖",
  reading: "📖",
  finished: "✅",
};

/**
 * The three shelves a resource can sit on. Tapping the current shelf takes it
 * back out of the library, which the hint spells out — there's no separate
 * remove control.
 */
export function ShelfPicker({ track, value, onChange }: ShelfPickerProps) {
  const theme = useTheme();
  // At accessibility text sizes three side-by-side buttons can't hold their
  // labels, so they stack.
  const stacked = useLargeTextMode();

  return (
    <View style={[styles.row, stacked && styles.stacked]}>
      {SHELVES.map((shelf) => {
        const active = value === shelf;
        const label = shelfLabel(shelf, track);
        return (
          <Pressable
            key={shelf}
            onPress={() => onChange(active ? null : shelf)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={label}
            accessibilityHint={
              active ? "Removes this resource from your library" : `Moves this resource to ${label}`
            }
            style={({ pressed }) => [
              styles.option,
              stacked && styles.optionStacked,
              {
                backgroundColor: active ? theme.accentSoft : theme.card,
                borderColor: active ? theme.accent : theme.cardBorder,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={styles.glyph}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              {GLYPHS[shelf]}
            </Text>
            <Text
              style={[styles.label, { color: active ? theme.accentText : theme.textSecondary }]}
              numberOfLines={stacked ? 2 : 1}
            >
              {label}
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
    gap: 8,
  },
  stacked: {
    flexDirection: "column",
  },
  option: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  optionStacked: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-start",
    paddingHorizontal: 14,
  },
  pressed: {
    opacity: 0.8,
  },
  glyph: {
    fontSize: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
});
