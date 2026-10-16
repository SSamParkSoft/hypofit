import { Text, View } from "react-native";
import type { PostingType } from "@hypofit/contracts";
import { postingTypeLabels } from "@hypofit/contracts";
import { type PostingCreationDraft } from "@/features/postings/postingCreationDraft";
import { SectionLabel, SelectableRow } from "./CreationFormControls";
import type { FeatherIconName } from "./CreationFormControls";

const typeOptions: Array<{
  type: PostingType;
  icon: FeatherIconName;
  description: string;
}> = [
  {
    type: "interview",
    icon: "message-circle",
    description: "대화를 통해 경험과 의견을 확인해요.",
  },
  {
    type: "survey",
    icon: "file-text",
    description: "여러 사람의 응답을 수집해요.",
  },
  {
    type: "beta_test",
    icon: "smartphone",
    description: "제품이나 서비스를 일정 기간 사용해요.",
  },
  {
    type: "research_experiment",
    icon: "activity",
    description: "정해진 연구 절차에 따라 참여해요.",
  },
];

export function CreationTypeStep({
  draft,
  directParticipationTypes,
  enabledTypes,
  onChooseType,
  onUpdate,
}: {
  draft: PostingCreationDraft;
  directParticipationTypes: PostingType[];
  enabledTypes: PostingType[];
  onChooseType: (type: PostingType) => void;
  onUpdate: (patch: Partial<PostingCreationDraft>) => void;
}) {
  return (
    <View className="gap-7">
      <View className="gap-2">
        <SectionLabel>공고 유형</SectionLabel>
        <View className="border-t border-hypo-border">
          {typeOptions.filter((option) => enabledTypes.includes(option.type)).map((option) => (
            <SelectableRow
              key={option.type}
              description={option.description}
              icon={option.icon}
              isSelected={draft.type === option.type}
              label={postingTypeLabels[option.type]}
              onPress={() => onChooseType(option.type)}
            />
          ))}
        </View>
      </View>
      <View className="gap-2">
        <SectionLabel>어떻게 참여하게 할까요?</SectionLabel>
        <View className="border-t border-hypo-border">
          <SelectableRow
            description="참여자가 신청하면 모집자가 확인한 뒤 참여할 수 있어요."
            isSelected={draft.entryMode === "application_required"}
            label="신청 후 참여"
            onPress={() => onUpdate({ entryMode: "application_required" })}
          />
          {directParticipationTypes.includes(draft.type) ? (
            <SelectableRow
              description="별도 승인 없이 설문이나 테스트에 바로 참여할 수 있어요."
              isSelected={draft.entryMode === "direct"}
              label="바로 참여"
              onPress={() => onUpdate({ entryMode: "direct" })}
            />
          ) : (
            <Text className="pt-2 text-[13px] leading-5 text-hypo-text-secondary">
              {postingTypeLabels[draft.type]}{draft.type === "research_experiment" ? "은" : "는"} 신청 후 참여로 진행돼요.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
