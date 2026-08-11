import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/features/notifications/useNotifications";
import { StateMessage } from "@/screens/home/HomeScreen";
import type { NotificationRecord } from "@/shared/api/notifications";
import { getSafeReturnTo, goBackOrReplaceReturnTo } from "@/shared/navigation/backNavigation";
import { AppScreen } from "@/shared/ui/AppScreen";
import { ListRow, ListSection } from "@/shared/ui/ListSurface";

export function NotificationsScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const explicitBackTo = getSafeReturnTo(params.returnTo);
  const backTo = explicitBackTo ?? "/(tabs)/home";
  const { accessToken } = useAuth();
  const { data: notifications = [], isError, isLoading } = useNotifications(accessToken, { limit: 50 });
  const markNotificationRead = useMarkNotificationRead(accessToken);
  const markAllNotificationsRead = useMarkAllNotificationsRead(accessToken);
  const [actionError, setActionError] = useState<string | null>(null);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.read_at === null).length,
    [notifications],
  );
  const notificationGroups = useMemo(() => groupNotificationsByDate(notifications), [notifications]);

  const handleNotificationPress = (notification: NotificationRecord) => {
    setActionError(null);

    const navigate = () => {
      navigateToNotificationTarget(notification, String(backTo));
    };

    if (notification.read_at) {
      navigate();
      return;
    }

    markNotificationRead.mutate(notification.id, {
      onError: () => {
        setActionError("읽음 상태를 바꾸지 못했어요. 다시 시도해 주세요.");
      },
      onSuccess: navigate,
    });
  };

  return (
    <AppScreen
      backTo={backTo}
      onBack={() => goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/home")}
      title="알림"
      description={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개가 있어요.` : "새 소식이 생기면 여기에서 확인해요."}
      scroll={false}
      contentClassName="min-h-0 flex-1"
      right={
        <Pressable
          accessibilityRole="button"
          className={`h-10 justify-center px-1 ${
            unreadCount === 0 || markAllNotificationsRead.isPending ? "opacity-50" : ""
          }`}
          disabled={unreadCount === 0 || markAllNotificationsRead.isPending}
          onPress={() => {
            setActionError(null);
            markAllNotificationsRead.mutate(undefined, {
              onError: () => {
                setActionError("알림을 모두 읽음으로 바꾸지 못했어요. 다시 시도해 주세요.");
              },
            });
          }}
          style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
        >
          {markAllNotificationsRead.isPending ? (
            <ActivityIndicator color="#176B5D" size="small" />
          ) : (
            <Text className="text-[12px] font-black text-hypo-brand">모두 읽음</Text>
          )}
        </Pressable>
      }
    >
      {!accessToken ? (
        <StateMessage title="로그인이 필요해요." description="신청 상태와 채팅 소식은 로그인 후 볼 수 있어요." />
      ) : null}

      {accessToken && actionError ? (
        <Text className="px-1 text-xs font-bold leading-[18px] text-hypo-danger">{actionError}</Text>
      ) : null}

      {accessToken ? (
        <View className="min-h-0 flex-1">
          {isLoading ? <StateMessage title="알림을 불러오는 중이에요." loading /> : null}

          {isError ? (
            <StateMessage title="알림을 불러오지 못했어요." description="잠시 후 다시 시도해 주세요." />
          ) : null}

          {!isLoading && !isError && notifications.length === 0 ? (
            <StateMessage
              title="새 알림이 없어요."
              description="지원 상태나 채팅 소식이 생기면 여기에서 확인할 수 있어요."
            />
          ) : null}

          {!isLoading && !isError && notifications.length > 0 ? (
            <ListSection chrome="plain" className="min-h-0 flex-1" surface="background">
              <ScrollView contentContainerClassName="pb-3" showsVerticalScrollIndicator={false}>
                {notificationGroups.map((group, groupIndex) => (
                  <View key={group.title} className={groupIndex === 0 ? "" : "mt-5"}>
                    <Text className="px-1 pb-1 text-[12px] font-black leading-[18px] text-hypo-muted">
                      {group.title}
                    </Text>
                    <View>
                      {group.notifications.map((notification) => (
                        <NotificationRow
                          key={notification.id}
                          isSubmitting={
                            markNotificationRead.isPending && markNotificationRead.variables === notification.id
                          }
                          notification={notification}
                          onPress={() => handleNotificationPress(notification)}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </ListSection>
          ) : null}
        </View>
      ) : null}
    </AppScreen>
  );
}

function NotificationRow({
  isSubmitting,
  notification,
  onPress,
}: {
  isSubmitting: boolean;
  notification: NotificationRecord;
  onPress: () => void;
}) {
  const isUnread = notification.read_at === null;
  const destinationLabel = getNotificationDestinationLabel(notification.target_type);
  const iconName = getNotificationIconName(notification.type);

  return (
    <ListRow appearance="flat" className="py-[14px]" onPress={onPress}>
      <View className="flex-row items-start gap-3">
        <View className="relative w-8 items-center pt-0.5">
          {isUnread ? <View className="absolute left-0 top-1 h-2 w-2 rounded-full bg-hypo-brand" /> : null}
          <View className="h-7 w-7 items-center justify-center rounded-full bg-transparent">
            <Feather color={isUnread ? "#176B5D" : "#66706B"} name={iconName} size={16} />
          </View>
        </View>

        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between gap-3">
            <Text
              numberOfLines={1}
              className={`min-w-0 flex-1 text-[15px] leading-[22px] ${
                isUnread ? "font-black text-hypo-text" : "font-bold text-hypo-muted"
              }`}
            >
              {notification.title}
            </Text>
            <Text className="shrink-0 pt-0.5 text-[11px] font-bold leading-4 text-hypo-muted">
              {formatRelativeTime(notification.created_at)}
            </Text>
          </View>

          <Text
            numberOfLines={2}
            className={`mt-1 text-[13px] leading-5 ${
              isUnread ? "font-bold text-hypo-muted" : "font-medium text-[#8A9387]"
            }`}
          >
            {notification.body}
          </Text>

          {destinationLabel || isSubmitting ? (
            <View className="mt-1.5 flex-row items-center gap-2">
              {destinationLabel ? (
                <Text className={`text-[11px] font-black ${isUnread ? "text-hypo-brand" : "text-hypo-muted"}`}>
                  {destinationLabel}
                </Text>
              ) : null}
              {isSubmitting ? <ActivityIndicator color="#176B5D" size="small" /> : null}
            </View>
          ) : null}
        </View>
      </View>
    </ListRow>
  );
}

function groupNotificationsByDate(notifications: NotificationRecord[]) {
  const groups: Array<{ title: string; notifications: NotificationRecord[] }> = [];

  for (const notification of notifications) {
    const title = getNotificationGroupTitle(notification.created_at);
    const existingGroup = groups.find((group) => group.title === title);

    if (existingGroup) {
      existingGroup.notifications.push(notification);
      continue;
    }

    groups.push({ title, notifications: [notification] });
  }

  return groups;
}

function getNotificationGroupTitle(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "지난 알림";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const date = new Date(value);
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.floor((today - targetDay) / 86_400_000);

  if (diffDays <= 0) return "오늘";
  if (diffDays === 1) return "어제";
  if (diffDays < 7) return "이번 주";
  return "지난 알림";
}

function getNotificationIconName(type: string): "bell" | "calendar" | "check-circle" | "file-text" | "message-circle" | "x-circle" {
  switch (type) {
    case "application_selected":
      return "check-circle";
    case "application_rejected":
      return "x-circle";
    case "chat_message":
    case "support_replied":
      return "message-circle";
    case "session_rescheduled":
    case "session_completed":
    case "session_canceled":
    case "no_show_marked":
      return "calendar";
    case "application_created":
    case "application_withdrawn":
      return "file-text";
    default:
      return "bell";
  }
}

function getNotificationDestinationLabel(targetType: string | null) {
  switch (targetType) {
    case "chat_room":
      return "채팅";
    case "application":
    case "interview_session":
      return "내 인터뷰";
    case "support_ticket":
      return "문의";
    case "interview_post":
      return "모집글";
    default:
      return null;
  }
}

function navigateToNotificationTarget(notification: NotificationRecord, parentReturnTo: string) {
  const notificationsReturnTo = `/notifications?returnTo=${encodeURIComponent(parentReturnTo)}`;

  switch (notification.target_type) {
    case "chat_room":
      if (notification.target_id) {
        router.push({
          pathname: "/(tabs)/chat/[roomId]",
          params: { roomId: notification.target_id },
        });
      }
      return;
    case "interview_post":
      if (notification.target_id) {
        router.push({
          pathname: "/interviews/[postId]",
          params: { postId: notification.target_id, returnTo: notificationsReturnTo },
        });
      }
      return;
    case "application":
    case "interview_session":
      router.push({
        pathname: "/(tabs)/interviews/my-interviews",
        params: { returnTo: notificationsReturnTo },
      });
      return;
    case "support_ticket":
      router.push({
        pathname: "/support",
        params: notification.target_id
          ? { returnTo: notificationsReturnTo, ticketId: notification.target_id }
          : { returnTo: notificationsReturnTo },
      });
      return;
    default:
      return;
  }
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (diffMinutes < 1) return "방금";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffHours < 168) return `${Math.floor(diffHours / 24)}일 전`;

  const date = new Date(value);
  return date.toLocaleDateString("ko-KR", {
    day: "numeric",
    month: "long",
  });
}
