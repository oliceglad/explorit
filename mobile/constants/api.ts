import Constants from 'expo-constants';

// On a physical device, `localhost` points to the device itself.
// expo-constants exposes the Expo dev-server host (e.g. "192.168.0.162:8081"),
// so we reuse that IP to reach the backend running on the same machine.
function getHost(): string {
  if (!__DEV__) return 'localhost';
  const hostUri = Constants.expoConfig?.hostUri ?? (Constants as any).manifest?.debuggerHost;
  if (hostUri) return hostUri.split(':')[0];
  return 'localhost';
}

const HOST = getHost();

export const API_BASE_URL = `http://${HOST}/api`;
export const WS_BASE_URL = `ws://${HOST}/ws`;
