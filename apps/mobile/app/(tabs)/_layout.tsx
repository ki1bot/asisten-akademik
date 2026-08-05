import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoadingScreen } from "@/components/loading-screen";
import { colors, radii, shadows } from "@/constants/app-theme";
import { useAuthStore } from "@/stores/auth-store";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);

  if (!hydrated) {
    return <LoadingScreen />;
  }

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  const horizontalMargin = width < 380 ? 10 : width < 768 ? 14 : 24;
  const tabBarWidth = Math.min(width - horizontalMargin * 2, 720);
  const bottomOffset = Math.max(insets.bottom, 8);
  const tabBarHeight = 66 + Math.max(insets.bottom, 4);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSoft,
        sceneStyle: {
          backgroundColor: colors.background,
        },
        tabBarLabelStyle: {
          marginTop: 2,
          fontSize: width < 360 ? 9 : 10,
          lineHeight: 13,
          fontWeight: "800",
        },
        tabBarIconStyle: {
          marginTop: 3,
        },
        tabBarItemStyle: {
          minHeight: 54,
          paddingTop: 4,
          borderRadius: radii.medium,
        },
        tabBarStyle: {
          position: "absolute",
          left: (width - tabBarWidth) / 2,
          bottom: bottomOffset,
          width: tabBarWidth,
          height: tabBarHeight,
          paddingTop: 5,
          paddingBottom: Math.max(insets.bottom, 5),
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radii.extraLarge,
          backgroundColor: colors.surface,
          ...shadows.elevated,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ringkasan",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "grid" : "grid-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="agenda"
        options={{
          title: "Agenda",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "calendar" : "calendar-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="assignments"
        options={{
          title: "Tugas",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "checkbox" : "checkbox-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="academics"
        options={{
          title: "Akademik",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "school" : "school-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Akun",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
