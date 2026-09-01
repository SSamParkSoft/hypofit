import { useCallback, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ChatRoom } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useChatRooms, useUpdateChatRoomSettings } from "@/features/chat/useChat";
import { StateMessage } from "@/screens/home/HomeScreen";
import { useAppActive } from "@/shared/hooks/useAppActive";
import { ListRow, ListSection } from "@/shared/ui/ListSurface";
import { NotificationButton } from "@/shared/ui/NotificationButton";
import { Avatar, CounterpartProfileModal, getCounterpart } from "./CounterpartProfileModal";

export function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { accessToken, appUser } = useAuth();
  const isAppActive = useAppActive();
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const shouldPollRooms = isScreenFocused && isAppActive && Boolean(accessToken);
  const { data: rooms = [], isError, isLoading } = useChatRooms(accessToken, {
    pollingEnabled: shouldPollRooms,
    pollingIntervalMs: 15_000,
  });
  const [actionRoom, setActionRoom] = useState<ChatRoom | null>(null);
  const [actionMenuTop, setActionMenuTop] = useState<number | null>(null);
  const [profileRoom, setProfileRoom] = useState<ChatRoom | null>(null);
  const updateSettings = useUpdateChatRoomSettings(actionRoom?.id, accessToken);

  const visibleRooms = useMemo(
    () => rooms.filter((room) => !room.is_hidden).sort(compareChatRooms),
    [rooms],
  );

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      return () => {
        setIsScreenFocused(false);
      };
    }, []),
  );

  if (!accessToken) {
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg" edges={["top", "left", "right"]}>
        <View className="flex-1 px-4 pt-3">
          <Header />
          <StateMessage title="로그인이 필요해요." description="공고와 관련된 대화는 로그인 후 볼 수 있어요." />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg" edges={["top", "left", "right"]}>
      <View className="flex-1 px-4 pt-3">
        <Header />

        {isLoading ? <StateMessage title="채팅을 불러오는 중입니다." loading /> : null}
        {isError ? (
          <StateMessage title="채팅을 불러오지 못했습니다." description="API 연결 상태를 확인한 뒤 다시 시도하세요." />
        ) : null}
        {!isLoading && !isError && visibleRooms.length === 0 ? <ChatEmptyState /> : null}

        {!isLoading && !isError && visibleRooms.length > 0 ? (
          <ListSection chrome="plain" className="-mx-3 mt-2 min-h-0 flex-1" surface="background">
            <ScrollView contentContainerClassName="pb-24" showsVerticalScrollIndicator={false}>
              {visibleRooms.map((room) => (
                <ChatRoomRow
                  key={room.id}
                  currentUserId={appUser?.id}
                  room={room}
                  onMenuPress={(event) => {
                    setActionMenuTop(getRoomActionMenuTop({
                      pageY: event.nativeEvent.pageY,
                      windowHeight,
                      insetsTop: insets.top,
                      insetsBottom: insets.bottom,
                    }));
                    setActionRoom((current) => (current?.id === room.id ? null : room));
                  }}
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

        <RoomActionMenu
          anchorTop={actionMenuTop ?? insets.top + 76}
          isSubmitting={updateSettings.isPending}
          room={actionRoom}
          onClose={() => setActionRoom(null)}
          onHide={() => {
            updateSettings.mutate({ is_hidden: true }, { onSuccess: () => setActionRoom(null) });
          }}
          onMuteToggle={() => {
            if (!actionRoom) return;
            updateSettings.mutate({ is_muted: !actionRoom.is_muted }, { onSuccess: () => setActionRoom(null) });
          }}
          onReport={() => {
            if (!actionRoom) return;
            const counterpart = getCounterpart(actionRoom, appUser?.id);
            setActionRoom(null);
            router.push({
              pathname: "/support/report",
              params: {
                category: "chat",
                counterpart_name: counterpart?.name,
                interview_title: actionRoom.interview_post?.title,
                returnTo: "/(tabs)/chat",
                target_id: actionRoom.id,
                target_type: "chat_room",
              },
            });
          }}
        />
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
        <Feather color="#0F7A4D" name="message-circle" size={21} />
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
  onMenuPress,
  onPress,
  onProfilePress,
  room,
}: {
  currentUserId?: string;
  onMenuPress: (event: GestureResponderEvent) => void;
  onPress: () => void;
  onProfilePress: () => void;
  room: ChatRoom;
}) {
  const counterpart = getCounterpart(room, currentUserId);
  const title = room.interview_post?.title ?? "공고 대화";
  const lastMessage = room.last_message?.body ?? "공고와 관련된 안내가 도착했어요.";
  const timeLabel = formatRelativeTime(room.last_message_at ?? room.updated_at);
  const statusLabel = getRoomStatusLabel(room.status);
  const statusBadgeClassName = getRoomStatusBadgeClassName(room.status);
  const statusTextClassName = getRoomStatusTextClassName(room.status);

  return (
    <ListRow className="px-0 py-0" onPress={onPress}>
      <View className="min-h-[76px] flex-row items-start gap-3.5 px-0 py-3">
        <Pressable
          accessibilityLabel={`${counterpart?.name ?? "상대방"} 프로필 보기`}
          accessibilityRole="button"
          hitSlop={8}
          className="shrink-0"
          onPress={onProfilePress}
        >
          <Avatar sizeClassName="h-11 w-11" textClassName="text-[14px]" user={counterpart} />
        </Pressable>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text
              numberOfLines={1}
              className="min-w-0 flex-1 text-[16px] leading-5 text-hypo-text"
              style={{ fontFamily: "HypofitSansBold" }}
            >
              {counterpart?.name ?? "상대방"}
            </Text>
            <View className={`shrink-0 rounded-full border px-1.5 py-0.5 ${statusBadgeClassName}`}>
              <Text numberOfLines={1} className={`text-[10px] leading-[14px] ${statusTextClassName}`} style={{ fontFamily: "HypofitSansBold" }}>
                {statusLabel}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`${counterpart?.name ?? "상대방"} 채팅 메뉴 열기`}
              accessibilityRole="button"
              hitSlop={12}
              className="-mr-1 rounded-full p-1"
              onPress={onMenuPress}
            >
              <MoreIcon />
            </Pressable>
          </View>
          <Text
            numberOfLines={1}
            className="mt-1 text-[12px] leading-[16px] text-hypo-textSoft"
            style={{ fontFamily: "HypofitSansMedium" }}
          >
            {title}
          </Text>
          <View className="mt-1.5 flex-row items-center gap-2">
            <Text
              numberOfLines={1}
              className="min-w-0 flex-1 text-[13px] leading-[18px] text-hypo-muted"
              style={{ fontFamily: "HypofitSansMedium" }}
            >
              {lastMessage}
            </Text>
            {timeLabel ? (
              <Text numberOfLines={1} className="shrink-0 text-[11px] leading-4 text-hypo-textSoft" style={{ fontFamily: "HypofitSansMedium" }}>
                {timeLabel}
              </Text>
            ) : null}
            {room.unread_count > 0 ? (
              <View className="min-w-[20px] items-center rounded-full bg-hypo-brand px-1.5 py-0.5">
                <Text className="text-[10px] text-white" style={{ fontFamily: "HypofitSansBold" }}>{room.unread_count > 99 ? "99+" : room.unread_count}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </ListRow>
  );
}

function RoomActionMenu({
  anchorTop,
  isSubmitting,
  onClose,
  onHide,
  onMuteToggle,
  onReport,
  room,
}: {
  anchorTop: number;
  isSubmitting?: boolean;
  onClose: () => void;
  onHide: () => void;
  onMuteToggle: () => void;
  onReport: () => void;
  room: ChatRoom | null;
}) {
  if (!room) return null;

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View className="flex-1">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View
          className="absolute right-4 w-[236px] rounded-[16px] border border-hypo-border bg-hypo-surface px-3 py-3 shadow-lg"
          style={{ top: anchorTop }}
        >
          <View>
            <ActionButton disabled={isSubmitting} label={room.is_muted ? "알림 켜기" : "알림 끄기"} onPress={onMuteToggle} />
            <ActionButton disabled={isSubmitting} label="목록에서 숨기기" onPress={onHide} />
            <View className="my-1 h-px bg-hypo-border" />
            <ActionButton tone="danger" label="신고하기" onPress={onReport} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ActionButton({
  disabled,
  label,
  onPress,
  tone = "default",
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`min-h-11 justify-center rounded-[10px] px-2.5 ${disabled ? "opacity-45" : "opacity-100"}`}
      onPress={onPress}
    >
      <Text className={`text-[14px] font-black ${tone === "danger" ? "text-hypo-danger" : "text-hypo-text"}`}>{label}</Text>
    </Pressable>
  );
}

function getRoomActionMenuTop({
  insetsBottom,
  insetsTop,
  pageY,
  windowHeight,
}: {
  insetsBottom: number;
  insetsTop: number;
  pageY: number;
  windowHeight: number;
}) {
  const menuEstimatedHeight = 176;
  const minimumTop = insetsTop + 56;
  const maximumTop = windowHeight - insetsBottom - menuEstimatedHeight - 12;
  const preferredTop = pageY + 12;

  return Math.max(minimumTop, Math.min(preferredTop, maximumTop));
}

function MoreIcon() {
  return (
    <View className="flex-row items-center gap-0.5">
      <View className="h-1 w-1 rounded-full bg-hypo-muted" />
      <View className="h-1 w-1 rounded-full bg-hypo-muted" />
      <View className="h-1 w-1 rounded-full bg-hypo-muted" />
    </View>
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

function getRoomStatusBadgeClassName(status: ChatRoom["status"]) {
  switch (status) {
    case "selected":
      return "border-[#B9DED3] bg-[#EAF7F2]";
    case "closed":
      return "border-[#DADFD6] bg-[#F0F2EC]";
    case "blocked":
      return "border-[#F2C4C4] bg-[#FFF0F0]";
    default:
      return "border-[#E3D8B8] bg-[#FFF7DA]";
  }
}

function getRoomStatusTextClassName(status: ChatRoom["status"]) {
  switch (status) {
    case "selected":
      return "text-[#176B5D]";
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
