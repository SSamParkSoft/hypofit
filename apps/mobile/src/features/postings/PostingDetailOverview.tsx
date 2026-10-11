import type { ReactNode } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import type { InterviewPost } from "@hypofit/contracts";
import { getSurveyProviderLabel } from "@hypofit/contracts/survey-providers";
import {
  getPostingCompensationLabel,
  getPostingDurationLabel,
  getPostingModeLabel,
  getPostingRecruitmentLimitLabel,
  getPostingScheduleLabel,
  getPostingTypeLabel,
} from "@/features/postings/postingPresentation";
import { UserAvatar } from "@/shared/ui/UserAvatar";
import { betaPlatformLabel } from "./postingCreationMethod";
import { getParticipationGuideSteps } from "./postingParticipationGuide";
import { PostingImageGallery } from "./PostingImageGallery";
import { getPostingDetailStatus } from "./resolvePostingDetailCta";

type PostingDetailOverviewProps = {
  hideOpenStatus?: boolean;
  isOwner: boolean;
  post: InterviewPost;
  onRefreshImages: () => void;
};

export function PostingDetailOverview({
  hideOpenStatus = false,
  isOwner,
  post,
  onRefreshImages,
}: PostingDetailOverviewProps) {
  const { fontScale } = useWindowDimensions();
  return (
    // Recreate only read-only content when Dynamic Type changes; native text
    // otherwise retains stale measured bounds in the current development build.
    <View key={fontScale} className="pt-3">
      <PostingHero hideOpenStatus={hideOpenStatus} post={post} />
      <PostingImageGallery images={post.images} onRefresh={onRefreshImages} />
      <PostingSummary post={post} />
      <ParticipantRequirements post={post} />
      <PostingInformation post={post} />
      <RewardGuidance post={post} />
      {!isOwner ? <OrganizerInformation post={post} /> : null}
    </View>
  );
}

function OrganizerInformation({ post }: { post: InterviewPost }) {
  const founder = post.founder;
  const name = founder?.name?.trim() || null;
  const organization = founder?.organization_name?.trim() || null;
  const bio = founder?.bio?.trim() || null;
  const reviewCount = post.founder_review_summary?.review_count ?? 0;

  if (!founder || (!name && !organization && !bio)) return null;

  return (
    <View
      accessibilityLabel={`${name ?? organization ?? "모집자"}${organization && name ? `, ${organization}` : ""} 모집자 정보`}
      className="mt-8"
    >
      <View className="flex-row items-center gap-3">
        <OrganizerAvatar founder={founder} />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[12px] font-medium text-hypo-text-metadata">
            모집자
          </Text>
          <Text className="text-[15px] font-semibold leading-[22px] text-hypo-text">
            {name ?? organization}
          </Text>
          {organization && name ? (
            <Text className="text-[13px] leading-5 text-hypo-text-secondary">
              {organization}
            </Text>
          ) : null}
        </View>
      </View>
      {bio ? (
        <Text className="mt-3 text-[14px] leading-[21px] text-hypo-text-secondary">
          {bio}
        </Text>
      ) : null}
      {reviewCount > 0 ? (
        <Text className="mt-3 text-[12px] font-medium text-hypo-text-metadata">
          후기 {reviewCount}개
        </Text>
      ) : null}
    </View>
  );
}

function OrganizerAvatar({ founder }: { founder?: InterviewPost["founder"] }) {
  return (
    <UserAvatar
      iconSize={20}
      imageUrl={founder?.profile_image_url}
      name={founder?.name}
      sizeClassName="h-10 w-10"
    />
  );
}

function PostingHero({
  hideOpenStatus,
  post,
}: {
  hideOpenStatus: boolean;
  post: InterviewPost;
}) {
  const deadlineLabel = getDeadlineCountdown(post.participation_deadline_at);
  const status = getPostingDetailStatus(post);

  return (
    <View className="pb-6">
      <View className="flex-row flex-wrap items-center gap-x-2 gap-y-2">
        <Text className="text-[13px] font-semibold text-hypo-brand">
          {getPostingTypeLabel(post)}
        </Text>
        {hideOpenStatus && status === "open" ? null : (
          <PostingStatusLabel status={status} />
        )}
        {deadlineLabel && !(post.recruitment_type === "survey" && status !== "open") ? (
          <Text className="text-[12px] font-medium text-hypo-text-metadata">
            {deadlineLabel}
          </Text>
        ) : null}
      </View>
      <Text accessibilityRole="header" lineBreakStrategyIOS="hangul-word" className="mt-3 text-[24px] font-semibold leading-[32px] text-hypo-text">
        {post.title}
      </Text>
      <Text
        lineBreakStrategyIOS="hangul-word"
        className="mt-3 text-[15px] leading-[23px] text-hypo-text-secondary"
      >
        {post.service_summary}
      </Text>
    </View>
  );
}

function PostingStatusLabel({ status }: { status: InterviewPost["status"] }) {
  const { fontScale } = useWindowDimensions();
  return (
    <Text allowFontScaling={false} className="text-hypo-text-secondary" style={{ fontSize: 12 * fontScale, lineHeight: 20 * fontScale }}>
      {getPostingStatusLabel(status)}
    </Text>
  );
}

function PostingSummary({ post }: { post: InterviewPost }) {
  const { width, fontScale } = useWindowDimensions();
  const isBetaTest = post.recruitment_type === "beta_test";
  const duration = getPostingDurationLabel(post);
  const mode = getDetailModeLabel(post);
  const reward = getPostingCompensationLabel(post);
  // Full detail values must remain readable rather than squeeze into three columns.
  const stacked = width < 360 || fontScale > 1.2 || reward.length > 12 || mode.length > 12;

  return (
    <View className={`rounded-2xl bg-hypo-surface p-4 ${stacked ? "gap-4" : "flex-row items-start gap-3"}`}>
      <SummaryValue label="보상" value={reward} stacked={stacked} muted={reward === "보상 없음"} />
      {duration ? <SummaryValue label={isBetaTest ? "참여 기간" : "예상 시간"} value={duration} stacked={stacked} /> : null}
      <SummaryValue label={isBetaTest ? "테스트 플랫폼" : "진행 방식"} value={mode} stacked={stacked} />
    </View>
  );
}

function getDetailModeLabel(post: InterviewPost) {
  if (post.recruitment_type === "beta_test" && post.beta_test_platforms?.length) {
    return post.beta_test_platforms.map(betaPlatformLabel).join(" · ");
  }
  return getPostingModeLabel(post);
}

function SummaryValue({
  label,
  muted = false,
  stacked,
  value,
}: {
  label: string;
  muted?: boolean;
  stacked: boolean;
  value: string;
}) {
  return (
    <View accessible accessibilityLabel={`${label}, ${value}`} className={`min-w-0 gap-1 ${stacked ? "" : "flex-1 items-center"}`}>
      <Text className={`text-[16px] leading-6 ${stacked ? "" : "text-center"} ${muted ? "font-medium text-hypo-text-secondary" : "font-semibold text-hypo-text"}`}>{value}</Text>
      <Text className={`text-[12px] font-medium leading-[18px] text-hypo-text-metadata ${stacked ? "" : "text-center"}`}>{label}</Text>
    </View>
  );
}

function PostingInformation({ post }: { post: InterviewPost }) {
  const isSurvey = post.recruitment_type === "survey";
  const isInterview = !post.recruitment_type || post.recruitment_type === "interview";
  const isBetaTest = post.recruitment_type === "beta_test";
  const location = getDetailLocationLabel(post);
  const isResearch = post.recruitment_type === "research_experiment";
  const schedule = getPostingSchedule(post);

  return (
    <DetailSection title="공고 정보">
      <DetailLine
        label="참여 방식"
        value={isSurvey ? (post.entry_mode === "direct" ? "바로 참여" : "신청 후 승인") : "신청 후 선정"}
      />
      {!isSurvey ? <DetailLine label={isInterview || isResearch ? "일정" : "기간"} value={schedule} /> : null}
      {(isInterview || isResearch) && location ? <DetailLine label="위치" value={location} /> : null}
      {isResearch && post.schedule_note ? <DetailLine label="준비 사항 및 추가 안내" value={post.schedule_note} /> : null}
      {isBetaTest && post.beta_test_environment ? (
        <DetailLine label="필요 환경" value={post.beta_test_environment} />
      ) : null}
      {isBetaTest && post.beta_test_workflow_note ? (
        <DetailLine label="테스트 방법" value={post.beta_test_workflow_note} />
      ) : null}
      <DetailLine label="모집 인원" value={getPostingRecruitmentLimitLabel(post)} />
      {post.participation_deadline_at ? (
        <DetailLine label="모집 마감" value={formatDeadline(post.participation_deadline_at)} />
      ) : null}
      {isSurvey ? <DetailLine label="설문 종류" value={getSurveyProviderLabel(post.external_provider)} /> : null}
    </DetailSection>
  );
}

function ParticipantRequirements({ post }: { post: InterviewPost }) {
  const requirements = post.participant_requirements?.length
    ? post.participant_requirements
    : getRequirementLines(post.target_description);

  return (
    <DetailSection title="찾는 참여자">
      {requirements.length > 1 ? (
        requirements.map((requirement) => (
          <View key={requirement} className="flex-row items-start gap-2.5">
            <Text className="pt-0.5 text-[14px] leading-5 text-hypo-text-metadata">·</Text>
            <Text className="min-w-0 flex-1 text-[15px] leading-[23px] text-hypo-text-secondary">
              {requirement}
            </Text>
          </View>
        ))
      ) : (
        <Text className="text-[15px] leading-[23px] text-hypo-text-secondary">
          {post.target_description}
        </Text>
      )}
    </DetailSection>
  );
}

function RewardGuidance({ post }: { post: InterviewPost }) {
  const guidance = post.compensations
    ?.map((compensation) => compensation.description)
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  if (!guidance?.length) return null;

  return (
    <DetailSection title="보상 안내">
      {guidance.map((value) => (
        <Text key={value} className="text-[14px] leading-[21px] text-hypo-text-secondary">
          {value}
        </Text>
      ))}
    </DetailSection>
  );
}

export function PostingParticipationGuide({ post }: { post: InterviewPost }) {
  const { fontScale } = useWindowDimensions();
  const steps = getParticipationGuideSteps(post);
  if (!steps.length) return null;

  return (
    <View key={fontScale} className="mt-8 gap-4 rounded-2xl bg-hypo-surface p-5">
      <Text accessibilityRole="header" className="text-[21px] font-semibold leading-7 text-hypo-text">
        참여 과정
      </Text>
      <View className="gap-4">
        {steps.map((step, index) => (
          <View
            accessible
            accessibilityLabel={`${index + 1}. ${step}`}
            key={step}
            className="flex-row items-start gap-3"
          >
            <Text className="w-7 text-[13px] font-medium leading-[23px] text-hypo-brand">{String(index + 1).padStart(2, "0")}</Text>
            <Text className="min-w-0 flex-1 text-[15px] leading-[23px] text-hypo-text-secondary">
              {step}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View className="mt-8 gap-3">
      <Text accessibilityRole="header" className="text-[21px] font-semibold leading-7 text-hypo-text">{title}</Text>
      <View className="gap-4">{children}</View>
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  return (
    <View className={stacked ? "gap-1" : "flex-row items-start gap-4"}>
      <Text className={`${stacked ? "" : "w-[76px] pt-0.5"} text-[13px] font-medium leading-5 text-hypo-text-metadata`}>
        {label}
      </Text>
      <Text className={`min-w-0 ${stacked ? "" : "flex-1"} text-[15px] font-medium leading-[22px] text-hypo-text`}>
        {value}
      </Text>
    </View>
  );
}

function getRequirementLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^[•·\-✓\s]+/, "").trim())
    .filter(Boolean);
}

function getPostingSchedule(post: InterviewPost) {
  if (post.recruitment_type === "beta_test") {
    if (post.beta_test_starts_at && post.beta_test_ends_at) {
      return `${formatDate(post.beta_test_starts_at)} - ${formatDate(post.beta_test_ends_at)}`;
    }
    return post.beta_test_starts_at ? `${formatDate(post.beta_test_starts_at)}부터` : "모집자와 협의";
  }

  return getPostingScheduleLabel(post);
}

function getDetailLocationLabel(post: InterviewPost) {
  if (post.interview_mode === "online") return null;
  return post.location_place_name ?? post.location_text ?? post.location_address ?? post.location;
}

function getDeadlineCountdown(value?: string | null) {
  if (!value) return null;
  const deadline = new Date(value);
  const today = new Date();
  deadline.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const days = Math.ceil((deadline.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return "마감";
  if (days === 0) return "오늘 마감";
  return `D-${days}`;
}

function formatDeadline(value: string) {
  return `${formatDate(value)} 마감`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date(value));
}

function getPostingStatusLabel(status: InterviewPost["status"]) {
  const labels: Record<InterviewPost["status"], string> = {
    archived: "보관됨",
    closed: "모집 종료",
    completed: "완료",
    draft: "임시 저장",
    hidden: "비공개",
    open: "모집 중",
    removed: "삭제됨",
  };
  return labels[status];
}
