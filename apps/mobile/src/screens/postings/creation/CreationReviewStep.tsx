import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { formatCompensation, postingTypeLabels } from "@hypofit/contracts";
import { getSurveyProviderLabel } from "@hypofit/contracts/survey-providers";
import {
  requiresLocation,
  type CreationStep,
  type PostingCreationDraft,
} from "@/features/postings/postingCreationDraft";
import { betaPlatformLabel } from "@/features/postings/postingCreationMethod";
import { betaDurationUnits } from "./creationDurationOptions";

export function CreationReviewStep({
  draft,
  onEdit,
}: {
  draft: PostingCreationDraft;
  onEdit: (step: CreationStep) => void;
}) {
  const duration = `${draft.durationValue || "-"}${betaDurationUnits.find((unit) => unit.value === draft.durationUnit)?.label ?? "분"}`;
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
          ["이미지", draft.images?.length ? `${draft.images.length}장 · 첫 번째 이미지가 대표` : "없음"],
        ]}
      />
      {draft.images?.length ? <ScrollView horizontal contentContainerClassName="gap-3">
        {draft.images.map((image, index) => <Image key={image.localId} source={{ uri: image.localUri ?? image.url }}
          accessibilityLabel={image.altText || `공고 이미지 ${index + 1}`} resizeMode="contain" className="h-24 w-28 rounded-lg bg-hypo-surface" />)}
      </ScrollView> : null}
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

function reviewMethodValues(
  draft: PostingCreationDraft,
  duration: string,
): Array<[string, string]> {
  const usesSchedule = draft.type === "interview" || draft.type === "research_experiment";
  const values: Array<[string, string]> = [
    [
      "방식",
      draft.type === "survey"
        ? "외부 설문 링크"
        : draft.type === "beta_test" ? "온라인"
        : draft.interviewMode === "offline"
          ? "대면"
          : draft.interviewMode === "both"
            ? draft.type === "research_experiment" ? "대면·온라인" : "대면·화상"
            : draft.type === "interview" ? "화상" : "온라인",
    ],
  ];
  if (draft.type === "beta_test") {
    values.push(
      ["예상 참여 기간", duration],
      ["테스트 진행 날짜", `${draft.betaStartsAt} ~ ${draft.betaEndsAt}`],
      ["플랫폼", draft.betaPlatforms.map(betaPlatformLabel).join(" · ")],
    );
    if (draft.environment.trim()) values.push(["필요 환경", draft.environment]);
    if (draft.workflowNote.trim())
      values.push(["테스트 방법", draft.workflowNote]);
  } else values.push(["예상 시간", duration]);
  if (draft.type === "survey") {
    values.push(["설문 종류", getSurveyProviderLabel(draft.externalProvider)]);
    if (draft.externalDataNotice.trim())
      values.push(["참여 안내", draft.externalDataNotice]);
  }
  if (usesSchedule && draft.scheduleMode === "fixed")
    values.push(["일정", draft.fixedSlots.join(" · ")]);
  if (usesSchedule && draft.scheduleMode === "recurring")
    values.push(["가능 시간", draft.recurringWindows.join(" · ")]);
  if (usesSchedule && draft.scheduleMode === "negotiated")
    values.push(["일정", "선정 후 채팅으로 조율"]);
  if (usesSchedule && draft.scheduleNote.trim())
    values.push([draft.type === "research_experiment" ? "준비 사항 및 추가 안내" : "추가 안내", draft.scheduleNote]);
  if (requiresLocation(draft) && draft.location.trim()) values.push(["위치", draft.location]);
  return values;
}
