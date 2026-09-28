import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Small secrets (the server token): Keychain/Keystore on devices, local storage on web. */
export const secret = {
  async get(key: string): Promise<string | null> {
    return Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') return value ? AsyncStorage.setItem(key, value) : AsyncStorage.removeItem(key);
    return value ? SecureStore.setItemAsync(key, value) : SecureStore.deleteItemAsync(key);
  },
};
