import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { type CreationStep } from "@/features/postings/postingCreationDraft";
import { colors } from "@/shared/theme/tokens";

export function CreationHeader({
  title = "공고 만들기",
  draftStatus,
  onBack,
}: {
  title?: string;
  draftStatus: "saving" | "saved" | "failed";
  onBack: () => void;
}) {
  const status =
    draftStatus === "saving"
      ? "저장 중"
      : draftStatus === "failed"
        ? "저장 실패"
        : "저장됨";
  return (
    <View className="h-12 flex-row items-center gap-2">
      <Pressable
        accessibilityLabel="뒤로가기"
        accessibilityRole="button"
        hitSlop={10}
        className="h-11 w-11 items-center justify-center"
        onPress={onBack}
      >
        <Feather color={colors.text} name="chevron-left" size={24} />
      </Pressable>
      <Text className="flex-1 text-[17px] font-bold text-hypo-text">
        {title}
      </Text>
      <Text
        accessibilityLiveRegion="polite"
        className={`text-[12px] font-medium ${draftStatus === "failed" ? "text-hypo-danger" : "text-hypo-text-metadata"}`}
      >
        {status}
      </Text>
    </View>
  );
}

export function ProgressIndicator({ step }: { step: CreationStep }) {
  return (
    <View className="gap-2 pb-1 pt-1">
      <Text
        accessibilityLiveRegion="polite"
        className="text-[12px] font-semibold text-hypo-text-metadata"
      >
        {step} / 5
      </Text>
      <View className="h-1 overflow-hidden rounded-full bg-hypo-surfaceMuted">
        <View
          className="h-full rounded-full bg-hypo-brand"
          style={{ width: `${step * 20}%` }}
        />
      </View>
    </View>
  );
}
