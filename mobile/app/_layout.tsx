import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold,
  Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import {
  InstrumentSerif_400Regular,
} from '@expo-google-fonts/instrument-serif';
import { useAuthStore } from '@/store/auth';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
    InstrumentSerif_400Regular,
  });
  const loadUser = useAuthStore((s) => s.loadUser);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (fontsLoaded && isHydrated) SplashScreen.hideAsync();
  }, [fontsLoaded, isHydrated]);

  if (!fontsLoaded || !isHydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="route/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="post/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="explore/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="user/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="edit-profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="gamification" options={{ presentation: 'card' }} />
        <Stack.Screen name="coop/[code]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="place-map" options={{ presentation: 'card' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
