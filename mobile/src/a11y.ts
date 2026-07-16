import { useEffect, useState } from "react";
import { AccessibilityInfo, useWindowDimensions } from "react-native";

// Hooks for the system accessibility settings the app adapts to. Each one
// defaults to false and only flips when the user has the setting enabled, so
// the default experience is untouched. Everything is guarded because not
// every platform implements every query (react-native-web has no contrast
// APIs and may return undefined from addEventListener).

type SettingQuery = () => Promise<boolean>;

const queryReduceMotion: SettingQuery = () =>
  AccessibilityInfo.isReduceMotionEnabled?.() ?? Promise.resolve(false);

// iOS: Settings → Accessibility → Display & Text Size → Increase Contrast.
const queryDarkerSystemColors: SettingQuery = () =>
  AccessibilityInfo.isDarkerSystemColorsEnabled?.() ?? Promise.resolve(false);

// Android: Settings → Accessibility → High contrast text.
const queryHighTextContrast: SettingQuery = () =>
  AccessibilityInfo.isHighTextContrastEnabled?.() ?? Promise.resolve(false);

type SettingEventName =
  | "reduceMotionChanged"
  | "darkerSystemColorsChanged"
  | "highTextContrastChanged";

function useAccessibilitySetting(query: SettingQuery, eventName: SettingEventName): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    query()
      .then((value) => {
        if (mounted) setEnabled(Boolean(value));
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(eventName, (value) =>
      setEnabled(Boolean(value))
    );
    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, [query, eventName]);

  return enabled;
}

/** True when the system Reduce Motion setting is on (prefers-reduced-motion on web). */
export function useReduceMotion(): boolean {
  return useAccessibilitySetting(queryReduceMotion, "reduceMotionChanged");
}

/** True when iOS Increase Contrast or Android High contrast text is on. */
export function useIncreaseContrast(): boolean {
  const darkerSystemColors = useAccessibilitySetting(
    queryDarkerSystemColors,
    "darkerSystemColorsChanged"
  );
  const highTextContrast = useAccessibilitySetting(
    queryHighTextContrast,
    "highTextContrastChanged"
  );
  return darkerSystemColors || highTextContrast;
}

// Dynamic Type multipliers of ~1.35+ correspond to the iOS accessibility
// text sizes; that's where truncation starts costing content.
export function useLargeTextMode(): boolean {
  return useWindowDimensions().fontScale >= 1.35;
}
