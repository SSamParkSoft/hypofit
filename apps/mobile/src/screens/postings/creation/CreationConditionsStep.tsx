import { Pressable, Text, TextInput, View } from "react-native";
import type { Compensation, CompensationType } from "@hypofit/contracts";
import { type PostingCreationDraft } from "@/features/postings/postingCreationDraft";
import {
  ChoiceChip,
  FieldAnchor,
  FormField,
  InlineError,
  SectionLabel,
  SelectableRow,
} from "./CreationFormControls";
import { DeadlineSettingRow } from "./CreationDateFields";

const compensationTypes: Array<{ type: CompensationType; label: string }> = [
  { type: "cash", label: "현금" },
  { type: "gift_card", label: "기프티콘 · 상품권" },
  { type: "points", label: "포인트" },
  { type: "product", label: "제품 · 샘플" },
  { type: "coupon_or_access", label: "쿠폰 · 이용권" },
  { type: "other", label: "기타" },
];

export function CreationConditionsStep({
  draft,
  validationError,
  validationField,
  onFieldLayout,
  registerInputRef,
  onFieldBlur,
  onAddCompensation,
  onRemoveCompensation,
  onSetNoCompensation,
  onUpdate,
  onUpdateCompensation,
}: {
  draft: PostingCreationDraft;
  validationError: string | null;
  validationField: string | null;
  onFieldLayout: (field: string, view: View | null) => void;
  registerInputRef: (field: string) => (input: TextInput | null) => void;
  onFieldBlur: (field: string) => void;
  onAddCompensation: () => void;
  onRemoveCompensation: (index: number) => void;
  onSetNoCompensation: () => void;
  onUpdate: (patch: Partial<PostingCreationDraft>) => void;
  onUpdateCompensation: (index: number, patch: Partial<Compensation>) => void;
}) {
  const provided = draft.compensations.some((item) => item.type !== "none");
  return (
    <View className="gap-7">
      <FieldAnchor field="compensations" onFieldLayout={onFieldLayout}>
        <View className="gap-3">
          <SectionLabel>보상을 제공하나요?</SectionLabel>
          <View className="border-t border-hypo-border">
            <SelectableRow
              description="현금, 기프티콘, 제품, 이용권 등으로 보상할 수 있어요."
              isSelected={provided}
              label="보상 제공"
              onPress={() => !provided && onAddCompensation()}
            />
            <SelectableRow
              description="참여에 별도 보상을 제공하지 않아요."
              isSelected={!provided}
              label="보상 없음"
              onPress={onSetNoCompensation}
            />
          </View>
          {provided ? (
            <View className="gap-4 pt-2">
              {draft.compensations.map((item, index) => (
                <CompensationEditor
                  compensation={item}
                  index={index}
                  key={`${item.type}-${index}`}
                  canRemove={draft.compensations.length > 1}
                  error={
                    validationField === "compensations"
                      ? validationError ?? undefined
                      : undefined
                  }
                  onRemove={() => onRemoveCompensation(index)}
                  onUpdate={(patch) => onUpdateCompensation(index, patch)}
                  onBlur={() => onFieldBlur("compensations")}
                />
              ))}
              <Pressable
                accessibilityRole="button"
                className="min-h-[44px] items-start justify-center"
                onPress={onAddCompensation}
              >
                <Text className="text-[14px] font-semibold text-hypo-brand">
                  + 보상 추가
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </FieldAnchor>
      <FieldAnchor field="recruit_count" onFieldLayout={onFieldLayout}>
        <View className="gap-3">
          <SectionLabel>모집 인원</SectionLabel>
          <View className="border-t border-hypo-border">
            <SelectableRow
              description="참여 인원을 제한하지 않아요."
              isSelected={draft.recruitmentLimitMode === "unlimited"}
              label="인원 제한 없음"
              onPress={() =>
                onUpdate({
                  recruitmentLimitMode: "unlimited",
                  recruitmentCount: "",
                })
              }
            />
            <SelectableRow
              description="필요한 참여자 수를 직접 정해요."
              isSelected={draft.recruitmentLimitMode === "limited"}
              label="인원 지정"
              onPress={() => onUpdate({ recruitmentLimitMode: "limited" })}
            />
          </View>
          {draft.recruitmentLimitMode === "limited" ? (
            <FormField
              inputRef={registerInputRef("recruit_count")}
              label="참여자 수"
              value={draft.recruitmentCount}
              maxLength={3}
              onBlur={() => onFieldBlur("recruit_count")}
              placeholder="4"
              suffix="명"
              keyboardType="number-pad"
              error={
                ["recruit_count", "recruitment_limit_mode"].includes(
                  validationField ?? "",
                )
                  ? validationError ?? undefined
                  : undefined
              }
              onChangeText={(recruitmentCount) => onUpdate({ recruitmentCount: recruitmentCount.replace(/[^0-9]/g, "") })}
            />
          ) : null}
        </View>
      </FieldAnchor>
      <FieldAnchor field="participation_deadline_at" onFieldLayout={onFieldLayout}>
        <View className="gap-3">
          <SectionLabel>마감일</SectionLabel>
          <View className="border-t border-hypo-border">
            <DeadlineSettingRow
              deadline={draft.deadline}
              enabled={draft.deadlineEnabled}
              error={
                validationField === "participation_deadline_at"
                  ? validationError ?? undefined
                  : undefined
              }
              onChange={(deadline) =>
                onUpdate({ deadlineEnabled: true, deadline })
              }
            />
            {draft.type !== "survey" ? <SelectableRow
              description="별도 마감일 없이 모집을 이어가요."
              isSelected={!draft.deadlineEnabled}
              label="마감일 없음"
              onPress={() => onUpdate({ deadlineEnabled: false, deadline: "" })}
            /> : null}
          </View>
        </View>
      </FieldAnchor>
    </View>
  );
}

function CompensationEditor({
  compensation,
  index,
  canRemove,
  error,
  onRemove,
  onUpdate,
  onBlur,
}: {
  compensation: Compensation;
  index: number;
  canRemove: boolean;
  error?: string;
  onRemove: () => void;
  onUpdate: (patch: Partial<Compensation>) => void;
  onBlur: () => void;
}) {
  const cash = compensation.type === "cash";
  const points = compensation.type === "points";
  return (
    <View className="gap-3 border-b border-hypo-border pb-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-hypo-text">
          보상 {index + 1}
        </Text>
        {canRemove ? (
          <Pressable accessibilityRole="button" onPress={onRemove}>
            <Text className="text-[13px] font-medium text-hypo-text-metadata">
              삭제
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className="flex-row flex-wrap gap-2">
        {compensationTypes.map((option) => (
          <ChoiceChip
            compact
            key={option.type}
            isSelected={compensation.type === option.type}
            label={option.label}
            onPress={() =>
              onUpdate({
                type: option.type,
                amount: option.type === "cash" ? compensation.amount : null,
                points: option.type === "points" ? compensation.points : null,
                label:
                  option.type === "cash" || option.type === "points"
                    ? null
                    : (compensation.label ?? ""),
              })
            }
          />
        ))}
      </View>
      {cash ? (
        <FormField
          label="금액"
          value={compensation.amount ? compensation.amount.toLocaleString("ko-KR") : ""}
          placeholder="30000"
          suffix="원"
          keyboardType="number-pad"
          onBlur={onBlur}
          onChangeText={(value) =>
            onUpdate({
              amount: Number(value.replace(/[^0-9]/g, "")) || null,
              currency: "KRW",
            })
          }
        />
      ) : null}
      {points ? (
        <FormField
          label="포인트"
          onBlur={onBlur}
          value={compensation.points ? String(compensation.points) : ""}
          placeholder="5000"
          suffix="P"
          keyboardType="number-pad"
          onChangeText={(value) =>
            onUpdate({ points: Number(value.replace(/[^0-9]/g, "")) || null })
          }
        />
      ) : null}
      {!cash && !points ? (
        <FormField
          label="보상 이름"
          onBlur={onBlur}
          value={compensation.label ?? ""}
          placeholder="예: 스타벅스 아메리카노 기프티콘"
          onChangeText={(label) => onUpdate({ label })}
        />
      ) : null}
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}
