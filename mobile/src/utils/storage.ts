import AsyncStorage from '@react-native-async-storage/async-storage';

// Using AsyncStorage only - SecureStore has JSI issues with New Architecture in Expo Go
export const storage = {
  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },

  async deleteItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};
