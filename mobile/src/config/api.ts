// API Configuration
//
// In dev, auto-detect the Metro bundler's host (your Mac's LAN IP) from
// expo-constants so the API URL keeps working when your IP changes. The
// hostUri looks like "192.168.1.42:8081"; we strip the port and use 5000.
//
// Override either by setting EXPO_PUBLIC_API_URL in mobile/.env, or by
// hardcoding a value below.

import Constants from 'expo-constants';

const BACKEND_PORT = 5000;

function getDevApiUrl(): string {
  const override = process.env.EXPO_PUBLIC_API_URL;
  if (override) return override;

  const hostUri =
    Constants.expoConfig?.hostUri ??
    // Older Expo SDKs / Expo Go fallback
    (Constants as any).expoGoConfig?.debuggerHost ??
    (Constants as any).manifest?.debuggerHost ??
    '';

  const host = hostUri.split(':')[0];
  if (!host) {
    // Last-resort fallback — works for iOS simulator / web, not physical devices.
    return `http://localhost:${BACKEND_PORT}`;
  }
  return `http://${host}:${BACKEND_PORT}`;
}

const API_BASE_URL = __DEV__
  ? getDevApiUrl()
  : 'https://nema-nc78.onrender.com';

export default API_BASE_URL;
