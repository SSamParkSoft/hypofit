import type { ReactNode } from "react";
import { Text, View } from "react-native";
import type { InterviewPost } from "@hypofit/contracts";
import {
  getPostingCompensationLabel,
  getPostingDurationLabel,
  getPostingModeLabel,
  getPostingRecruitmentLimitLabel,
  getPostingScheduleLabel,
  getPostingTypeLabel,
} from "@/shared/format/postings";
import { UserAvatar } from "@/shared/ui/UserAvatar";

type PostingDetailOverviewProps = {
  hideOpenStatus?: boolean;
  isOwner: boolean;
  post: InterviewPost;
};

export function PostingDetailOverview({
  hideOpenStatus = false,
  isOwner,
  post,
}: PostingDetailOverviewProps) {
  return (
    <View className="gap-8 py-5">
      <PostingHero hideOpenStatus={hideOpenStatus} post={post} />
      <PostingSummary post={post} />
      <ParticipantRequirements post={post} />
      <ParticipationFlow post={post} />
      <PostingInformation post={post} />
      <RewardGuidance post={post} />
      {!isOwner ? <RecruiterCard post={post} /> : null}
    </View>
  );
}

function RecruiterCard({ post }: { post: InterviewPost }) {
  const founder = post.founder;
  const name = founder?.name?.trim() || null;
  const organization = founder?.organization_name?.trim() || null;
  const bio = founder?.bio?.trim() || null;
  const reviewCount = post.founder_review_summary?.review_count ?? 0;

  if (!founder || (!name && !organization && !bio)) return null;

  return (
    <View
      accessibilityLabel={`${name ?? organization ?? "모집자"}${organization && name ? `, ${organization}` : ""} 모집자 정보`}
      className="rounded-[14px] border border-hypo-border bg-hypo-surface px-4 py-3.5"
    >
      <View className="flex-row items-center gap-3">
        <FounderAvatar founder={founder} />
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[12px] font-medium text-hypo-text-metadata">
            모집자
          </Text>
          <Text numberOfLines={1} className="text-[16px] font-semibold text-hypo-text">
            {name ?? organization}
          </Text>
          {organization ? (
            <Text numberOfLines={1} className="text-[13px] leading-5 text-hypo-text-secondary">
              {organization}
            </Text>
          ) : null}
        </View>
      </View>
      {bio ? (
        <Text numberOfLines={2} className="mt-3 text-[13px] leading-5 text-hypo-text-secondary">
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

function FounderAvatar({ founder }: { founder?: InterviewPost["founder"] }) {
  return (
    <UserAvatar
      iconSize={20}
      imageUrl={founder?.profile_image_url}
      name={founder?.name}
      sizeClassName="h-12 w-12"
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

  return (
    <View>
      <View className="flex-row flex-wrap items-center gap-x-2 gap-y-2">
        <Text className="text-[13px] font-semibold text-hypo-brand">
          {getPostingTypeLabel(post)}
        </Text>
        <Text className="text-[13px] text-hypo-text-secondary">·</Text>
        <Text className="text-[13px] font-medium text-hypo-text-secondary">
          {getPostingModeLabel(post)}
        </Text>
        {hideOpenStatus && post.status === "open" ? null : (
          <PostingStatusBadge status={post.status} />
        )}
        {deadlineLabel ? (
          <Text className="text-[12px] font-medium text-hypo-text-metadata">
            {deadlineLabel}
          </Text>
        ) : null}
      </View>
      <Text className="mt-3 text-[26px] font-bold leading-[34px] text-hypo-text">
        {post.title}
      </Text>
      <Text
        lineBreakStrategyIOS="hangul-word"
        className="mt-2 text-[15px] leading-[23px] text-hypo-text-secondary"
      >
        {post.service_summary}
      </Text>
    </View>
  );
}

function PostingStatusBadge({ status }: { status: InterviewPost["status"] }) {
  const isOpen = status === "open";
  return (
    <View className={`rounded-full px-2 py-0.5 ${isOpen ? "bg-hypo-brandSoft" : "bg-hypo-surfaceMuted"}`}>
      <Text className={`text-[11px] font-medium leading-4 ${isOpen ? "text-hypo-brand" : "text-hypo-muted"}`}>
        {getPostingStatusLabel(status)}
      </Text>
    </View>
  );
}

function PostingSummary({ post }: { post: InterviewPost }) {
  const duration = getPostingDurationLabel(post);
  const mode = getPostingModeLabel(post);
  const reward = getPostingCompensationLabel(post);

  if (!duration) {
    return null;
  }

  return (
    <View className="flex-row overflow-hidden rounded-[14px] border border-hypo-border bg-hypo-surface">
      <SummaryValue label="예상 시간" value={duration} />
      <SummaryValue bordered label="진행 방식" value={mode} />
      <SummaryValue bordered emphasized label="보상" value={reward} />
    </View>
  );
}

function SummaryValue({
  bordered = false,
  emphasized = false,
  label,
  value,
}: {
  bordered?: boolean;
  emphasized?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View className={`min-w-0 flex-1 items-center px-2 py-[11px] ${bordered ? "border-l border-hypo-border" : ""}`}>
      <Text numberOfLines={2} className={`text-center text-[14px] font-semibold leading-5 ${emphasized ? "text-hypo-brand" : "text-hypo-text"}`}>
        {value}
      </Text>
      <Text className="mt-1 text-[11px] font-medium leading-4 text-hypo-text-secondary">{label}</Text>
    </View>
  );
}

function PostingInformation({ post }: { post: InterviewPost }) {
  const isSurvey = post.recruitment_type === "survey";
  const isInterview = !post.recruitment_type || post.recruitment_type === "interview";
  const isBetaTest = post.recruitment_type === "beta_test";
  const location = getDetailLocationLabel(post);
  const schedule = getPostingSchedule(post);
  const provider = post.external_provider === "google_forms" ? "Google Forms" : null;

  return (
    <DetailSection title="공고 정보">
      {!isSurvey ? <DetailLine label={isInterview ? "일정" : "기간"} value={schedule} /> : null}
      {isInterview && location ? <DetailLine label="위치" value={location} /> : null}
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
      {provider ? <DetailLine label="진행 도구" value={provider} /> : null}
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
            <Text className="pt-0.5 text-[14px] font-semibold leading-5 text-hypo-brand">•</Text>
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

function ParticipationFlow({ post }: { post: InterviewPost }) {
  const steps = getParticipationSteps(post);
  if (!steps.length) return null;

  return (
    <DetailSection title="참여 과정">
      {steps.map((step, index) => (
        <View key={step} className="flex-row items-start gap-3">
          <View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-hypo-brandSoft">
            <Text className="text-[11px] font-semibold text-hypo-brand">{index + 1}</Text>
          </View>
          <Text className="min-w-0 flex-1 text-[14px] font-medium leading-5 text-hypo-text-secondary">
            {step}
          </Text>
        </View>
      ))}
    </DetailSection>
  );
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View className="gap-4">
      <Text className="text-[16px] font-semibold text-hypo-text">{title}</Text>
      <View className="gap-3.5">{children}</View>
    </View>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start gap-4">
      <Text className="w-[68px] pt-0.5 text-[13px] font-medium leading-5 text-hypo-text-secondary">
        {label}
      </Text>
      <Text className="min-w-0 flex-1 text-[15px] font-medium leading-[22px] text-hypo-text">
        {value}
      </Text>
    </View>
  );
}

function getParticipationSteps(post: InterviewPost): string[] {
  switch (post.recruitment_type ?? "interview") {
    case "survey":
      return post.entry_mode === "direct"
        ? ["외부 설문을 열어 바로 참여해요.", "설문을 작성한 뒤 제출 완료를 알려요.", "필요한 경우 모집자가 참여를 확인해요."]
        : ["공고에 신청해요.", "모집자가 신청 내용을 확인해요.", "승인되면 외부 설문 링크가 열려요.", "설문을 작성한 뒤 제출 완료를 알려요."];
    case "beta_test":
      return ["공고에 신청해요.", "모집자가 신청 내용을 확인해요.", "선정되면 채팅에서 테스트 안내를 받아요.", "안내받은 범위에서 테스트를 진행해요."];
    case "interview":
      return ["공고에 신청해요.", "모집자가 신청 내용을 확인해요.", "선정되면 채팅에서 일정을 조율해요.", "확정된 일정에 참여해요."];
    default:
      return ["공고에 신청해요.", "모집자가 신청 내용을 확인해요.", "필요한 다음 단계를 안내받아요."];
  }
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
