import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import type { ComponentProps } from "react";
import { useEffect, useState } from "react";
import {
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type {
  Compensation,
  CompensationType,
  InterviewMode,
  PostingType,
} from "@hypofit/contracts";
import { formatCompensation, postingTypeLabels } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  clearPostingCreationDraft,
  createInitialPostingCreationDraft,
  durationToMinutes,
  hasDraftContent,
  loadPostingCreationDraft,
  requiresLocation,
  savePostingCreationDraft,
  serializePostingCreationDraft,
  type CreationStep,
  type DurationUnit,
  type PostingCreationDraft,
} from "@/features/interview-posts/postingCreationDraft";
import { useCreateInterviewPost } from "@/features/interview-posts/useCreateInterviewPost";
import { usePlaceSearch } from "@/features/places/usePlaceSearch";
import type { PlaceSearchResult } from "@/shared/api/places";
import { ApiError } from "@/shared/api/client";
import { StateMessage } from "@/screens/home/HomeScreen";
import {
  goBackOrReplaceFallback,
  resolveReturnTo,
} from "@/shared/navigation/backNavigation";
import { colors } from "@/shared/theme/tokens";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

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
    type: "usability_test",
    icon: "mouse-pointer",
    description: "앱이나 웹을 사용하며 불편한 점을 확인해요.",
  },
  {
    type: "research_experiment",
    icon: "activity",
    description: "정해진 연구 절차에 따라 참여해요.",
  },
  {
    type: "focus_group",
    icon: "users",
    description: "여러 참여자가 함께 의견을 나눠요.",
  },
  {
    type: "other",
    icon: "more-horizontal",
    description: "위 유형에 해당하지 않는 모집이에요.",
  },
];
const recurringWindows = [
  "평일 오전",
  "평일 오후",
  "평일 저녁",
  "주말 오전",
  "주말 오후",
  "주말 저녁",
];
const durationUnits: Array<{ value: DurationUnit; label: string }> = [
  { value: "minutes", label: "분" },
  { value: "hours", label: "시간" },
];
const compensationTypes: Array<{ type: CompensationType; label: string }> = [
  { type: "cash", label: "현금" },
  { type: "gift_card", label: "기프티콘 · 상품권" },
  { type: "points", label: "포인트" },
  { type: "product", label: "제품 · 샘플" },
  { type: "coupon_or_access", label: "쿠폰 · 이용권" },
  { type: "other", label: "기타" },
];

export function CreateInterviewScreen() {
  const params = useLocalSearchParams<{
    returnTo?: string | string[];
    draftAction?: "new" | "resume" | string[];
  }>();
  const backTo = resolveReturnTo(params.returnTo, "/(tabs)/interviews");
  const shouldRestoreDraft = params.draftAction === "resume";
  const insets = useSafeAreaInsets();
  const { accessToken } = useAuth();
  const createPost = useCreateInterviewPost(accessToken);
  const [step, setStep] = useState<CreationStep>(1);
  const [draft, setDraft] = useState<PostingCreationDraft>(
    createInitialPostingCreationDraft,
  );
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"saving" | "saved" | "failed">(
    "saved",
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldRestoreDraft) {
      setIsDraftReady(true);
      return;
    }

    void loadPostingCreationDraft()
      .then((stored) => {
        if (stored && hasDraftContent(stored)) {
          setDraft(stored);
        }
      })
      .finally(() => setIsDraftReady(true));
  }, [shouldRestoreDraft]);
  useEffect(() => {
    if (!isDraftReady || !hasDraftContent(draft)) return;
    setDraftStatus("saving");
    const timeout = setTimeout(
      () =>
        void savePostingCreationDraft(draft)
          .then(() => setDraftStatus("saved"))
          .catch(() => setDraftStatus("failed")),
      500,
    );
    return () => clearTimeout(timeout);
  }, [draft, isDraftReady]);

  if (!accessToken)
    return (
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <View className="flex-1 px-4 pt-3">
          <CreationHeader
            draftStatus="saved"
            onBack={() => goBackOrReplaceFallback(backTo)}
          />
          <StateMessage
            title="로그인이 필요해요."
            description="공고를 만들려면 먼저 로그인해 주세요."
          />
        </View>
      </SafeAreaView>
    );

  const updateDraft = (patch: Partial<PostingCreationDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setValidationError(null);
  };
  const toggle = (
    field: "betaPlatforms" | "recurringWindows",
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
    setValidationError(null);
  };
  const chooseType = (type: PostingType) =>
    updateDraft({
      type,
      entryMode: allowsDirect(type) ? draft.entryMode : "application_required",
      interviewMode: type === "interview" ? draft.interviewMode : "online",
      ...(type === "interview" && draft.recruitmentLimitMode === "unlimited"
        ? { recruitmentLimitMode: "limited", recruitmentCount: "10" }
        : type !== "interview" &&
            draft.type === "interview" &&
            draft.recruitmentLimitMode === "limited" &&
            draft.recruitmentCount === "10"
          ? { recruitmentLimitMode: "unlimited", recruitmentCount: "" }
          : {}),
    });
  const addSlot = (value: string) => {
    if (!value || draft.fixedSlots.includes(value)) return;
    updateDraft({ fixedSlots: [...draft.fixedSlots, value] });
  };
  const updateCompensation = (index: number, patch: Partial<Compensation>) => {
    setDraft((current) => ({
      ...current,
      compensations: current.compensations.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
    setValidationError(null);
  };
  const next = () => {
    const error = validateStep(step, draft);
    if (error) {
      setValidationError(error);
      return;
    }
    setValidationError(null);
    setStep((current) => Math.min(current + 1, 5) as CreationStep);
  };
  const publish = () => {
    const issue = validateAll(draft);
    if (issue) {
      setValidationError(issue.message);
      setStep(issue.step);
      return;
    }
    createPost.mutate(serializePostingCreationDraft(draft), {
      onSuccess: (post) => {
        void clearPostingCreationDraft();
        router.replace({
          pathname: "/interviews/[postId]",
          params: { postId: post.id },
        });
      },
      onError: (error) => setValidationError(getPublishErrorMessage(error)),
    });
  };
  const back = () => {
    if (step > 1) {
      setValidationError(null);
      setStep((current) => (current - 1) as CreationStep);
    } else goBackOrReplaceFallback(backTo);
  };
  const primaryLabel =
    step === 5 ? "공고 올리기" : step === 4 ? "검토하기" : "다음";

  return (
    <SafeAreaView
      className="flex-1 bg-hypo-bg"
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1">
          <View className="px-4 pt-2">
            <CreationHeader draftStatus={draftStatus} onBack={back} />
            <ProgressIndicator step={step} />
          </View>
          <ScrollView
            className="flex-1"
            contentContainerClassName="gap-6 px-4 pb-7 pt-5"
            keyboardShouldPersistTaps="handled"
          >
            <View className="gap-1">
              <Text className="text-[24px] font-bold leading-8 text-hypo-text">
                {stepTitle(step, draft.type).heading}
              </Text>
              <Text className="text-[15px] leading-[22px] text-hypo-text-secondary">
                {stepTitle(step, draft.type).description}
              </Text>
            </View>
            {step === 1 ? (
              <StepOne
                draft={draft}
                onChooseType={chooseType}
                onUpdate={updateDraft}
              />
            ) : null}
            {step === 2 ? (
              <StepTwo draft={draft} onUpdate={updateDraft} />
            ) : null}
            {step === 3 ? (
              <StepThree
                draft={draft}
                onAddSlot={addSlot}
                onRemoveSlot={(value) =>
                  updateDraft({
                    fixedSlots: draft.fixedSlots.filter(
                      (slot) => slot !== value,
                    ),
                  })
                }
                onToggle={toggle}
                onUpdate={updateDraft}
              />
            ) : null}
            {step === 4 ? (
              <StepFour
                draft={draft}
                onAddCompensation={() =>
                  updateDraft({
                    compensations: [
                      ...draft.compensations.filter(
                        (item) => item.type !== "none",
                      ),
                      { type: "cash", amount: null, currency: "KRW" },
                    ],
                  })
                }
                onRemoveCompensation={(index) =>
                  updateDraft({
                    compensations: draft.compensations.filter(
                      (_, current) => current !== index,
                    ),
                  })
                }
                onSetNoCompensation={() =>
                  updateDraft({ compensations: [{ type: "none" }] })
                }
                onUpdate={updateDraft}
                onUpdateCompensation={updateCompensation}
              />
            ) : null}
            {step === 5 ? <ReviewStep draft={draft} onEdit={setStep} /> : null}
            {validationError ? <InlineError message={validationError} /> : null}
            {createPost.error && !validationError ? (
              <InlineError message="공고를 올리지 못했어요. 잠시 후 다시 시도해 주세요." />
            ) : null}
          </ScrollView>
          <View
            className="border-t border-hypo-border bg-hypo-bg px-4 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
          >
            <Pressable
              accessibilityLabel={primaryLabel}
              accessibilityRole="button"
              className="h-[54px] items-center justify-center rounded-[12px] bg-hypo-brand"
              disabled={createPost.isPending}
              style={({ pressed }) => ({
                opacity: createPost.isPending ? 0.5 : pressed ? 0.84 : 1,
              })}
              onPress={step === 5 ? publish : next}
            >
              <Text className="text-[16px] font-semibold text-white">
                {createPost.isPending ? "게시 중" : primaryLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepOne({
  draft,
  onChooseType,
  onUpdate,
}: {
  draft: PostingCreationDraft;
  onChooseType: (type: PostingType) => void;
  onUpdate: (patch: Partial<PostingCreationDraft>) => void;
}) {
  return (
    <View className="gap-7">
      <View className="gap-2">
        <SectionLabel>공고 유형</SectionLabel>
        <View className="border-t border-hypo-border">
          {typeOptions.map((option) => (
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
          {allowsDirect(draft.type) ? (
            <SelectableRow
              description="별도 승인 없이 설문이나 테스트에 바로 참여할 수 있어요."
              isSelected={draft.entryMode === "direct"}
              label="바로 참여"
              onPress={() => onUpdate({ entryMode: "direct" })}
            />
          ) : (
            <Text className="pt-2 text-[13px] leading-5 text-hypo-text-secondary">
              {postingTypeLabels[draft.type]}는 신청 후 참여로 진행돼요.
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
function StepTwo({
  draft,
  onUpdate,
}: {
  draft: PostingCreationDraft;
  onUpdate: (patch: Partial<PostingCreationDraft>) => void;
}) {
  return (
    <View className="gap-5">
      <FormField
        label="제목"
        value={draft.title}
        placeholder="예: 1인 가구 식재료 관리 경험 인터뷰"
        maxLength={120}
        onChangeText={(title) => onUpdate({ title })}
      />
      <FormField
        label="공고 설명"
        value={draft.description}
        placeholder="무엇을 확인하거나 테스트하려는지 간단히 설명해 주세요."
        multiline
        maxLength={2000}
        onChangeText={(description) => onUpdate({ description })}
      />
      <FormField
        label="찾는 참여자"
        value={draft.targetParticipant}
        placeholder="예: 최근 3개월 내 직접 장을 보고 남은 식재료를 버린 경험이 있는 1인 가구"
        multiline
        maxLength={2000}
        helper="참여 조건을 구체적으로 작성하면 더 잘 맞는 사람에게 닿을 수 있어요."
        onChangeText={(targetParticipant) => onUpdate({ targetParticipant })}
      />
    </View>
  );
}
function StepThree({
  draft,
  onAddSlot,
  onRemoveSlot,
  onToggle,
  onUpdate,
}: {
  draft: PostingCreationDraft;
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
  const showLocation = requiresLocation(draft);
  return (
    <View className="gap-6">
      <View className="gap-2">
        <SectionLabel>진행 방식</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {(survey
            ? [{ value: "online" as const, label: "온라인 · 외부 설문" }]
            : [
                { value: "online" as const, label: "온라인" },
                { value: "offline" as const, label: "대면" },
                { value: "both" as const, label: "대면·화상" },
              ]
          ).map((option) => (
            <ChoiceChip
              key={option.value}
              isSelected={draft.interviewMode === option.value}
              label={option.label}
              onPress={() => onUpdate({ interviewMode: option.value })}
            />
          ))}
        </View>
      </View>
      {survey ? (
        <View className="gap-5">
          <FormField
            label="외부 설문 서비스"
            value="Google Forms"
            editable={false}
            placeholder="Google Forms"
          />
          <FormField
            label="참여 링크"
            value={draft.externalUrl}
            placeholder="https://forms.gle/..."
            keyboardType="url"
            autoCapitalize="none"
            helper={
              draft.entryMode === "application_required"
                ? "승인된 참여자에게만 링크가 공개돼요."
                : "공고에서 바로 참여할 수 있어요."
            }
            onChangeText={(externalUrl) => onUpdate({ externalUrl })}
          />
          <FormField
            label="외부 설문 안내"
            value={draft.externalDataNotice}
            placeholder="외부 설문 서비스에서 응답을 처리해요."
            multiline
            onChangeText={(externalDataNotice) =>
              onUpdate({ externalDataNotice })
            }
          />
          <DurationField
            label="예상 응답 시간"
            value={draft.durationValue}
            unit={draft.durationUnit}
            onChangeValue={(durationValue) => onUpdate({ durationValue })}
            onChangeUnit={(durationUnit) => onUpdate({ durationUnit })}
          />
        </View>
      ) : null}
      {beta ? (
        <View className="gap-5">
          <ChipField
            label="테스트 플랫폼"
            options={["iOS", "Android", "Web", "기타"]}
            selected={draft.betaPlatforms}
            onToggle={(value) => onToggle("betaPlatforms", value)}
          />
          <View className="gap-2">
            <SectionLabel>테스트 기간</SectionLabel>
            <View className="flex-row gap-2">
              <DateField
                containerClassName="flex-1"
                label="시작일"
                value={draft.betaStartsAt}
                onChange={(betaStartsAt) => onUpdate({ betaStartsAt })}
              />
              <DateField
                containerClassName="flex-1"
                label="종료일"
                value={draft.betaEndsAt}
                onChange={(betaEndsAt) => onUpdate({ betaEndsAt })}
              />
            </View>
          </View>
          <FormField
            label="필요 기기 또는 환경"
            value={draft.environment}
            placeholder="예: iPhone iOS 17 이상"
            onChangeText={(environment) => onUpdate({ environment })}
          />
          <FormField
            label="테스트 방법 · 피드백 방식"
            value={draft.workflowNote}
            placeholder="예: 앱을 7일간 사용한 뒤 설문을 제출해 주세요."
            multiline
            onChangeText={(workflowNote) => onUpdate({ workflowNote })}
          />
        </View>
      ) : null}
      {!survey && !beta ? (
        <>
          <DurationField
            label="예상 소요 시간"
            value={draft.durationValue}
            unit={draft.durationUnit}
            onChangeValue={(durationValue) => onUpdate({ durationValue })}
            onChangeUnit={(durationUnit) => onUpdate({ durationUnit })}
          />
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
                onToggle={(value) => onToggle("recurringWindows", value)}
              />
            ) : null}
            <FormField
              label="추가 안내"
              value={draft.scheduleNote}
              placeholder="예: 정확한 시간은 선정 후 채팅에서 조율할 수 있어요."
              multiline
              onChangeText={(scheduleNote) => onUpdate({ scheduleNote })}
            />
          </View>
        </>
      ) : null}
      {showLocation ? (
        <LocationChooser draft={draft} onUpdate={onUpdate} />
      ) : null}
    </View>
  );
}
function StepFour({
  draft,
  onAddCompensation,
  onRemoveCompensation,
  onSetNoCompensation,
  onUpdate,
  onUpdateCompensation,
}: {
  draft: PostingCreationDraft;
  onAddCompensation: () => void;
  onRemoveCompensation: (index: number) => void;
  onSetNoCompensation: () => void;
  onUpdate: (patch: Partial<PostingCreationDraft>) => void;
  onUpdateCompensation: (index: number, patch: Partial<Compensation>) => void;
}) {
  const provided = draft.compensations.some((item) => item.type !== "none");
  return (
    <View className="gap-7">
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
                onRemove={() => onRemoveCompensation(index)}
                onUpdate={(patch) => onUpdateCompensation(index, patch)}
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
            label="참여자 수"
            value={draft.recruitmentCount}
            placeholder="4"
            suffix="명"
            keyboardType="number-pad"
            onChangeText={(recruitmentCount) => onUpdate({ recruitmentCount })}
          />
        ) : null}
      </View>
      <View className="gap-3">
        <SectionLabel>마감일</SectionLabel>
        <View className="border-t border-hypo-border">
          <DeadlineSettingRow
            deadline={draft.deadline}
            enabled={draft.deadlineEnabled}
            onChange={(deadline) =>
              onUpdate({ deadlineEnabled: true, deadline })
            }
          />
          <SelectableRow
            description="별도 마감일 없이 모집을 이어가요."
            isSelected={!draft.deadlineEnabled}
            label="마감일 없음"
            onPress={() => onUpdate({ deadlineEnabled: false, deadline: "" })}
          />
        </View>
      </View>
    </View>
  );
}
function ReviewStep({
  draft,
  onEdit,
}: {
  draft: PostingCreationDraft;
  onEdit: (step: CreationStep) => void;
}) {
  const duration = `${draft.durationValue || "-"}${durationUnits.find((unit) => unit.value === draft.durationUnit)?.label ?? "분"}`;
  return (
    <View className="gap-7">
      <ReviewSection
        onEdit={() => onEdit(1)}
        title="유형과 참여 방식"
        values={[
          ["공고 유형", postingTypeLabels[draft.type]],
          [
            "참여 방식",
            draft.entryMode === "direct" ? "바로 참여" : "신청 후 참여",
          ],
        ]}
      />
      <ReviewSection
        onEdit={() => onEdit(2)}
        title="공고 내용"
        values={[
          ["제목", draft.title],
          ["공고 설명", draft.description],
          ["찾는 참여자", draft.targetParticipant],
        ]}
      />
      <ReviewSection
        onEdit={() => onEdit(3)}
        title="진행 방법"
        values={reviewMethodValues(draft, duration)}
      />
      <ReviewSection
        onEdit={() => onEdit(4)}
        title="모집 조건"
        values={[
          ["보상", draft.compensations.map(formatCompensation).join(" + ")],
          [
            "모집 인원",
            draft.recruitmentLimitMode === "limited"
              ? `${draft.recruitmentCount}명`
              : "인원 제한 없음",
          ],
          ["마감", draft.deadlineEnabled ? draft.deadline : "마감일 없음"],
        ]}
      />
    </View>
  );
}
function CreationHeader({
  draftStatus,
  onBack,
}: {
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
        공고 만들기
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
function ProgressIndicator({ step }: { step: CreationStep }) {
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
function FormField({
  label,
  value,
  placeholder,
  onChangeText,
  multiline,
  helper,
  suffix,
  containerClassName = "",
  keyboardType,
  autoCapitalize,
  editable = true,
  maxLength,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText?: (value: string) => void;
  multiline?: boolean;
  helper?: string;
  suffix?: string;
  containerClassName?: string;
  keyboardType?: "default" | "number-pad" | "url";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  editable?: boolean;
  maxLength?: number;
}) {
  return (
    <View className={`gap-2 ${containerClassName}`.trim()}>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-[13px] font-semibold text-hypo-text">
          {label}
        </Text>
        {maxLength ? (
          <Text className="text-[12px] text-hypo-text-soft">
            {value.length}/{maxLength}
          </Text>
        ) : null}
      </View>
      <View
        className={`rounded-[12px] border border-hypo-border bg-hypo-surface px-4 ${multiline ? "min-h-[116px]" : "h-[52px] flex-row items-center"}`}
      >
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          placeholder={placeholder}
          placeholderTextColor={colors.textSoft}
          className={`min-w-0 flex-1 text-[15px] text-hypo-text ${multiline ? "min-h-[114px] py-3 leading-[22px]" : "h-[50px] py-0"} ${editable ? "" : "text-hypo-text-secondary"}`}
          style={{ textAlignVertical: multiline ? "top" : "center" }}
          value={value}
          onChangeText={onChangeText}
        />
        {suffix ? (
          <Text className="ml-2 text-[14px] font-medium text-hypo-text-secondary">
            {suffix}
          </Text>
        ) : null}
      </View>
      {helper ? (
        <Text className="text-[12px] leading-[18px] text-hypo-text-secondary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

function DurationField({
  label,
  value,
  unit,
  onChangeValue,
  onChangeUnit,
}: {
  label: string;
  value: string;
  unit: DurationUnit;
  onChangeValue: (value: string) => void;
  onChangeUnit: (unit: DurationUnit) => void;
}) {
  const unitLabel =
    durationUnits.find((option) => option.value === unit)?.label ?? "분";
  const chooseUnit = () => {
    const options = durationUnits.map((option) => option.label);
    const select = (index: number) => {
      const next = durationUnits[index];
      if (next) onChangeUnit(next.value);
    };

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...options, "취소"],
          cancelButtonIndex: options.length,
          title: "시간 단위",
        },
        select,
      );
      return;
    }

    Alert.alert("시간 단위", undefined, [
      ...durationUnits.map((option, index) => ({
        text: option.label,
        onPress: () => select(index),
      })),
      { text: "취소", style: "cancel" },
    ]);
  };

  return (
    <View className="gap-2">
      <SectionLabel>{label}</SectionLabel>
      <View className="h-[52px] flex-row items-center rounded-[12px] border border-hypo-border bg-hypo-surface px-4">
        <Text className="mr-2 text-[15px] text-hypo-text-secondary">약</Text>
        <TextInput
          accessibilityLabel={label}
          className="h-[50px] min-w-0 flex-1 py-0 text-[17px] font-semibold text-hypo-text"
          keyboardType="number-pad"
          placeholder="30"
          placeholderTextColor={colors.textSoft}
          value={value}
          onChangeText={onChangeValue}
        />
        <Pressable
          accessibilityLabel={`${label} 단위: ${unitLabel}`}
          accessibilityRole="button"
          className="-mr-2 h-10 flex-row items-center gap-1 rounded-[8px] px-2"
          onPress={chooseUnit}
        >
          <Text className="text-[15px] font-semibold text-hypo-brand">
            {unitLabel}
          </Text>
          <Feather color={colors.brand} name="chevron-down" size={16} />
        </Pressable>
      </View>
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
  containerClassName = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  containerClassName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedDate = isIsoDate(value)
    ? new Date(`${value}T12:00:00`)
    : new Date();
  const handleChange = (_event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS !== "ios") setIsOpen(false);
    if (nextDate) onChange(formatDate(nextDate));
  };

  return (
    <View className={`gap-2 ${containerClassName}`.trim()}>
      <Text className="text-[13px] font-semibold text-hypo-text">{label}</Text>
      <View className="h-[52px] flex-row items-center rounded-[12px] border border-hypo-border bg-hypo-surface pl-4">
        <Pressable
          accessibilityLabel={`${label} 선택`}
          accessibilityRole="button"
          className="min-w-0 flex-1 justify-center"
          onPress={() => setIsOpen(true)}
        >
          <Text
            className={`text-[15px] ${value ? "text-hypo-text" : "text-hypo-text-soft"}`}
          >
            {value || "날짜 선택"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={`${label} 달력 열기`}
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center"
          onPress={() => setIsOpen(true)}
        >
          <Feather color={colors.textMetadata} name="calendar" size={17} />
        </Pressable>
      </View>
      {isOpen ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "compact" : "default"}
          minimumDate={new Date()}
          mode="date"
          value={selectedDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}

function DeadlineSettingRow({
  enabled,
  deadline,
  onChange,
}: {
  enabled: boolean;
  deadline: string;
  onChange: (deadline: string) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const selectedDate = isIsoDate(deadline)
    ? new Date(`${deadline}T12:00:00`)
    : new Date();
  const openPicker = () => setIsPickerOpen(true);
  const handleChange = (_event: DateTimePickerEvent, nextDate?: Date) => {
    if (Platform.OS !== "ios") setIsPickerOpen(false);
    if (nextDate) onChange(formatDate(nextDate));
  };

  return (
    <View>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: enabled }}
        className={`min-h-[64px] flex-row items-center gap-3 border-b border-hypo-border py-3 ${enabled ? "bg-hypo-brandSoft/50" : ""}`}
        onPress={openPicker}
        style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
      >
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[15px] font-semibold text-hypo-text">
            마감일 설정
          </Text>
          <Text className="text-[13px] leading-5 text-hypo-text-secondary">
            {enabled && deadline
              ? `${deadline}까지 참여할 수 있어요.`
              : "참여할 수 있는 마지막 날짜를 정해요."}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="마감일 달력 열기"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center"
          onPress={openPicker}
        >
          <Feather color={colors.textMetadata} name="calendar" size={17} />
        </Pressable>
        <View
          className={`h-5 w-5 items-center justify-center rounded-full border ${enabled ? "border-hypo-brand bg-hypo-brand" : "border-hypo-border bg-hypo-surface"}`}
        >
          {enabled ? <Feather color="white" name="check" size={13} /> : null}
        </View>
      </Pressable>
      {isPickerOpen ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={new Date()}
          mode="date"
          value={selectedDate}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}
function DateTimeSlotPicker({ onAdd }: { onAdd: (value: string) => void }) {
  const [value, setValue] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<
    "date" | "time" | "datetime" | null
  >(null);
  const handleChange = (event: DateTimePickerEvent, nextDate?: Date) => {
    if (event.type === "dismissed") {
      setPickerMode(null);
      return;
    }
    if (!nextDate) return;

    if (Platform.OS === "android" && pickerMode === "date") {
      setValue(nextDate);
      setPickerMode("time");
      return;
    }
    setValue(nextDate);
    if (Platform.OS === "android") setPickerMode(null);
  };
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <Pressable
          accessibilityLabel="날짜와 시간 선택"
          accessibilityRole="button"
          className="h-[52px] min-w-0 flex-1 flex-row items-center justify-between rounded-[12px] border border-hypo-border bg-hypo-surface px-4"
          onPress={() =>
            setPickerMode(Platform.OS === "ios" ? "datetime" : "date")
          }
        >
          <Text className="text-[15px] text-hypo-text">
            {formatDateTime(value)}
          </Text>
          <Feather color={colors.textMetadata} name="calendar" size={17} />
        </Pressable>
        <Pressable
          accessibilityLabel="선택한 날짜와 시간 추가"
          accessibilityRole="button"
          className="h-[52px] justify-center rounded-[12px] bg-hypo-surfaceMuted px-4"
          onPress={() => onAdd(formatDateTime(value))}
        >
          <Text className="font-semibold text-hypo-text">추가</Text>
        </Pressable>
      </View>
      {pickerMode ? (
        <DateTimePicker
          display={Platform.OS === "ios" ? "compact" : "default"}
          mode={pickerMode}
          minimumDate={
            pickerMode === "date" || pickerMode === "datetime"
              ? new Date()
              : undefined
          }
          value={value}
          onChange={handleChange}
        />
      ) : null}
    </View>
  );
}
function SelectableRow({
  label,
  description,
  isSelected,
  onPress,
  icon,
}: {
  label: string;
  description: string;
  isSelected: boolean;
  onPress: () => void;
  icon?: FeatherIconName;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: isSelected }}
      className={`min-h-[64px] flex-row items-center gap-3 border-b border-hypo-border py-3 ${isSelected ? "bg-hypo-brandSoft/50" : ""}`}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.76 : 1 })}
    >
      {icon ? (
        <Feather
          color={isSelected ? colors.brand : colors.textMetadata}
          name={icon}
          size={18}
        />
      ) : null}
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-[15px] font-semibold text-hypo-text">
          {label}
        </Text>
        <Text className="text-[13px] leading-5 text-hypo-text-secondary">
          {description}
        </Text>
      </View>
      <View
        className={`h-5 w-5 items-center justify-center rounded-full border ${isSelected ? "border-hypo-brand bg-hypo-brand" : "border-hypo-border bg-hypo-surface"}`}
      >
        {isSelected ? <Feather color="white" name="check" size={13} /> : null}
      </View>
    </Pressable>
  );
}
function ChoiceChip({
  label,
  isSelected,
  onPress,
  compact,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isSelected }}
      className={`${compact ? "h-8 px-2" : "min-h-[40px] px-3"} items-center justify-center rounded-[10px] border ${isSelected ? "border-hypo-brand bg-hypo-brandSoft" : "border-hypo-border bg-hypo-surface"}`}
      onPress={onPress}
    >
      <Text
        className={`${compact ? "text-[12px]" : "text-[13px]"} font-medium ${isSelected ? "text-hypo-brand" : "text-hypo-text-secondary"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
function ChipField({
  label,
  options,
  selected,
  onToggle,
}: {
  label?: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View className="gap-2">
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <ChoiceChip
            key={option}
            isSelected={selected.includes(option)}
            label={option}
            onPress={() => onToggle(option)}
          />
        ))}
      </View>
    </View>
  );
}
function LocationChooser({
  draft,
  onUpdate,
}: {
  draft: PostingCreationDraft;
  onUpdate: (patch: Partial<PostingCreationDraft>) => void;
}) {
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState<string | null>(null);
  const placeSearch = usePlaceSearch(
    submittedQuery ? { query: submittedQuery, limit: 5 } : null,
  );
  const selectPlace = (place: PlaceSearchResult) =>
    onUpdate({
      location: place.name,
      locationPlaceName: place.name,
      locationAddress: place.road_address ?? place.address ?? "",
      locationLatitude: place.latitude,
      locationLongitude: place.longitude,
      locationSource: place.source,
    });
  return (
    <View className="gap-2">
      <SectionLabel>위치</SectionLabel>
      <View className="flex-row gap-2">
        <TextInput
          accessibilityLabel="장소 검색"
          className="h-[52px] min-w-0 flex-1 rounded-[12px] border border-hypo-border bg-hypo-surface px-4 text-[15px] text-hypo-text"
          placeholder="장소, 역, 학교를 검색해요"
          placeholderTextColor={colors.textSoft}
          returnKeyType="search"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setSubmittedQuery(query.trim() || null)}
        />
        <Pressable
          accessibilityLabel="장소 검색"
          accessibilityRole="button"
          className="h-[52px] justify-center rounded-[12px] bg-hypo-surfaceMuted px-4"
          disabled={placeSearch.isFetching}
          onPress={() => setSubmittedQuery(query.trim() || null)}
        >
          <Text className="text-[14px] font-semibold text-hypo-text">검색</Text>
        </Pressable>
      </View>
      {submittedQuery && placeSearch.isError ? (
        <InlineError message="장소 검색을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." />
      ) : null}
      {submittedQuery && !placeSearch.isFetching && !placeSearch.isError ? (
        <View className="border-t border-hypo-border">
          {(placeSearch.data ?? []).map((place) => (
            <SelectableRow
              key={place.id}
              description={
                place.road_address ?? place.address ?? "주소 정보 없음"
              }
              isSelected={
                draft.locationLatitude === place.latitude &&
                draft.locationLongitude === place.longitude
              }
              label={place.name}
              onPress={() => selectPlace(place)}
            />
          ))}
          {!(placeSearch.data ?? []).length ? (
            <Text className="pt-2 text-[13px] text-hypo-text-secondary">
              검색 결과가 없어요. 다른 장소 이름으로 찾아보세요.
            </Text>
          ) : null}
        </View>
      ) : null}
      {draft.locationPlaceName ? (
        <Text className="text-[12px] leading-[18px] text-hypo-text-secondary">
          선택한 장소: {draft.locationPlaceName}
          {draft.locationAddress ? ` · ${draft.locationAddress}` : ""}
        </Text>
      ) : (
        <Text className="text-[12px] leading-[18px] text-hypo-text-secondary">
          대면 진행에는 지도에 표시할 장소를 선택해 주세요.
        </Text>
      )}
    </View>
  );
}
function RemovableValue({
  value,
  onRemove,
}: {
  value: string;
  onRemove: () => void;
}) {
  return (
    <View className="min-h-[42px] flex-row items-center justify-between gap-3 border-b border-hypo-border">
      <Text className="min-w-0 flex-1 text-[14px] text-hypo-text-secondary">
        {value}
      </Text>
      <Pressable
        accessibilityLabel={`${value} 삭제`}
        accessibilityRole="button"
        hitSlop={8}
        onPress={onRemove}
      >
        <Feather color={colors.textMetadata} name="x" size={18} />
      </Pressable>
    </View>
  );
}
function CompensationEditor({
  compensation,
  index,
  canRemove,
  onRemove,
  onUpdate,
}: {
  compensation: Compensation;
  index: number;
  canRemove: boolean;
  onRemove: () => void;
  onUpdate: (patch: Partial<Compensation>) => void;
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
          value={compensation.amount ? String(compensation.amount) : ""}
          placeholder="30000"
          suffix="원"
          keyboardType="number-pad"
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
          value={compensation.label ?? ""}
          placeholder="예: 스타벅스 아메리카노 기프티콘"
          onChangeText={(label) => onUpdate({ label })}
        />
      ) : null}
    </View>
  );
}
function ReviewSection({
  title,
  values,
  onEdit,
}: {
  title: string;
  values: Array<[string, string]>;
  onEdit: () => void;
}) {
  return (
    <View className="gap-3 border-b border-hypo-border pb-6">
      <View className="flex-row items-center justify-between">
        <Text className="text-[16px] font-semibold text-hypo-text">
          {title}
        </Text>
        <Pressable accessibilityRole="button" onPress={onEdit}>
          <Text className="text-[13px] font-semibold text-hypo-brand">
            수정
          </Text>
        </Pressable>
      </View>
      {values.map(([label, value]) => (
        <View className="flex-row items-start gap-4" key={label}>
          <Text className="w-20 text-[13px] text-hypo-text-metadata">
            {label}
          </Text>
          <Text className="min-w-0 flex-1 text-[14px] leading-5 text-hypo-text-secondary">
            {value || "-"}
          </Text>
        </View>
      ))}
    </View>
  );
}
function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-[13px] font-semibold text-hypo-text">{children}</Text>
  );
}
function InlineError({ message }: { message: string }) {
  return (
    <Text
      accessibilityLiveRegion="polite"
      className="text-[13px] leading-5 text-hypo-danger"
    >
      {message}
    </Text>
  );
}
function allowsDirect(type: PostingType) {
  return ["survey", "usability_test", "other"].includes(type);
}
function getPublishErrorMessage(error: unknown) {
  if (!(error instanceof ApiError)) {
    return "공고를 올리지 못했어요. 네트워크를 확인한 뒤 다시 시도해 주세요.";
  }

  const field = error.fieldErrors?.[0]?.field;
  if (field === "title") return "제목을 다시 확인해 주세요.";
  if (field === "service_summary" || field === "serviceSummary")
    return "공고 설명을 다시 확인해 주세요.";
  if (field === "target_description" || field === "targetDescription")
    return "찾는 참여자를 다시 확인해 주세요.";
  if (field === "duration_minutes" || field === "durationMinutes")
    return "예상 소요 시간을 다시 확인해 주세요.";
  if (field === "recruit_count" || field === "recruitCount")
    return "모집 인원을 다시 확인해 주세요.";
  if (field === "interview_mode" || field === "interviewMode")
    return "진행 방식을 다시 확인해 주세요.";
  if (
    field === "location" ||
    field === "location_text" ||
    field === "locationText" ||
    field === "location_latitude" ||
    field === "locationLatitude" ||
    field === "location_longitude" ||
    field === "locationLongitude" ||
    field === "location_precision" ||
    field === "locationPrecision" ||
    field === "location_source" ||
    field === "locationSource"
  )
    return "대면 진행에는 지도에서 장소를 선택해 주세요.";
  if (field === "schedule_options" || field === "scheduleOptions")
    return "일정 설정을 다시 확인해 주세요.";
  if (field === "external_url" || field === "externalUrl")
    return "외부 설문 참여 링크를 다시 확인해 주세요.";
  if (field === "participation_deadline_at" || field === "participationDeadlineAt")
    return "마감일을 다시 확인해 주세요.";
  if (field === "compensations") return "보상 내용을 다시 확인해 주세요.";
  if (field === "__root__")
    return "대면 진행에는 지도에서 장소를 선택해 주세요.";

  if (error.code === "recruitment_type_not_supported") {
    return "이 공고 유형은 아직 등록을 준비 중이에요.";
  }
  if (error.code === "auth_verifier_unavailable") {
    return "로그인 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  if (error.status === 401 || error.status === 403) {
    return "인증 정보를 확인하는 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
  }
  if (error.status >= 500) {
    return "공고를 올리지 못했어요. 잠시 후 다시 시도해 주세요.";
  }
  if (error.status === 422) return "입력한 내용을 다시 확인해 주세요.";
  return "공고를 올리지 못했어요. 작성한 내용은 초안으로 보관했어요.";
}
function stepTitle(step: CreationStep, type: PostingType) {
  if (step === 1)
    return {
      heading: "어떤 참여자를 모집하나요?",
      description: "공고 유형과 참여 방식을 먼저 정해요.",
    };
  if (step === 2)
    return {
      heading: "공고 내용을 알려주세요",
      description: "참여자가 무엇을 하는지, 누구를 찾는지 적어 주세요.",
    };
  if (step === 3)
    return {
      heading: "진행 방법을 정하세요",
      description: `${postingTypeLabels[type]}에 필요한 방식과 일정만 입력해요.`,
    };
  if (step === 4)
    return {
      heading: "모집 조건을 설정하세요",
      description: "보상, 인원, 마감일을 정해요.",
    };
  return {
    heading: "작성한 공고를 확인하세요",
    description: "게시하면 참여자가 공고를 볼 수 있어요.",
  };
}
function validateStep(
  step: CreationStep,
  draft: PostingCreationDraft,
): string | null {
  if (step === 1) return null;
  if (step === 2) {
    if (draft.title.trim().length < 2) return "제목을 2자 이상 입력해 주세요.";
    if (draft.description.trim().length < 10)
      return "공고 설명을 10자 이상 입력해 주세요.";
    if (draft.targetParticipant.trim().length < 10)
      return "찾는 참여자를 10자 이상 입력해 주세요.";
  }
  if (step === 3) {
    const duration = durationToMinutes(draft.durationValue, draft.durationUnit);
    if (draft.type !== "beta_test" && (duration < 10 || duration > 240))
      return "예상 시간은 10분에서 4시간 사이로 입력해 주세요.";
    if (
      draft.type === "interview" &&
      draft.interviewMode !== "online" &&
      (!draft.location.trim() ||
        draft.locationLatitude === null ||
        draft.locationLongitude === null)
    )
      return "대면 진행에는 지도에서 장소를 선택해 주세요.";
    if (draft.type === "survey") {
      if (
        !/^https:\/\/(docs\.google\.com|forms\.gle)\//.test(
          draft.externalUrl.trim(),
        )
      )
        return "Google Forms 참여 링크를 입력해 주세요.";
      if (!draft.externalDataNotice.trim())
        return "외부 설문 안내를 입력해 주세요.";
    }
    if (draft.type === "beta_test") {
      if (!draft.betaPlatforms.length)
        return "테스트 플랫폼을 하나 이상 선택해 주세요.";
      if (
        !isIsoDate(draft.betaStartsAt) ||
        !isIsoDate(draft.betaEndsAt) ||
        draft.betaStartsAt >= draft.betaEndsAt
      )
        return "테스트 시작일과 종료일을 확인해 주세요.";
    }
    if (draft.scheduleMode === "fixed" && !draft.fixedSlots.length)
      return "참여 가능한 날짜와 시간을 하나 이상 추가해 주세요.";
    if (draft.scheduleMode === "recurring" && !draft.recurringWindows.length)
      return "반복 가능한 시간대를 하나 이상 선택해 주세요.";
  }
  if (step === 4) {
    if (
      draft.recruitmentLimitMode === "limited" &&
      (!Number.isInteger(Number(draft.recruitmentCount)) ||
        Number(draft.recruitmentCount) < 1 ||
        Number(draft.recruitmentCount) > 999)
    )
      return "모집 인원은 1명 이상 입력해 주세요.";
    if (draft.deadlineEnabled && !isFutureIsoDate(draft.deadline))
      return "마감일은 오늘 이후 날짜로 입력해 주세요.";
    if (draft.type === "survey" && !draft.deadlineEnabled)
      return "설문조사에는 마감일이 필요해요.";
    for (const compensation of draft.compensations) {
      if (
        compensation.type === "cash" &&
        (!compensation.amount || compensation.amount <= 0)
      )
        return "현금 보상 금액을 입력해 주세요.";
      if (
        compensation.type === "points" &&
        (!compensation.points || compensation.points <= 0)
      )
        return "포인트를 입력해 주세요.";
      if (
        !["cash", "points", "none"].includes(compensation.type) &&
        !compensation.label?.trim()
      )
        return "보상 이름을 입력해 주세요.";
    }
  }
  return null;
}
function validateAll(
  draft: PostingCreationDraft,
): { step: CreationStep; message: string } | null {
  for (const step of [1, 2, 3, 4] as CreationStep[]) {
    const message = validateStep(step, draft);
    if (message) return { step, message };
  }
  return null;
}
function reviewMethodValues(
  draft: PostingCreationDraft,
  duration: string,
): Array<[string, string]> {
  const values: Array<[string, string]> = [
    [
      "방식",
      draft.type === "survey"
        ? "온라인 · 외부 설문"
        : draft.interviewMode === "offline"
          ? "대면"
          : draft.interviewMode === "both"
            ? "대면·화상"
            : "온라인",
    ],
  ];
  if (draft.type === "beta_test")
    values.push(
      ["테스트 기간", `${draft.betaStartsAt} ~ ${draft.betaEndsAt}`],
      ["플랫폼", draft.betaPlatforms.join(" · ")],
    );
  else values.push(["예상 시간", duration]);
  if (draft.type === "survey") values.push(["외부 서비스", "Google Forms"]);
  if (draft.scheduleMode === "fixed")
    values.push(["일정", draft.fixedSlots.join(" · ")]);
  if (draft.scheduleMode === "recurring")
    values.push(["가능 시간", draft.recurringWindows.join(" · ")]);
  if (draft.scheduleMode === "negotiated")
    values.push(["일정", "선정 후 채팅으로 조율"]);
  if (draft.location.trim()) values.push(["위치", draft.location]);
  return values;
}
function isIsoDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  );
}
function isFutureIsoDate(value: string) {
  return isIsoDate(value) && value >= new Date().toISOString().slice(0, 10);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(date: Date) {
  const dateLabel = formatDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dateLabel} ${hours}:${minutes}`;
}
