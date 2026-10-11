import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, TextInput, useWindowDimensions, View } from "react-native";
import { getSurveyProviderLabel, surveyProviderOptions } from "@hypofit/contracts/survey-providers";
import { requiresLocation, type PostingCreationDraft } from "@/features/postings/postingCreationDraft";
import { betaPlatformLabel } from "@/features/postings/postingCreationMethod";
import { colors } from "@/shared/theme/tokens";
import {
  ChipField,
  ChoiceChip,
  DurationField,
  FieldAnchor,
  FormField,
  InlineError,
  RemovableValue,
  SectionLabel,
  SelectableRow,
} from "./CreationFormControls";
import { betaDurationUnits } from "./creationDurationOptions";
import { DateField, DateTimeSlotPicker } from "./CreationDateFields";
import { CreationLocationChooser } from "./CreationLocationChooser";

const recurringWindows = [
  "평일 오전",
  "평일 오후",
  "평일 저녁",
  "주말 오전",
  "주말 오후",
  "주말 저녁",
];

export function CreationMethodStep({
  draft,
  preserveExternalUrl = false,
  validationError,
  validationField,
  onFieldLayout,
  registerInputRef,
  onFieldBlur,
  onAddSlot,
  onRemoveSlot,
  onToggle,
  onUpdate,
}: {
  draft: PostingCreationDraft;
  preserveExternalUrl?: boolean;
  validationError: string | null;
  validationField: string | null;
  onFieldLayout: (field: string, view: View | null) => void;
  registerInputRef: (field: string) => (input: TextInput | null) => void;
  onFieldBlur: (field: string) => void;
  onAddSlot: (value: string) => void;
  onRemoveSlot: (value: string) => void;
  onToggle: (
    field: "betaPlatforms" | "recurringWindows",
    value: string,
  ) => void;
  onUpdate: (patch: Partial<PostingCreationDraft>) => void;
}) {
  const survey = draft.type === "survey";
  const beta = draft.type === "beta_test";
  const research = draft.type === "research_experiment";
  const [isProviderMenuOpen, setIsProviderMenuOpen] = useState(false);
  const { width, fontScale } = useWindowDimensions();
  const showLocation = requiresLocation(draft);
  return (
    <View className="gap-6">
      {!beta && !survey ? (
      <FieldAnchor field="interview_mode" onFieldLayout={onFieldLayout}>
        <View className="gap-2">
          <SectionLabel>진행 방식</SectionLabel>
          <View className="flex-row flex-wrap gap-2">
            {[
                  { value: "online" as const, label: research ? "온라인" : "화상" },
                  { value: "offline" as const, label: "대면" },
                  { value: "both" as const, label: research ? "대면·온라인" : "대면·화상" },
                ].map((option) => (
              <ChoiceChip
                key={option.value}
                isSelected={draft.interviewMode === option.value}
                label={option.label}
                onPress={() => onUpdate({ interviewMode: option.value })}
              />
            ))}
          </View>
        </View>
      </FieldAnchor>
      ) : null}
      {survey ? (
        <View className="gap-5">
          <FieldAnchor field="external_provider" onFieldLayout={onFieldLayout}>
            <View className="gap-2">
              <SectionLabel>설문 종류</SectionLabel>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`설문 종류, ${getSurveyProviderLabel(draft.externalProvider)}`}
                accessibilityState={{ expanded: isProviderMenuOpen }}
                className="min-h-[52px] flex-row items-center gap-3 rounded-[12px] border border-hypo-border bg-hypo-surface px-4 py-3"
                onPress={() => setIsProviderMenuOpen((open) => !open)}
              >
                <Text className="min-w-0 flex-1 text-[15px] text-hypo-text">
                  {getSurveyProviderLabel(draft.externalProvider)}
                </Text>
                <Feather name={isProviderMenuOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textMetadata} />
              </Pressable>
              {isProviderMenuOpen ? (
                <View accessibilityRole="radiogroup" accessibilityLabel="설문 종류">
                  {surveyProviderOptions.map((option) => (
                    <SelectableRow
                      key={option.value}
                      label={option.label}
                      isSelected={draft.externalProvider === option.value}
                      onPress={() => {
                        onUpdate({ externalProvider: option.value });
                        setIsProviderMenuOpen(false);
                      }}
                    />
                  ))}
                </View>
              ) : null}
              {validationField === "external_provider" && validationError ? <InlineError message={validationError} /> : null}
            </View>
          </FieldAnchor>
          <FieldAnchor field="external_url" onFieldLayout={onFieldLayout}>
            <FormField
              inputRef={registerInputRef("external_url")}
              label="참여 링크"
              value={draft.externalUrl}
              maxLength={2000}
              onBlur={() => onFieldBlur("external_url")}
              placeholder="https://..."
              keyboardType="url"
              autoCapitalize="none"
              helper={
                preserveExternalUrl ? "새 링크를 입력하지 않으면 기존 참여 링크를 유지해요." : draft.entryMode === "application_required"
                  ? "승인된 참여자에게만 링크가 공개돼요."
                  : "공고에서 바로 참여할 수 있어요."
              }
              error={
                validationField === "external_url"
                  ? validationError ?? undefined
                  : undefined
              }
              onChangeText={(externalUrl) => onUpdate({ externalUrl })}
            />
          </FieldAnchor>
          <FieldAnchor field="external_data_notice" onFieldLayout={onFieldLayout}>
            <FormField
              inputRef={registerInputRef("external_data_notice")}
              label="외부 설문 안내"
              value={draft.externalDataNotice}
              maxLength={2000}
              onBlur={() => onFieldBlur("external_data_notice")}
              placeholder="외부 설문 서비스에서 응답을 처리해요."
              multiline
              error={
                validationField === "external_data_notice"
                  ? validationError ?? undefined
                  : undefined
              }
              onChangeText={(externalDataNotice) =>
                onUpdate({ externalDataNotice })
              }
            />
          </FieldAnchor>
          <FieldAnchor field="duration_value" onFieldLayout={onFieldLayout}>
            <DurationField
              inputRef={registerInputRef("duration_value")}
              label="예상 응답 시간"
              onBlur={() => onFieldBlur("duration_value")}
              value={draft.durationValue}
              unit={draft.durationUnit}
              error={
                ["duration_minutes", "duration_value", "duration_unit"].includes(
                  validationField ?? "",
                )
                  ? validationError ?? undefined
                  : undefined
              }
              onChangeValue={(durationValue) => onUpdate({ durationValue })}
              onChangeUnit={(durationUnit) => onUpdate({ durationUnit })}
            />
          </FieldAnchor>
        </View>
      ) : null}
      {beta ? (
        <View className="gap-5">
          <FieldAnchor field="duration_value" onFieldLayout={onFieldLayout}>
            <DurationField
              inputRef={registerInputRef("duration_value")}
              label="예상 참여 기간"
              onBlur={() => onFieldBlur("duration_value")}
              value={draft.durationValue}
              unit={draft.durationUnit}
              units={betaDurationUnits.slice(0, 2)}
              error={
                ["duration_minutes", "duration_value", "duration_unit"].includes(validationField ?? "")
                  ? validationError ?? undefined
                  : undefined
              }
              onChangeValue={(durationValue) => onUpdate({ durationValue })}
              onChangeUnit={(durationUnit) => onUpdate({ durationUnit })}
            />
          </FieldAnchor>
          <FieldAnchor field="beta_platforms" onFieldLayout={onFieldLayout}>
            <ChipField
              label="테스트 플랫폼"
              options={["iOS", "Android", "Web", "기타"]}
              selected={draft.betaPlatforms.map(betaPlatformLabel)}
              error={
                ["beta_platforms", "beta_test_platforms"].includes(
                  validationField ?? "",
                )
                  ? validationError ?? undefined
                  : undefined
              }
              onToggle={(value) => onToggle("betaPlatforms", value)}
            />
          </FieldAnchor>
          <FieldAnchor field="beta_dates" onFieldLayout={onFieldLayout}>
            <View className="gap-3">
              <Text className="text-[15px] font-semibold text-hypo-text">테스트 진행 날짜</Text>
              <View className={`${width < 375 || fontScale > 1.2 ? "" : "flex-row"} gap-2`}>
                <DateField
                  containerClassName="flex-1"
                  label="시작일"
                  value={draft.betaStartsAt}
                  error={
                    ["beta_dates", "beta_test_starts_at", "beta_test_ends_at"].includes(
                      validationField ?? "",
                    )
                      ? validationError ?? undefined
                      : undefined
                  }
                  onChange={(betaStartsAt) => onUpdate({ betaStartsAt })}
                />
                <DateField
                  containerClassName="flex-1"
                  label="종료일"
                  value={draft.betaEndsAt}
                  error={
                    ["beta_dates", "beta_test_starts_at", "beta_test_ends_at"].includes(
                      validationField ?? "",
                    )
                      ? validationError ?? undefined
                      : undefined
                  }
                  onChange={(betaEndsAt) => onUpdate({ betaEndsAt })}
                />
              </View>
            </View>
          </FieldAnchor>
          <FieldAnchor field="beta_test_environment" onFieldLayout={onFieldLayout}>
            <FormField
              inputRef={registerInputRef("beta_test_environment")}
              label="필요 기기 또는 환경"
              value={draft.environment}
              maxLength={1000}
              onBlur={() => onFieldBlur("beta_test_environment")}
              placeholder="예: iPhone iOS 17 이상"
              error={
                validationField === "beta_test_environment"
                  ? validationError ?? undefined
                  : undefined
              }
              onChangeText={(environment) => onUpdate({ environment })}
            />
          </FieldAnchor>
          <FieldAnchor field="beta_test_workflow_note" onFieldLayout={onFieldLayout}>
            <FormField
              inputRef={registerInputRef("beta_test_workflow_note")}
              label="테스트 방법 · 피드백 방식"
              value={draft.workflowNote}
              maxLength={2000}
              onBlur={() => onFieldBlur("beta_test_workflow_note")}
              placeholder="예: 앱을 7일간 사용한 뒤 설문을 제출해 주세요."
              multiline
              error={
                validationField === "beta_test_workflow_note"
                  ? validationError ?? undefined
                  : undefined
              }
              onChangeText={(workflowNote) => onUpdate({ workflowNote })}
            />
          </FieldAnchor>
        </View>
      ) : null}
      {!survey && !beta ? (
        <>
          <FieldAnchor field="duration_value" onFieldLayout={onFieldLayout}>
            <DurationField
              inputRef={registerInputRef("duration_value")}
              label="예상 소요 시간"
              onBlur={() => onFieldBlur("duration_value")}
              value={draft.durationValue}
              unit={draft.durationUnit}
              error={
                ["duration_minutes", "duration_value", "duration_unit"].includes(
                  validationField ?? "",
                )
                  ? validationError ?? undefined
                  : undefined
              }
              onChangeValue={(durationValue) => onUpdate({ durationValue })}
              onChangeUnit={(durationUnit) => onUpdate({ durationUnit })}
            />
          </FieldAnchor>
          <FieldAnchor field="schedule_mode" onFieldLayout={onFieldLayout}>
            <View className="gap-3">
              <SectionLabel>일정 설정 방식</SectionLabel>
              <View className="border-t border-hypo-border">
                <SelectableRow
                  description="참여 가능한 날짜와 시간을 알려줘요."
                  isSelected={draft.scheduleMode === "fixed"}
                  label="날짜와 시간 제시"
                  onPress={() => onUpdate({ scheduleMode: "fixed" })}
                />
                <SelectableRow
                  description="평일이나 주말의 참여 가능 시간대를 알려줘요."
                  isSelected={draft.scheduleMode === "recurring"}
                  label="시간대"
                  onPress={() => onUpdate({ scheduleMode: "recurring" })}
                />
                <SelectableRow
                  description="선정된 참여자와 채팅에서 세부 일정을 정해요."
                  isSelected={draft.scheduleMode === "negotiated"}
                  label="선정 후 채팅으로 조율"
                  onPress={() => onUpdate({ scheduleMode: "negotiated" })}
                />
              </View>
              {draft.scheduleMode === "fixed" ? (
                <View className="gap-2">
                  <DateTimeSlotPicker onAdd={onAddSlot} />
                  {draft.fixedSlots.map((slot) => (
                    <RemovableValue
                      key={slot}
                      value={slot}
                      onRemove={() => onRemoveSlot(slot)}
                    />
                  ))}
                </View>
              ) : null}
              {draft.scheduleMode === "recurring" ? (
                <ChipField
                  options={recurringWindows}
                  selected={draft.recurringWindows}
                  error={
                    validationField === "schedule_mode"
                      ? validationError ?? undefined
                      : undefined
                  }
                  onToggle={(value) => onToggle("recurringWindows", value)}
                />
              ) : null}
              {draft.scheduleMode === "fixed" && validationField === "schedule_mode" ? (
                <InlineError message={validationError ?? "일정 설정을 다시 확인해 주세요."} />
              ) : null}
            </View>
          </FieldAnchor>
          <FieldAnchor field="schedule_note" onFieldLayout={onFieldLayout}>
            <FormField
              inputRef={registerInputRef("schedule_note")}
              label={research ? "준비 사항 및 추가 안내 (선택)" : "추가 안내"}
              value={draft.scheduleNote}
              maxLength={2000}
              onBlur={() => onFieldBlur("schedule_note")}
              placeholder={research ? "예: 개인 노트북을 준비해 주세요." : "예: 정확한 시간은 선정 후 채팅에서 조율할 수 있어요."}
              multiline
              error={
                validationField === "schedule_note"
                  ? validationError ?? undefined
                  : undefined
              }
              onChangeText={(scheduleNote) => onUpdate({ scheduleNote })}
            />
          </FieldAnchor>
        </>
      ) : null}
      {showLocation ? (
        <FieldAnchor field="location" onFieldLayout={onFieldLayout}>
          <CreationLocationChooser
            draft={draft}
            error={
              validationField === "location"
                ? validationError ?? undefined
                : undefined
            }
            inputRef={registerInputRef("location")}
            onUpdate={onUpdate}
          />
        </FieldAnchor>
      ) : null}
    </View>
  );
}
