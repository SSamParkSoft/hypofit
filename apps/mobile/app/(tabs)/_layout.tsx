import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import { AccessibilityInfo, Pressable, Text, View } from "react-native";
import type { ColorValue } from "react-native";
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
import { FloatingTabBarBackground } from "@/shared/navigation/FloatingTabBarBackground";
import { ScrollAnimatedTabBar } from "@/shared/navigation/ScrollAnimatedTabBar";
import { shouldHideTabBar, subscribeTabBarVisibility } from "@/shared/navigation/tabBarScroll";
import { useMaintenance } from "@/features/maintenance/MaintenanceProvider";
import { colors } from "@/shared/theme/tokens";

type TabIconName = "interviews" | "map" | "chat" | "profile";
type FeatherIconName = ComponentProps<typeof Feather>["name"];

const tabIconNames: Record<TabIconName, FeatherIconName> = {
  interviews: "search",
  map: "map",
  chat: "message-circle",
  profile: "menu",
};

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, session } = useAuth();
  const { status: serviceStatus } = useMaintenance();
  const isChatThread = pathname.startsWith("/chat/");
  const [tabBarVisible, setTabBarVisible] = useState(true);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(true);
  const hideForPostingScroll = shouldHideTabBar(pathname, tabBarVisible, screenReaderEnabled);
  const tabBarStyle = getBottomTabBarStyle(insets.bottom);

  useEffect(() => subscribeTabBarVisibility(setTabBarVisible), []);
  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener("screenReaderChanged", setScreenReaderEnabled);
    void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (active) setScreenReaderEnabled(enabled);
    }).catch(() => {});
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
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
          className="mx-4 mt-2 rounded-hypo-md border border-[#CBE4D4] bg-hypo-brandSoft px-3 py-2.5"
          onPress={() => router.push({ pathname: "/notice", params: { returnTo: pathname, ...(scheduledMaintenance.noticeId ? { noticeId: scheduledMaintenance.noticeId } : {}) } })}
        >
          <Text className="text-[13px] font-black text-hypo-brand" numberOfLines={1}>
            {formatScheduledMaintenance(scheduledMaintenance.startsAt)} 서비스 점검 예정
          </Text>
        </Pressable>
      ) : null}
      <Tabs
      initialRouteName="interviews"
      tabBar={(props) => (
        <ScrollAnimatedTabBar {...props} hidden={hideForPostingScroll} bottomInset={insets.bottom} />
      )}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelPosition: "below-icon",
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarBackground: () => <FloatingTabBarBackground />,
        tabBarStyle: isChatThread ? getHiddenBottomTabBarStyle() : tabBarStyle,
        tabBarItemStyle: getBottomTabItemStyle(),
        tabBarLabel: ({ color, focused, children }) => (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            style={{
              color,
              fontFamily: focused ? "HypofitSansBold" : "HypofitSansMedium",
              fontSize: 11,
              lineHeight: 14,
              marginTop: 2,
            }}
          >
            {children}
          </Text>
        ),
      }}
    >
      <Tabs.Screen name="home" options={{ href: null }} />
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
            color: colors.surface,
            fontFamily: "HypofitSansBold",
            fontSize: 10,
            minWidth: 17,
          },
        }}
      />
      <Tabs.Screen name="profile" options={getTabOptions("profile", "더보기")} />
      </Tabs>
    </View>
  );
}

function formatScheduledMaintenance(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "예정된";
  return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

function getTabOptions(name: TabIconName, title: string) {
  return {
    title,
    tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <View
        style={{
          alignItems: "center",
          backgroundColor: focused ? colors.brandSoft : "transparent",
          borderRadius: 13,
          height: 26,
          justifyContent: "center",
          marginBottom: 0,
          width: 36,
        }}
      >
        <Feather
          color={color}
          name={tabIconNames[name]}
          size={21}
        />
      </View>
    ),
  };
}
