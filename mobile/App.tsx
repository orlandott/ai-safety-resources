import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation";
import { LibraryProvider } from "./src/store/library";

export default function App() {
  return (
    <SafeAreaProvider>
      <LibraryProvider>
        <AppNavigator />
        <StatusBar style="auto" />
      </LibraryProvider>
    </SafeAreaProvider>
  );
}
