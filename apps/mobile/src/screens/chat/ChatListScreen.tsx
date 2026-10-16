import { useCallback, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ChatRoom } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useChatRooms } from "@/features/chat/useChat";
import { StateMessage } from "@/shared/ui/StateMessage";
import { useAppActive } from "@/shared/hooks/useAppActive";
import { ListSection } from "@/shared/ui/ListSurface";
import { NotificationButton } from "@/features/notifications/NotificationButton";
import { getBottomTabBarHeight } from "@/shared/navigation/tabBarStyle";
import { createTabBarScrollTracker, emitTabBarVisibility } from "@/shared/navigation/tabBarScroll";
import { Avatar, CounterpartProfileModal, getCounterpart } from "./CounterpartProfileModal";
import { colors } from "@/shared/theme/tokens";

export function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { accessToken, appUser } = useAuth();
  const isAppActive = useAppActive();
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const scrollOffset = useRef(0);
  const tabBarScrollTracker = useRef(createTabBarScrollTracker());
  const shouldPollRooms = isScreenFocused && isAppActive && Boolean(accessToken);
  const { data: rooms = [], isError, isLoading } = useChatRooms(accessToken, {
    pollingEnabled: shouldPollRooms,
    pollingIntervalMs: 15_000,
  });
  const [profileRoom, setProfileRoom] = useState<ChatRoom | null>(null);

  const visibleRooms = useMemo(
    () => rooms.filter((room) => !room.is_hidden).sort(compareChatRooms),
    [rooms],
  );

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      tabBarScrollTracker.current = createTabBarScrollTracker(scrollOffset.current);
      emitTabBarVisibility(true);

      return () => {
        setIsScreenFocused(false);
        emitTabBarVisibility(true);
      };
    }, []),
  );

  const handleListScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    scrollOffset.current = Math.max(0, contentOffset.y);
    const visible = tabBarScrollTracker.current(contentOffset.y, contentSize.height - layoutMeasurement.height);
    if (visible !== undefined) emitTabBarVisibility(visible);
  }, []);

  if (!accessToken) {
    return (
      <SafeAreaView className="flex-1 bg-hypo-surface" edges={["top", "left", "right"]}>
        <View className="flex-1 px-4 pt-3">
          <Header />
          <StateMessage title="로그인이 필요해요." description="공고와 관련된 대화는 로그인 후 볼 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-surface" edges={["top", "left", "right"]}>
      <View className="flex-1 px-4 pt-3">
        <Header />

        {isLoading ? <StateMessage title="채팅을 불러오는 중입니다." loading /> : null}
        {isError ? (
          <StateMessage title="채팅을 불러오지 못했습니다." description="API 연결 상태를 확인한 뒤 다시 시도하세요." />
        ) : null}
        {!isLoading && !isError && visibleRooms.length === 0 ? <ChatEmptyState /> : null}

        {!isLoading && !isError && visibleRooms.length > 0 ? (
          <ListSection chrome="plain" className="-mx-4 mt-2 min-h-0 flex-1" surface="surface">
            <ScrollView
              contentContainerStyle={{ paddingBottom: getBottomTabBarHeight(insets.bottom) + 24 }}
              onScroll={handleListScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              {visibleRooms.map((room) => (
                <ChatRoomRow
                  key={room.id}
                  currentUserId={appUser?.id}
                  room={room}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/chat/[roomId]",
                      params: { roomId: room.id },
                    })
                  }
                  onProfilePress={() => setProfileRoom(room)}
                />
              ))}
            </ScrollView>
          </ListSection>
        ) : null}

        <CounterpartProfileModal
          currentUserId={appUser?.id}
          room={profileRoom}
          onClose={() => setProfileRoom(null)}
          onReport={(room) => {
            const counterpart = getCounterpart(room, appUser?.id);
            setProfileRoom(null);
            router.push({
              pathname: "/support/report",
              params: {
                category: "chat",
                counterpart_name: counterpart?.name,
                interview_title: room.interview_post?.title,
                returnTo: "/(tabs)/chat",
                target_id: room.id,
                target_type: "chat_room",
              },
            });
          }}
        />
      </View>
    </SafeAreaView>
  );
}

function ChatEmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-6 pb-10">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-hypo-brandSoft">
        <Feather color={colors.brand} name="message-circle" size={21} />
      </View>
      <Text className="mt-4 text-center text-[18px] leading-[25px] text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>
        아직 대화가 없어요
      </Text>
      <Text className="mt-2 max-w-[260px] text-center text-[13px] leading-5 text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>
        선정되거나 안내가 필요한 공고의 대화가 여기에 표시돼요.
      </Text>
    </View>
  );
}

function Header() {
  return (
    <View className="min-h-12 flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1 pl-1">
        <Text className="text-[23px] font-bold leading-[30px] text-hypo-text">채팅</Text>
      </View>
      <NotificationButton returnTo="/(tabs)/chat" />
    </View>
  );
}

function compareChatRooms(a: ChatRoom, b: ChatRoom) {
  const unreadDelta = Number(b.unread_count > 0) - Number(a.unread_count > 0);
  if (unreadDelta !== 0) {
    return unreadDelta;
  }

  const activityDelta = getChatRoomActivityTime(b) - getChatRoomActivityTime(a);
  if (activityDelta !== 0) {
    return activityDelta;
  }

  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function getChatRoomActivityTime(room: ChatRoom) {
  return new Date(room.last_message_at ?? room.updated_at ?? room.created_at).getTime();
}

function ChatRoomRow({
  currentUserId,
  onPress,
  onProfilePress,
  room,
}: {
  currentUserId?: string;
  onPress: () => void;
  onProfilePress: () => void;
  room: ChatRoom;
}) {
  const counterpart = getCounterpart(room, currentUserId);
  const title = room.interview_post?.title ?? "공고 대화";
  const lastMessage = room.last_message?.body ?? "공고와 관련된 안내가 도착했어요.";
  const timeLabel = formatRelativeTime(room.last_message?.created_at ?? room.last_message_at);
  const statusLabel = getRoomStatusLabel(room.status);
  const statusTextClassName = getRoomStatusTextClassName(room.status);
  const hasUnread = room.unread_count > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="채팅방을 엽니다"
      className="bg-transparent"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
    >
      <View className="min-h-[76px] flex-row items-start gap-3 px-5 py-3.5">
        <Pressable
          accessibilityLabel={`${counterpart?.name ?? "상대방"} 프로필 보기`}
          accessibilityRole="button"
          hitSlop={8}
          className="shrink-0"
          onPress={onProfilePress}
        >
          <Avatar iconSize={22} sizeClassName="h-11 w-11" user={counterpart} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
            <Text
              numberOfLines={1}
              className="min-w-0 flex-1 text-[16px] leading-5 text-hypo-text"
              style={{ fontFamily: "HypofitSansBold" }}
            >
              {counterpart?.name ?? "상대방"}
            </Text>
            <Text className={`shrink-0 text-[11px] leading-4 ${statusTextClassName}`} style={{ fontFamily: "HypofitSansMedium" }}>
              {statusLabel}
            </Text>
          </View>
          <Text numberOfLines={1} className="mt-1 text-[12px] leading-[17px] text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>
            {title}
          </Text>
          <Text
            numberOfLines={1}
            className={`mt-1.5 text-[14px] leading-5 ${hasUnread ? "text-hypo-text" : "text-hypo-muted"}`}
            style={{ fontFamily: "HypofitSansMedium" }}
          >
            {lastMessage}
          </Text>
        </View>
        <View className="min-w-11 shrink-0 self-stretch items-end gap-2">
          {timeLabel ? (
            <Text className="text-right text-[11px] leading-4 text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>
              {timeLabel}
            </Text>
          ) : null}
          {hasUnread ? (
            <View accessibilityLabel={`읽지 않은 메시지 ${room.unread_count}개`} className="mt-auto min-w-[20px] items-center rounded-full bg-hypo-brand px-1.5 py-0.5">
              <Text className="text-[11px] leading-4 text-white" style={{ fontFamily: "HypofitSansBold" }}>{room.unread_count > 99 ? "99+" : room.unread_count}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

function getRoomStatusLabel(status: ChatRoom["status"]) {
  switch (status) {
    case "selected":
      return "선정";
    case "closed":
      return "종료";
    case "blocked":
      return "차단";
    default:
      return "조율 중";
  }
}

function getRoomStatusTextClassName(status: ChatRoom["status"]) {
  switch (status) {
    case "selected":
      return "text-hypo-brand";
    case "closed":
      return "text-[#6F766C]";
    case "blocked":
      return "text-[#C2413B]";
    default:
      return "text-[#8A6A16]";
  }
}

function formatRelativeTime(value: string | null): string {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "";
  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  return `${Math.floor(diffHours / 24)}일 전`;
}
