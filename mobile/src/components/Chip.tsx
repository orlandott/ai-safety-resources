import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme";

interface ChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
  /** Spoken label override, e.g. to drop emoji or expand counts. */
  accessibilityLabel?: string;
}

export function Chip({ label, active = false, onPress, accessibilityLabel }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: 8, bottom: 8 }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? theme.chipActiveBg : theme.chipBg,
          borderColor: active ? theme.chipActiveBg : theme.chipBorder,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: active ? theme.chipActiveText : theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
  },
});
