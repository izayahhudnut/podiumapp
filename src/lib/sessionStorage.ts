import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

type SupportedStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const webStorage: SupportedStorage = {
  async getItem(key) {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    return localStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(key);
  },
};

const nativeStorage: SupportedStorage = {
  getItem(key) {
    return SecureStore.getItemAsync(key);
  },
  setItem(key, value) {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem(key) {
    return SecureStore.deleteItemAsync(key);
  },
};

export const sessionStorage =
  Platform.OS === 'web' ? webStorage : nativeStorage;
