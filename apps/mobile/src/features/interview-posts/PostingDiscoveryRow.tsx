import { Pressable, Text, View } from "react-native";
import type { Application, InterviewPost } from "@hypofit/contracts";
import {
  getPostingCompensationLabel,
  getPostingListMetadata,
  getPostingModeLabel,
  getPostingTypeLabel,
} from "@/shared/format/postings";
import { colors } from "@/shared/theme/tokens";

export function PostingDiscoveryRow({
  existingApplication,
  isRead,
  onPress,
  post,
}: {
  existingApplication?: Application | null;
  isRead: boolean;
  onPress: () => void;
  post: InterviewPost;
}) {
  const typeLabel = getPostingTypeLabel(post);
  const modeLabel = getPostingModeLabel(post);
  const statusLabel = existingApplication
    ? getApplicationStatusLabel(existingApplication.status)
    : null;
  const metadata = getPostingListMetadata(post);
  const accessibilitySummary = [
    typeLabel,
    modeLabel,
    post.title,
    getPostingCompensationLabel(post),
    statusLabel,
    metadata,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityHint="공고 상세를 엽니다"
      accessibilityLabel={accessibilitySummary}
      accessibilityRole="button"
      className={`border-b px-3.5 py-4 ${isRead ? "border-[#E5EAE3] bg-[#F8F8F4]" : "border-hypo-border bg-transparent"}`}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed
          ? colors.surfaceMuted
          : isRead
            ? "#F8F8F4"
            : "transparent",
      })}
    >
      <View className="flex-row items-center gap-2.5">
        <Text className="text-[13px] font-semibold leading-[18px] text-hypo-brand">
          {typeLabel}
        </Text>
        <Text className="-ml-1.5 text-[13px] leading-[18px] text-hypo-text-secondary">
          ·
        </Text>
        <Text className="-ml-1.5 text-[13px] font-medium leading-[18px] text-hypo-text-secondary">
          {modeLabel}
        </Text>
        {statusLabel ? (
          <ApplicationStatusBadge
            label={statusLabel}
            status={existingApplication?.status ?? "applied"}
          />
        ) : null}
      </View>

      <View className="mt-2 flex-row items-start gap-3">
        <Text
          numberOfLines={1}
          className="min-w-0 flex-1 text-[17px] font-semibold leading-[23px] text-hypo-text"
        >
          {post.title}
        </Text>
        <Text
          numberOfLines={1}
          className="max-w-[42%] shrink-0 text-right text-[14px] font-semibold leading-5 text-hypo-text"
        >
          {getPostingCompensationLabel(post)}
        </Text>
      </View>

      <Text
        numberOfLines={1}
        className="mt-2 text-[14px] font-normal leading-5 text-hypo-text-secondary"
      >
        {post.target_description}
      </Text>

      <Text
        numberOfLines={1}
        className="mt-1.5 text-[12px] font-medium leading-[17px] text-hypo-text-metadata"
      >
        {metadata}
      </Text>
    </Pressable>
  );
}

function ApplicationStatusBadge({
  label,
  status,
}: {
  label: string;
  status: Application["status"];
}) {
  const isPositive =
    status === "applied" || status === "selected" || status === "completed";

  return (
    <View
      className={`shrink-0 rounded-full px-1.5 py-px ${isPositive ? "bg-hypo-brandSoft" : "bg-hypo-surfaceMuted"}`}
    >
      <Text
        className={`text-[12px] font-semibold leading-4 ${isPositive ? "text-hypo-brand" : "text-hypo-muted"}`}
      >
        {label}
      </Text>
    </View>
  );
}

function getApplicationStatusLabel(status: Application["status"]) {
  const labels: Record<Application["status"], string> = {
    applied: "신청",
    canceled: "취소",
    completed: "완료",
    no_show: "불참",
    rejected: "반려",
    selected: "선정",
  };

  return labels[status];
}
