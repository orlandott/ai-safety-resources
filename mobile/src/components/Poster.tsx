import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { TRACK_ICONS } from "../data";
import { SERIF, useTheme } from "../theme";

interface PosterProps {
  uri: string;
  title: string;
  track: string;
  style: StyleProp<ViewStyle>;
  initialsSize?: number;
}

// Same recipe as the website's cover-fallback (public/script.js): hash the
// title to a hue, hash-derived warm gradient, initials of the first two words.
function coverHue(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) % 360;
  }
  return Math.abs(hash);
}

const STOP_WORDS = new Set(["a", "an", "the", "of", "and", "or", "to", "in", "on"]);

function coverInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const significant = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
  const source = significant.length ? significant : words;
  return source
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// Shows the remote poster when it loads; otherwise renders the site's
// typographic cover placeholder (works offline and on hosts that block
// cross-origin images).
export function Poster({ uri, title, track, style, initialsSize = 22 }: PosterProps) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);

  // Posters are decorative — the resource title is always adjacent text — so
  // hide them from screen readers, and keep artwork un-inverted under iOS
  // Smart Invert.
  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={style as StyleProp<any>}
        resizeMode="cover"
        onError={() => setFailed(true)}
        accessibilityIgnoresInvertColors
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    );
  }

  const hue = coverHue(title);
  const colors: [string, string] = theme.dark
    ? [`hsl(${hue}, 20%, 28%)`, `hsl(${(hue + 26) % 360}, 24%, 18%)`]
    : [`hsl(${hue}, 36%, 88%)`, `hsl(${(hue + 26) % 360}, 42%, 76%)`];
  const inkColor = theme.dark ? "#e7dcc8" : "#4a3f2f";

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[style, styles.fallback]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        style={[styles.initials, { color: inkColor, fontSize: initialsSize, fontFamily: SERIF }]}
      >
        {coverInitials(title)}
      </Text>
      <Text style={[styles.trackIcon, { fontSize: Math.max(12, initialsSize * 0.55) }]}>
        {TRACK_ICONS[track] ?? "📄"}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  initials: {
    fontWeight: "700",
    letterSpacing: 1,
  },
  trackIcon: {
    opacity: 0.75,
  },
});
