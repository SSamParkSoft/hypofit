import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { emitMapTabReselect } from "@/screens/map/mapTabEvents";
import { getBottomTabBarStyle, getBottomTabItemStyle, getHiddenBottomTabBarStyle } from "@/shared/navigation/tabBarStyle";

type TabIconName = "home" | "interviews" | "map" | "chat" | "profile";
type FeatherIconName = ComponentProps<typeof Feather>["name"];

const tabIconNames: Record<TabIconName, FeatherIconName> = {
  home: "home",
  interviews: "clipboard",
  map: "map",
  chat: "message-circle",
  profile: "user",
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, session } = useAuth();
  const isChatThread = pathname.startsWith("/chat/");

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/(auth)/login");
    }
  }, [isLoading, router, session]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#176B5D",
        tabBarInactiveTintColor: "#66706B",
        tabBarLabelPosition: "below-icon",
        tabBarShowLabel: true,
        tabBarStyle: isChatThread ? getHiddenBottomTabBarStyle() : getBottomTabBarStyle(insets.bottom),
        tabBarItemStyle: getBottomTabItemStyle(),
        tabBarLabel: ({ color, focused, children }) => (
          <Text
            numberOfLines={1}
            style={{
              color,
              fontFamily: focused ? "HypofitSansBold" : "HypofitSansMedium",
              fontSize: 10,
              lineHeight: 12,
              marginTop: 2,
            }}
          >
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen name="home" options={getTabOptions("home", "홈")} />
      <Tabs.Screen
        name="interviews"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.replace("/(tabs)/interviews");
          },
        }}
        options={getTabOptions("interviews", "인터뷰")}
      />
      <Tabs.Screen
        name="map"
        listeners={{
          tabPress: () => {
            if (pathname.startsWith("/map")) {
              emitMapTabReselect();
            }
          },
        }}
        options={getTabOptions("map", "지도")}
      />
      <Tabs.Screen
        name="chat"
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
            router.replace("/(tabs)/chat");
          },
        }}
        options={getTabOptions("chat", "채팅")}
      />
      <Tabs.Screen name="profile" options={getTabOptions("profile", "프로필")} />
    </Tabs>
  );
}

function getTabOptions(name: TabIconName, title: string) {
  return {
    title,
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <View
        style={{
          alignItems: "center",
          backgroundColor: focused ? "#E7F1EE" : "transparent",
          borderRadius: 999,
          height: 32,
          justifyContent: "center",
          marginBottom: 0,
          width: 46,
        }}
      >
        <Feather
          color={color}
          name={tabIconNames[name]}
          size={focused ? 23 : 22}
        />
      </View>
    ),
  };
}
