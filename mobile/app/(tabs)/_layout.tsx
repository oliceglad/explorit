import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { Typography } from "@/constants/typography";
import Svg, { Path, Circle, Rect } from "react-native-svg";

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function FeedIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6h16M4 11h16M4 16h10"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function RoutesIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 19c0-4 2.5-6.5 6-6.5S18 9 18 5"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <Circle cx={6} cy={19} r={2.5} fill={color} />
      <Circle cx={18} cy={5} r={2.5} fill={color} />
    </Svg>
  );
}

function EventsIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={5}
        width={18}
        height={16}
        rx={2}
        stroke={color}
        strokeWidth={1.75}
      />
      <Path d="M3 10h18" stroke={color} strokeWidth={1.75} />
      <Path
        d="M8 3v4M16 3v4"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ProfileIcon({ color }: { color: string }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={3.75} stroke={color} strokeWidth={1.75} />
      <Path
        d="M4 20c0-3.866 3.582-7 8-7s8 3.134 8 7"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function MapPinIcon({ fill, hole }: { fill: string; hole: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2a7 7 0 00-7 7c0 4.75 7 13 7 13s7-8.25 7-13a7 7 0 00-7-7z"
        fill={fill}
      />
      <Circle cx={12} cy={9} r={2.4} fill={hole} />
    </Svg>
  );
}

// ─── Tab components ───────────────────────────────────────────────────────────

type IconComp = ({ color }: { color: string }) => JSX.Element;

function TabIcon({
  focused,
  label,
  Icon,
}: {
  focused: boolean;
  label: string;
  Icon: IconComp;
}) {
  const c = useTheme();
  const color = focused ? c.text1 : c.text3;
  return (
    <View style={styles.tabItem}>
      <Icon color={color} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
        style={[Typography.micro, { color, marginTop: 3, textAlign: "center" }]}
      >
        {label}
      </Text>
    </View>
  );
}

function MapTabIcon() {
  const c = useTheme();
  return (
    <View style={[styles.mapBtn, { backgroundColor: c.text1 }]}>
      <MapPinIcon fill={c.bg} hole={c.text1} />
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          height: 68 + insets.bottom,
          paddingTop: 12,
          paddingBottom: insets.bottom,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Лента" Icon={FeedIcon} />
          ),
        }}
      />
      <Tabs.Screen
        name="routes"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Маршруты" Icon={RoutesIcon} />
          ),
        }}
      />
      <Tabs.Screen name="map" options={{ tabBarIcon: () => <MapTabIcon /> }} />
      <Tabs.Screen
        name="events"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="События" Icon={EventsIcon} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} label="Профиль" Icon={ProfileIcon} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 68,
  },
  mapBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
});
