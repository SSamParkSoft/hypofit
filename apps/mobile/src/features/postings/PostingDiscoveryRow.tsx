import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { normalizeCompensations, type Application, type CompensationType, type InterviewPost } from "@hypofit/contracts";
import {
  getPostingCompensationLabel,
  getPostingListMetadata,
  getPostingModeLabel,
  getPostingTypeLabel,
} from "@/features/postings/postingPresentation";
import { colors } from "@/shared/theme/tokens";
import { formatHomeRegistrationTime, formatRegistrationTime } from "@/shared/format/relativeTime";

export function PostingDiscoveryRow({
  existingApplication,
  isRead,
  onPress,
  post,
  registrationTimeStyle = "default",
  variant = "row",
}: {
  existingApplication?: Application | null;
  isLast?: boolean;
  isRead: boolean;
  onPress: () => void;
  post: InterviewPost;
  registrationTimeStyle?: "relative" | "default";
  variant?: "row" | "card";
}) {
  const isCard = variant === "card";
  const [failedThumbnail, setFailedThumbnail] = useState<string | null>(null);
  const thumbnailUrl = post.cover_image?.url;
  const typeLabel = getPostingTypeLabel(post);
  const modeLabel = post.recruitment_type === "survey" ? null : getPostingModeLabel(post);
  const statusLabel = existingApplication
    ? getApplicationStatusLabel(existingApplication.status)
    : null;
  const metadata = getPostingListMetadata(post);
  const registrationTime = registrationTimeStyle === "relative"
    ? formatHomeRegistrationTime(post.created_at)
    : formatRegistrationTime(post.created_at);
  const compensationLabel = getPostingCompensationLabel(post);
  const primaryCompensationType = normalizeCompensations(post.compensations, post.reward_amount)[0]?.type ?? "none";
  const accessibilitySummary = [
    isRead ? "읽은 공고" : null,
    typeLabel,
    modeLabel,
    post.title,
    compensationLabel,
    statusLabel,
    metadata,
    registrationTime,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      accessibilityHint="공고 상세를 엽니다"
      accessibilityLabel={accessibilitySummary}
      accessibilityRole="button"
      className={isCard
        ? "rounded-[20px] border border-hypo-border bg-hypo-surface px-4 py-4"
        : "bg-transparent px-3.5 py-5"}
      onPress={onPress}
      style={({ pressed }) => isCard ? ({ opacity: pressed ? 0.75 : 1 }) : ({
        backgroundColor: pressed ? colors.surfaceMuted : "transparent",
      })}
    >
      <View className="flex-row flex-wrap items-center gap-x-2.5 gap-y-1">
        <Text className="text-[13px] font-bold leading-[18px] text-hypo-brandStrong">
          {typeLabel}
        </Text>
        {modeLabel ? (
          <>
            <Text className="-ml-1.5 text-[13px] leading-[18px] text-hypo-text-secondary">
              ·
            </Text>
            <Text className="-ml-1.5 text-[13px] font-medium leading-[18px] text-hypo-text-secondary">
              {modeLabel}
            </Text>
          </>
        ) : null}
        {statusLabel ? (
          <ApplicationStatusBadge
            label={statusLabel}
            status={existingApplication?.status ?? "applied"}
          />
        ) : null}
      </View>

      <View className={isCard ? "mt-2 gap-2" : "mt-2 flex-row items-start gap-3"}>
        <Text
          numberOfLines={isCard ? 2 : 1}
          className={`${isCard ? "" : "flex-1"} min-w-0 text-[17px] font-semibold leading-[23px] ${isRead ? "text-hypo-text-secondary" : "text-hypo-text"}`}
        >
          {post.title}
        </Text>
        <Text
          numberOfLines={2}
          className={`${isCard ? "" : "w-[112px] shrink-0 text-right"} leading-5 ${getCompensationTextClassName(primaryCompensationType)}`}
        >
          {compensationLabel}
        </Text>
      </View>

      <View className="mt-2 flex-row items-start gap-3">
      {thumbnailUrl && thumbnailUrl !== failedThumbnail ? <Image source={{ uri: thumbnailUrl }} resizeMode="cover"
        accessibilityIgnoresInvertColors accessibilityLabel={post.cover_image?.alt_text || "공고 대표 이미지"}
        className="h-16 w-16 rounded-lg" onError={() => setFailedThumbnail(thumbnailUrl)} /> : null}
      <View className="min-w-0 flex-1">
      <Text
        numberOfLines={1}
        className="text-[14px] font-normal leading-5 text-hypo-text-secondary"
      >
        {post.target_description}
      </Text>

      <View className="mt-1.5 flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Text className="max-w-full text-[12px] font-medium leading-[17px] text-hypo-text-metadata">
          {metadata}
        </Text>
        {registrationTime ? (
          <Text className="ml-auto max-w-full text-[12px] leading-[17px] text-hypo-text-metadata">
            {registrationTime}
          </Text>
        ) : null}
      </View>
      </View>
      </View>
    </Pressable>
  );
}

function getCompensationTextClassName(type: CompensationType) {
  if (type === "cash") {
    return "text-[15px] font-bold text-hypo-text";
  }

  if (type === "none") {
    return "text-[14px] font-medium text-hypo-text-secondary";
  }

  return "text-[14px] font-semibold text-hypo-text";
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
