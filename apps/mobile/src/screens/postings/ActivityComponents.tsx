import { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { type Href } from "expo-router";
import type { Application } from "@hypofit/contracts";
import { formatUserDisplayName } from "@hypofit/contracts";
import { goBackOrReplaceFallback } from "@/shared/navigation/backNavigation";
import { UserAvatar } from "@/shared/ui/UserAvatar";

export function ActivityHeader({
  backTo = "/(tabs)/interviews",
  right,
  title = "내 활동",
}: {
  backTo?: Href;
  right?: ReactNode;
  title?: string;
}) {
  return (
    <View className="min-h-11 flex-row items-center gap-2">
      <Pressable
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
        hitSlop={12}
        className="h-10 w-10 items-center justify-center"
        onPress={() => goBackOrReplaceFallback(backTo)}
      >
        <Text className="text-[34px] font-semibold leading-9 text-hypo-text">‹</Text>
      </Pressable>
      <Text numberOfLines={1} className="flex-1 text-lg font-bold text-hypo-text">{title}</Text>
      {right ?? <View className="w-10" />}
    </View>
  );
}

export function StatusTag({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "brand" | "danger" }) {
  const tagClassName =
    tone === "brand"
      ? "rounded-full bg-[#E4F1E7] px-[9px] py-[5px]"
      : tone === "danger"
        ? "rounded-full bg-hypo-dangerSoft px-[9px] py-[5px]"
        : "rounded-full bg-hypo-bg px-[9px] py-[5px]";
  const textClassName =
    tone === "brand"
      ? "text-[11px] font-black text-hypo-brand"
      : tone === "danger"
        ? "text-[11px] font-black text-hypo-danger"
        : "text-[11px] font-black text-hypo-muted";

  return (
    <View className={tagClassName}>
      <Text className={textClassName}>{label}</Text>
    </View>
  );
}

export function ApplicantAvatar({ application, size }: { application: Application; size: "small" | "large" }) {
  const respondent = application.respondent;
  const name = formatUserDisplayName(respondent);
  return (
    <UserAvatar
      iconSize={size === "large" ? 24 : 20}
      imageUrl={respondent?.profile_image_url}
      name={name}
      sizeClassName={size === "large" ? "h-12 w-12" : "h-10 w-10"}
    />
  );
}
