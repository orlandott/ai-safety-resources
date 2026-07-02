import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { Text } from "react-native";
import { CategoryScreen } from "../screens/CategoryScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { PathScreen } from "../screens/PathScreen";
import { ResourceDetailScreen } from "../screens/ResourceDetailScreen";
import { SavedScreen } from "../screens/SavedScreen";
import { SearchScreen } from "../screens/SearchScreen";
import { useTheme } from "../theme";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

function TabIcon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{glyph}</Text>;
}

function Tabs() {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.cardBorder },
      }}
    >
      <Tab.Screen
        name="Explore"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="🧭" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="🔍" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Library"
        component={SavedScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon glyph="🔖" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const theme = useTheme();
  const navTheme: NavTheme = {
    ...(theme.dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme.dark ? DarkTheme : DefaultTheme).colors,
      background: theme.background,
      card: theme.tabBar,
      text: theme.text,
      primary: theme.accent,
      border: theme.cardBorder,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTintColor: theme.accent,
          headerTitleStyle: { color: theme.text },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="Path" component={PathScreen} />
        <Stack.Screen
          name="Resource"
          component={ResourceDetailScreen}
          options={{ title: "" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
