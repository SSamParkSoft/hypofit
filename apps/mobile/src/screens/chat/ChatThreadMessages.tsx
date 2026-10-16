import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { ChatMessage } from "@hypofit/contracts";
import { colors } from "@/shared/theme/tokens";
import { type OutgoingChatMessage } from "./chatThreadPresentation";

export function MessageBubble({ currentUserId, message, showTime = true }: { currentUserId?: string; message: ChatMessage; showTime?: boolean }) {
  const isMine = Boolean(message.sender_id && message.sender_id === currentUserId);
  const isSystem = message.message_type !== "user" || !message.sender_id;

  if (isSystem) {
    return (
      <View className="items-center py-1">
        <Text
          className="px-3 py-1.5 text-center text-[12px] leading-[18px] text-hypo-muted"
          style={{ fontFamily: "HypofitSansMedium" }}
        >
          {message.body}
        </Text>
      </View>
    );
  }

  return (
    <View className={`max-w-[80%] ${isMine ? "self-end" : "self-start"}`}>
      <Text
        selectable
        className={`rounded-[18px] px-3 py-[9px] text-[15px] leading-[21px] ${isMine ? "bg-hypo-brand text-white" : "bg-hypo-surface text-hypo-text"}`}
        style={{ fontFamily: "HypofitSansMedium" }}
      >
        {message.body}
      </Text>
      {showTime ? <Text
        className={`mt-1 text-[11px] leading-[15px] text-hypo-muted ${isMine ? "text-right" : "text-left"}`}
        style={{ fontFamily: "HypofitSansMedium" }}
      >
        {formatMessageTime(message.created_at)}
      </Text> : null}
    </View>
  );
}

export function OutgoingMessageBubble({ message, disabled, onRetry, onRemove }: {
  message: OutgoingChatMessage;
  disabled: boolean;
  onRetry: () => void;
  onRemove: () => void;
}) {
  const failed = message.status === "failed";
  return (
    <View className="mt-3 max-w-[80%] self-end">
      <Text selectable className="rounded-[18px] bg-hypo-brand px-3 py-[9px] text-[15px] leading-[21px] text-white" style={{ fontFamily: "HypofitSansMedium" }}>
        {message.body}
      </Text>
      <View accessibilityLiveRegion="polite" className="mt-1 flex-row items-center justify-end gap-1">
        {!failed ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
        <Text className={`flex-shrink text-right text-[11px] leading-[16px] ${failed ? "text-hypo-danger" : "text-hypo-muted"}`}>{failed ? message.error : "전송 중"}</Text>
      </View>
      {failed ? (
        <View className="flex-row justify-end gap-2">
          <Pressable accessibilityRole="button" accessibilityLabel="메시지 다시 보내기" disabled={disabled} className="min-h-11 flex-row items-center gap-1 px-2" style={{ opacity: disabled ? 0.45 : 1 }} onPress={onRetry}>
            <Feather name="rotate-cw" size={16} color={colors.brand} />
            <Text className="text-[13px] font-semibold text-hypo-brand">다시 보내기</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="실패한 메시지 지우기" className="h-11 w-11 items-center justify-center" onPress={onRemove}>
            <Feather name="x" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function MessageDateSeparator({ value }: { value: string }) {
  const label = formatMessageDate(value);
  if (!label) return null;

  return (
    <View className="flex-row items-center gap-2 pb-3 pt-1">
      <View className="h-px flex-1 bg-hypo-border/70" />
      <Text
        className="text-[12px] leading-[18px] text-hypo-muted"
        style={{ fontFamily: "HypofitSansMedium" }}
      >
        {label}
      </Text>
      <View className="h-px flex-1 bg-hypo-border/70" />
    </View>
  );
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function getMessageDateKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatMessageDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";

  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { month: "long", day: "numeric", weekday: "long" }
      : { year: "numeric", month: "long", day: "numeric", weekday: "long" };

  return new Intl.DateTimeFormat("ko-KR", options).format(date);
}
