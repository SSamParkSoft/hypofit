import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useAuth } from "@/features/auth/AuthProvider";
import { useNotifications } from "@/features/notifications/useNotifications";

interface NotificationButtonProps {
  returnTo?: string;
  unreadCount?: number | null;
}

export function NotificationButton({ returnTo, unreadCount }: NotificationButtonProps) {
  const { accessToken } = useAuth();
  const queryToken = unreadCount == null ? accessToken : null;
  const { data: unreadNotifications = [] } = useNotifications(queryToken, {
    unreadOnly: true,
    limit: 100,
  });
  const resolvedUnreadCount =
    unreadCount ?? unreadNotifications.filter((notification) => notification.read_at === null).length;
  const hasUnread = resolvedUnreadCount > 0;
  const accessibilityLabel = hasUnread
    ? `알림, 읽지 않은 ${resolvedUnreadCount > 99 ? "99개 이상" : `${resolvedUnreadCount}개`}`
    : "알림";

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={12}
      className="relative h-11 w-11 items-center justify-center"
      onPress={() =>
        router.push({
          pathname: "/notifications",
          params: returnTo ? { returnTo } : undefined,
        })
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      <Feather color="#1D2522" name="bell" size={25} />
      {hasUnread ? (
        <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-hypo-bg bg-hypo-danger" />
      ) : null}
    </Pressable>
  );
}
