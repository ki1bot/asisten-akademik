import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

function getWebStorage(): Storage | null {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !window.localStorage
  ) {
    return null;
  }

  return window.localStorage;
}

export async function getStoredValue(key: string): Promise<string | null> {
  const webStorage = getWebStorage();

  if (webStorage) {
    return webStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

export async function setStoredValue(
  key: string,
  value: string,
): Promise<void> {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export async function removeStoredValue(key: string): Promise<void> {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
