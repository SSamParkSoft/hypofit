import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import type { InterviewPost } from "@hypofit/contracts";
import {
  getPostingCompensationLabel,
  getPostingModeLabel,
  getPostingTypeLabel,
} from "@/features/postings/postingPresentation";
import { ListRow } from "@/shared/ui/ListSurface";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";
import { formatMapDistance, getPostLocationLabel } from "./mapPresentation";
import { colors } from "@/shared/theme/tokens";

export function SelectedMapPostCard({
  currentUserId,
  onApply,
  onClose,
  onDetail,
  post,
}: {
  currentUserId?: string | null;
  onApply: () => void;
  onClose: () => void;
  onDetail: () => void;
  post: InterviewPost;
}) {
  const distanceLabel = formatMapDistance(post.distance_meters, "거리 확인 전");
  const isOwnPost = Boolean(currentUserId && post.founder_id === currentUserId);
  const isSurvey = post.recruitment_type === "survey";

  return (
    <View className="rounded-[16px] border border-hypo-border bg-hypo-bg p-3.5">
      <View className="flex-row items-center gap-2">
        <Text numberOfLines={1} className="min-w-0 flex-1 text-[12px] font-semibold text-hypo-brand">
          {`${getPostingTypeLabel(post)} · ${getPostingModeLabel(post)}`}
        </Text>
        <Text numberOfLines={1} className="text-[14px] font-bold text-hypo-text">
          {getPostingCompensationLabel(post)}
        </Text>
        <Pressable
          accessibilityLabel="공고 선택 해제"
          accessibilityRole="button"
          className="h-9 w-9 items-center justify-center"
          hitSlop={8}
          onPress={onClose}
        >
          <Feather color={colors.textSoft} name="x" size={18} />
        </Pressable>
      </View>

      <Text numberOfLines={2} className="mt-2 text-[16px] font-semibold leading-6 text-hypo-text">
        {post.title}
      </Text>

      <View className="mt-2 flex-row items-center gap-1.5">
        <Feather color={colors.textSoft} name="map-pin" size={14} />
        <Text numberOfLines={1} className="min-w-0 flex-1 text-[13px] leading-5 text-hypo-muted">
          {getPostLocationLabel(post)} · {distanceLabel}
        </Text>
      </View>

      <View className="mt-3 flex-row gap-2">
        <PrimaryButton variant="secondary" onPress={onDetail}>
          상세 보기
        </PrimaryButton>
        <PrimaryButton
          variant={isOwnPost ? "secondary" : "primary"}
          onPress={isOwnPost ? () => router.push({ pathname: "/(tabs)/interviews/my-interviews", params: { returnTo: "/(tabs)/map" } }) : isSurvey ? onDetail : onApply}
        >
          {isOwnPost ? "공고 관리" : isSurvey ? "설문 보기" : "신청하기"}
        </PrimaryButton>
      </View>
    </View>
  );
}

export function MapListRow({
  isSelected,
  isViewed,
  onPress,
  post,
}: {
  isSelected: boolean;
  isViewed: boolean;
  onPress: () => void;
  post: InterviewPost;
}) {
  const locationLabel = getPostLocationLabel(post);
  const distanceLabel = formatMapDistance(post.distance_meters);

  return (
    <ListRow isSelected={isSelected} isViewed={isViewed} onPress={onPress}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start gap-1.5">
            <View className="min-w-0 flex-1 gap-1">
              <Text className="text-[11px] font-medium text-hypo-brand">{`${getPostingTypeLabel(post)} · ${getPostingModeLabel(post)}`}</Text>
              <Text numberOfLines={1} className="min-w-0 text-[16px] font-semibold leading-5 text-hypo-text">
                {post.title}
              </Text>
            </View>
          </View>
          <Text numberOfLines={1} className="mt-1 text-xs font-medium leading-5 text-hypo-muted">
            {distanceLabel ? `${locationLabel} · ${distanceLabel}` : locationLabel}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-[13px] font-bold text-hypo-text">
            {getPostingCompensationLabel(post)}
          </Text>
        </View>
      </View>
    </ListRow>
  );
}
