import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/features/notifications/useNotifications";
import { StateMessage } from "@/shared/ui/StateMessage";
import type { NotificationRecord } from "@/features/notifications/notificationsApi";
import { getSafeReturnTo, goBackOrReplaceReturnTo } from "@/shared/navigation/backNavigation";
import { AppScreen } from "@/shared/ui/AppScreen";
import { ListSection } from "@/shared/ui/ListSurface";
import { colors } from "@/shared/theme/tokens";
import { getNotificationContent, getNotificationDestination } from "@/features/notifications/notificationPresentation";

export function NotificationsScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const explicitBackTo = getSafeReturnTo(params.returnTo);
  const backTo = explicitBackTo ?? "/(tabs)/interviews";
  const { accessToken } = useAuth();
  const { data: notifications = [], isError, isLoading } = useNotifications(accessToken, { limit: 50 });
  const markNotificationRead = useMarkNotificationRead(accessToken);
  const markAllNotificationsRead = useMarkAllNotificationsRead(accessToken);
  const [actionError, setActionError] = useState<string | null>(null);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => notification.read_at === null).length,
    [notifications],
  );

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
      onBack={() => goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/interviews")}
      title="알림"
      description={unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : undefined}
      scroll={false}
      contentClassName="min-h-0 flex-1"
      right={unreadCount > 0 ? (
        <Pressable
          accessibilityLabel="모두 읽기"
          accessibilityRole="button"
          accessibilityState={{ disabled: markAllNotificationsRead.isPending, busy: markAllNotificationsRead.isPending }}
          className="min-h-11 justify-center px-1"
          disabled={markAllNotificationsRead.isPending}
          onPress={() => {
            setActionError(null);
            markAllNotificationsRead.mutate(undefined, {
              onError: () => {
                setActionError("알림을 모두 읽음으로 바꾸지 못했어요. 다시 시도해 주세요.");
              },
            });
          }}
          style={({ pressed }) => ({ opacity: markAllNotificationsRead.isPending ? 0.5 : pressed ? 0.72 : 1 })}
        >
          {markAllNotificationsRead.isPending ? (
            <ActivityIndicator color={colors.brand} size="small" />
          ) : (
            <Text className="text-[13px] font-semibold text-hypo-brand">모두 읽기</Text>
          )}
        </Pressable>
      ) : null}
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
              <ScrollView contentContainerClassName="gap-3 pb-3" showsVerticalScrollIndicator={false}>
                {notifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    isSubmitting={
                      markNotificationRead.isPending && markNotificationRead.variables === notification.id
                    }
                    notification={notification}
                    onPress={() => handleNotificationPress(notification)}
                  />
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
  const content = getNotificationContent(notification);
  const destinationLabel = getNotificationDestination(notification, "/notifications")?.label;

  return (
    <Pressable
      accessibilityLabel={[isUnread ? "읽지 않은 알림" : "읽은 알림", content.title, content.context, content.body].filter(Boolean).join(", ")}
      accessibilityHint={destinationLabel ? `${destinationLabel} 화면으로 이동합니다` : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
      disabled={isSubmitting}
      className="rounded-[16px] bg-hypo-surface p-4"
      onPress={onPress}
      style={({ pressed }) => ({ borderCurve: "continuous", opacity: pressed ? 0.82 : 1 })}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-start gap-2">
          {isUnread ? <View className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-hypo-brand" /> : null}
          <Text
            numberOfLines={2}
            className={`min-w-0 flex-1 text-[15px] leading-[22px] ${
              isUnread ? "font-bold text-hypo-text" : "font-medium text-hypo-textSecondary"
            }`}
          >
            {content.title}
          </Text>
        </View>
        <View className="shrink-0 flex-row items-center gap-1 pt-0.5">
          {isSubmitting ? <ActivityIndicator color={colors.brand} size="small" /> : null}
          <Text className="text-[12px] font-medium leading-[18px] text-hypo-textMetadata">
            {formatRelativeTime(notification.created_at)}
          </Text>
        </View>
      </View>

      {content.context ? (
        <Text numberOfLines={2} className="mt-2 text-[13px] font-medium leading-5 text-hypo-textSecondary">
          {content.context}
        </Text>
      ) : null}
      {content.body ? (
        <Text
          numberOfLines={2}
          className={`mt-1 text-[13px] leading-5 ${
            isUnread ? "font-medium text-hypo-textSecondary" : "font-medium text-hypo-textMetadata"
          }`}
        >
          {content.body}
        </Text>
      ) : null}
    </Pressable>
  );
}

function navigateToNotificationTarget(notification: NotificationRecord, parentReturnTo: string) {
  const notificationsReturnTo = `/notifications?returnTo=${encodeURIComponent(parentReturnTo)}`;
  const destination = getNotificationDestination(notification, notificationsReturnTo);
  if (destination) router.push(destination.href);
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
