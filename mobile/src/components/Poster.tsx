import React, { useState } from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { TRACK_ICONS } from "../data";
import { useTheme } from "../theme";

interface PosterProps {
  uri: string;
  track: string;
  style: StyleProp<ViewStyle>;
  iconSize?: number;
}

// Falls back to the category icon when there is no poster URL or it fails to
// load (dead link, or blocked network as on the hosted web preview).
export function Poster({ uri, track, style, iconSize = 28 }: PosterProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={style as StyleProp<any>}
        resizeMode="cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={[style, styles.fallback, { backgroundColor: theme.accentSoft }]}>
      <Text style={{ fontSize: iconSize }}>{TRACK_ICONS[track] ?? "📄"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
});
