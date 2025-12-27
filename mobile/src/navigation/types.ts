import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// Root stack navigator params
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Login: undefined;
  Register: undefined;
  MovieDetail: { movieId: string };
  VideoPlayer: { movieId: string; startTime?: number };
  Profile: { username?: string };
  Settings: undefined;
  Search: undefined;
  Messages: undefined;
  Conversation: { conversationId: string };
  Notifications: undefined;
};

// Main tab navigator params
export type MainTabParamList = {
  Home: undefined;
  Catalog: undefined;
  Watchlist: undefined;
  ProfileTab: undefined;
};

// Screen props types
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// Declare global types for useNavigation hook
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
