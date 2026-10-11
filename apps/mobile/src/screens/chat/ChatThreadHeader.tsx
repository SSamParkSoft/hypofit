import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Avatar, getCounterpart } from "./CounterpartProfileModal";
import { colors } from "@/shared/theme/tokens";

export function ChatThreadHeader({
  counterpart,
  isMuted,
  isMuting,
  onBack,
  onMenu,
  onMuteToggle,
  onProfile,
  subtitle,
  title,
}: {
  counterpart?: ReturnType<typeof getCounterpart> | null;
  isMuted?: boolean;
  isMuting?: boolean;
  onBack: () => void;
  onMenu?: () => void;
  onMuteToggle?: () => void;
  onProfile?: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <View className="min-h-11 flex-row items-center gap-2">
      <Pressable
        accessibilityLabel="뒤로 가기"
        accessibilityRole="button"
        hitSlop={12}
        className="h-11 w-11 items-center justify-center"
        onPress={onBack}
      >
        <ChevronIcon direction="left" tone="text" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}, 프로필 보기`}
        className="min-h-11 min-w-0 flex-1 flex-row items-center gap-2"
        disabled={!onProfile}
        onPress={onProfile}
      >
        <Avatar iconSize={19} sizeClassName="h-9 w-9" user={counterpart} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[18px] leading-[24px] text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              className="text-[12px] leading-[17px] text-hypo-muted"
              style={{ fontFamily: "HypofitSansMedium" }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {onMuteToggle ? (
        <Pressable
          accessibilityLabel={isMuted ? "채팅 알림 켜기" : "채팅 알림 끄기"}
          accessibilityRole="button"
          disabled={isMuting}
          hitSlop={12}
          className="h-11 w-11 items-center justify-center"
          onPress={onMuteToggle}
        >
          <Feather color={isMuted ? "#8A9387" : colors.brand} name={isMuted ? "bell-off" : "bell"} size={18} />
        </Pressable>
      ) : null}
      {onMenu ? (
        <Pressable
          accessibilityLabel="채팅 설정"
          accessibilityRole="button"
          hitSlop={12}
          className="h-11 w-11 items-center justify-center"
          onPress={onMenu}
        >
          <MoreIcon />
        </Pressable>
      ) : (
        <View className="w-10" />
      )}
    </View>
  );
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

function ChevronIcon({ direction, tone = "muted" }: { direction: "left" | "right" | "up" | "down"; tone?: "muted" | "text" }) {
  const rotation =
    direction === "left"
      ? "rotate-[225deg]"
      : direction === "right"
        ? "rotate-[45deg]"
        : direction === "up"
          ? "rotate-[-45deg]"
          : "rotate-[135deg]";
  const borderColor = tone === "text" ? "border-hypo-text" : "border-hypo-muted";

  return <View className={`h-2.5 w-2.5 border-r-2 border-t-2 ${borderColor} ${rotation}`} />;
}
