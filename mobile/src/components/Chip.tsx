import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useTheme } from "../theme";

interface ChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
}

export function Chip({ label, active = false, onPress }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
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
