import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname, useRouter } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { useChatRooms } from "@/features/chat/useChat";
import {
  countUnreadChatRooms,
  formatChatTabBadge,
  getChatTabAccessibilityLabel,
} from "@/features/chat/unreadChatBadge";
import { emitMapTabReselect } from "@/screens/map/mapTabEvents";
import { getBottomTabBarStyle, getBottomTabItemStyle, getHiddenBottomTabBarStyle } from "@/shared/navigation/tabBarStyle";
import { useMaintenance } from "@/features/maintenance/MaintenanceProvider";

type TabIconName = "home" | "interviews" | "map" | "chat" | "profile";
type FeatherIconName = ComponentProps<typeof Feather>["name"];

const tabIconNames: Record<TabIconName, FeatherIconName> = {
  home: "home",
  interviews: "search",
  map: "map",
  chat: "message-circle",
  profile: "user",
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, session } = useAuth();
  const { status: serviceStatus } = useMaintenance();
  const isChatThread = pathname.startsWith("/chat/");
  const { data: chatRooms } = useChatRooms(session?.access_token, {
    pollingEnabled: true,
    pollingIntervalMs: 15_000,
  });
  const unreadRoomCount = countUnreadChatRooms(chatRooms);
  const chatTabBadge = formatChatTabBadge(unreadRoomCount);

  useEffect(() => {
    if (!isLoading && !session) {
      router.replace("/(auth)/login");
    }
  }, [isLoading, router, session]);

  const scheduledMaintenance = serviceStatus.scheduledMaintenance;

  return (
    <View className="flex-1">
      {scheduledMaintenance ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${scheduledMaintenance.title} 점검 안내 보기`}
          className="mx-4 mt-2 rounded-hypo-md border border-[#CBE4D4] bg-[#E8F4EC] px-3 py-2.5"
          onPress={() => router.push({ pathname: "/notice", params: { returnTo: pathname } })}
        >
          <Text className="text-[13px] font-black text-hypo-brand" numberOfLines={1}>
            {formatScheduledMaintenance(scheduledMaintenance.startsAt)} 서비스 점검 예정
          </Text>
        </Pressable>
      ) : null}
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F7A4D",
        tabBarInactiveTintColor: "#657069",
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
        options={getTabOptions("interviews", "공고")}
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
        options={{
          ...getTabOptions("chat", "채팅"),
          tabBarAccessibilityLabel: getChatTabAccessibilityLabel(unreadRoomCount),
          tabBarBadge: chatTabBadge,
          tabBarBadgeStyle: {
            backgroundColor: "#D94A4A",
            color: "#FFFFFF",
            fontFamily: "HypofitSansBold",
            fontSize: 10,
            minWidth: 17,
          },
        }}
      />
      <Tabs.Screen name="profile" options={getTabOptions("profile", "프로필")} />
      </Tabs>
    </View>
  );
}

function formatScheduledMaintenance(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "예정된";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "numeric" }).format(date);
}

function getTabOptions(name: TabIconName, title: string) {
  return {
    title,
    tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
      <View
        style={{
          alignItems: "center",
          backgroundColor: focused ? "#E8F4EC" : "transparent",
          borderRadius: 11,
          height: 26,
          justifyContent: "center",
          marginBottom: 0,
          width: 34,
        }}
      >
        <Feather
          color={color}
          name={tabIconNames[name]}
          size={focused ? 20 : 19}
        />
      </View>
    ),
  };
}
