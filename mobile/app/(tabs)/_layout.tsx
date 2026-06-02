import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/useTheme';
import { Typography } from '@/constants/typography';

function TabIcon({ focused, label, icon }: { focused: boolean; label: string; icon: string }) {
  const c = useTheme();
  return (
    <View style={styles.tabItem}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icon}</Text>
      <Text style={[Typography.micro, { color: focused ? c.text1 : c.text3, marginTop: 2 }]}>
        {label}
      </Text>
    </View>
  );
}

function MapTabIcon({ focused }: { focused: boolean }) {
  const c = useTheme();
  return (
    <View style={[styles.mapBtn, { backgroundColor: c.text1 }]}>
      <Text style={{ fontSize: 24, color: c.bg }}>🗺</Text>
    </View>
  );
}

export default function TabsLayout() {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Лента" icon="📰" /> }}
      />
      <Tabs.Screen
        name="routes"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Маршруты" icon="🗂" /> }}
      />
      <Tabs.Screen
        name="map"
        options={{ tabBarIcon: ({ focused }) => <MapTabIcon focused={focused} /> }}
      />
      <Tabs.Screen
        name="events"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="События" icon="🎭" /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabIcon focused={focused} label="Профиль" icon="👤" /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  mapBtn: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8,
  },
});
