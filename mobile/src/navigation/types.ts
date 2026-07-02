import type { NativeStackScreenProps } from "@react-navigation/native-stack";

export type RootStackParamList = {
  Tabs: undefined;
  Category: { trackKey: string };
  Path: { slug: string };
  Resource: { id: string };
};

export type RootScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
