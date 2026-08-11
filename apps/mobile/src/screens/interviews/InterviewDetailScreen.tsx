import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import type { Application, ChatRoom, InterviewPost, Session } from "@hypofit/contracts";
import { formatRecruitCount, formatReward, getRoleLabel, interviewModeLabels } from "@hypofit/contracts";
import { useApplications } from "@/features/applications/useApplications";
import { useCreateApplication } from "@/features/applications/useApplicationMutations";
import { useChatRooms } from "@/features/chat/useChat";
import {
  useInterviewPostViews,
  useMarkInterviewPostViewed,
} from "@/features/interview-posts/useInterviewPostViews";
import { useInterviewPost } from "@/features/interview-posts/useInterviewPosts";
import { useSessions } from "@/features/sessions/useSessions";
import { formatAnswerLabel, formatSessionTime } from "@/features/workflow/readModels";
import { useAuth } from "@/features/auth/AuthProvider";
import { StateMessage } from "@/screens/home/HomeScreen";
import type { CreateApplicationInput } from "@/shared/api/applications";
import { formatFounderReviewSummary } from "@/shared/format/reviews";
import { getSafeReturnTo, goBackOrReplaceReturnTo } from "@/shared/navigation/backNavigation";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";

export function InterviewDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ postId?: string; apply?: string; returnTo?: string | string[] }>();
  const postId = Array.isArray(params.postId) ? params.postId[0] : params.postId;
  const shouldOpenApply = params.apply === "1";
  const explicitBackTo = getSafeReturnTo(params.returnTo);
  const backTo = explicitBackTo ?? "/(tabs)/interviews";
  const encodedBackTo = encodeURIComponent(String(backTo));
  const { accessToken, appUser } = useAuth();
  const { data: post, isError, isLoading } = useInterviewPost(postId, accessToken);
  const { data: applications = [] } = useApplications(accessToken);
  const { data: chatRooms = [] } = useChatRooms(accessToken);
  const { data: sessions = [] } = useSessions(accessToken);
  useInterviewPostViews(accessToken);
  const createApplication = useCreateApplication(accessToken);
  const markPostViewed = useMarkInterviewPostViewed(accessToken);

  const existingApplication = useMemo(
    () =>
      post
        ? applications.find((application) => application.interview_post_id === post.id) ?? null
        : null,
    [applications, post],
  );
  const existingSession = useMemo(
    () =>
      existingApplication
        ? sessions.find((session) => session.application_id === existingApplication.id) ?? null
        : null,
    [existingApplication, sessions],
  );
  const matchingChatRoom = useMemo(
    () =>
      existingApplication
        ? chatRooms.find((room) => room.application_id === existingApplication.id) ?? null
        : null,
    [chatRooms, existingApplication],
  );
  const isOwnPost = Boolean(appUser?.id && post?.founder_id === appUser.id);
  const shouldShowAppliedState = Boolean(existingApplication && !isOwnPost);
  const shouldShowPreApplyGuidance = Boolean(post && !existingApplication && !isOwnPost);

  useEffect(() => {
    if (post?.id && accessToken) {
      markPostViewed.mutate({ postId: post.id, source: "detail" });
    }
  }, [accessToken, post?.id]);

  return (
    <SafeAreaView className="flex-1 bg-hypo-bg">
      <View className="flex-1 px-4 pt-3">
        <View className="min-h-11 flex-row items-center gap-2">
          <Pressable
            accessibilityLabel="뒤로가기"
            accessibilityRole="button"
            hitSlop={12}
            className="h-10 w-10 items-center justify-center"
            onPress={() => goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/interviews")}
          >
            <Text className="text-[34px] font-semibold leading-9 text-hypo-text">‹</Text>
          </Pressable>
          <Text className="flex-1 text-lg font-black text-hypo-text">인터뷰 상세</Text>
          {post && !isOwnPost ? (
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              className="min-h-9 justify-center px-0.5"
              onPress={() =>
                router.push({
                  pathname: "/support/report",
                  params: {
                    category: "interview_post",
                    interview_title: post.title,
                    returnTo: `/interviews/${post.id}?returnTo=${encodedBackTo}`,
                    target_id: post.id,
                    target_type: "interview_post",
                  },
                })
              }
            >
              <Text className="text-xs font-black text-hypo-muted">신고하기</Text>
            </Pressable>
          ) : (
            <View className="w-14" />
          )}
        </View>

        {isLoading ? <StateMessage title="인터뷰를 불러오는 중입니다." loading /> : null}
        {isError ? (
          <StateMessage
            title="인터뷰를 불러오지 못했습니다."
            description="API 연결 상태를 확인한 뒤 다시 시도하세요."
          />
        ) : null}
        {!isLoading && !isError && !post ? (
          <StateMessage title="인터뷰를 찾을 수 없어요." description="모집글이 마감되었거나 삭제되었을 수 있어요." />
        ) : null}

        {post ? (
          <ScrollView
            contentContainerClassName="pt-2"
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 28, 40) }}
            showsVerticalScrollIndicator={false}
          >
            {shouldShowAppliedState && existingApplication ? (
              <ApplicationStatusSummary
                application={existingApplication}
                chatReturnTo={`/interviews/${post.id}?returnTo=${encodeURIComponent(String(backTo))}`}
                matchingChatRoom={matchingChatRoom}
                session={existingSession}
              />
            ) : null}

            <InterviewHero post={post} />

            {shouldShowAppliedState && existingApplication && existingSession ? (
              <ConfirmedSessionSection session={existingSession} />
            ) : null}

            {shouldShowAppliedState && existingApplication ? (
              <SubmittedApplicationSection application={existingApplication} />
            ) : null}

            <DetailSection title="인터뷰 조건">
              <DetailLine icon="calendar" label="일정" value={post.schedule_options.length ? post.schedule_options.join(" · ") : "모집자와 협의"} />
              <DetailLine icon="monitor" label="방식" value={interviewModeLabels[post.interview_mode]} />
              {getDetailLocationLabel(post) ? <DetailLine icon="map-pin" label="위치" value={getDetailLocationLabel(post) as string} /> : null}
              <DetailLine icon="users" label="모집 인원" value={formatRecruitCount(post.recruit_count)} />
              <DetailLine icon="clock" label="예상 시간" value={`${post.duration_minutes}분`} />
              <DetailLine icon="credit-card" label="사례비" value={formatReward(post.reward_amount)} highlighted />
            </DetailSection>

            <DetailSection title="찾는 사람">
              <Text className="text-sm font-bold leading-[22px] text-hypo-text">{post.target_description}</Text>
              {shouldShowPreApplyGuidance ? (
                <Text className="mt-2 text-xs font-bold leading-[19px] text-hypo-muted">
                  신청할 때 조건과 맞는 경험을 구체적으로 적으면 선정 가능성이 높아져요.
                </Text>
              ) : null}
            </DetailSection>

            <FounderInfoSection post={post} />

            <DetailSection title="모집자 안내">
              <View className="flex-row items-start gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-hypo-brandSoft">
                  <Feather color="#176B5D" name="message-circle" size={20} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-black text-hypo-text">선정되면 채팅에서 조율해요</Text>
                  <Text className="mt-1 text-xs font-bold leading-[19px] text-hypo-muted">
                    지금은 모집글에 적힌 조건을 기준으로 신청해요. 모집자가 신청을 확인한 뒤 일정과 진행 방식을 채팅에서 정해요.
                  </Text>
                </View>
              </View>
            </DetailSection>

            {shouldShowPreApplyGuidance ? (
              <DetailSection title="신청 전 확인">
                <GuidanceLine text="관련 경험과 참여 가능한 시간을 함께 적어주세요." />
                <GuidanceLine text="선정되면 채팅에서 세부 일정과 진행 방식을 조율해요." />
                <GuidanceLine text="개인정보나 부적절한 요청을 받으면 신고할 수 있어요." />
              </DetailSection>
            ) : null}

            <DetailApplicationSection
              canApply={Boolean(accessToken)}
              currentUserId={appUser?.id}
              errorMessage={
                createApplication.error instanceof Error ? createApplication.error.message : null
              }
              existingApplication={existingApplication}
              initialApplyOpen={shouldOpenApply}
              isApplying={createApplication.isPending}
              parentReturnTo={String(backTo)}
              post={post}
              onApply={(input) => createApplication.mutate(input)}
            />
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function DetailChip({ label, tone = "muted" }: { label: string; tone?: "brand" | "muted" }) {
  return (
    <View className={`rounded-full px-2.5 py-1.5 ${tone === "brand" ? "bg-[#E4F1E7]" : "bg-hypo-bg"}`}>
      <Text className={`text-xs font-black ${tone === "brand" ? "text-hypo-brand" : "text-hypo-muted"}`}>{label}</Text>
    </View>
  );
}

function InterviewHero({ post }: { post: InterviewPost }) {
  return (
    <View className="border-b border-hypo-border pb-5 pt-3">
      <View className="flex-row flex-wrap gap-2">
        <DetailChip label={interviewModeLabels[post.interview_mode]} tone="brand" />
        <DetailChip label={post.status === "open" ? "모집 중" : "마감"} />
      </View>

      <Text className="mt-4 text-[24px] font-black leading-[32px] text-hypo-text">{post.title}</Text>
      <Text className="mt-2 text-sm font-bold leading-[22px] text-hypo-muted">{post.service_summary}</Text>

      <View className="mt-4 flex-row flex-wrap gap-2">
        <HeroMetaPill label={formatReward(post.reward_amount)} tone="brand" />
        <HeroMetaPill label={formatRecruitCount(post.recruit_count)} />
        <HeroMetaPill label={`${post.duration_minutes}분`} />
        <HeroMetaPill label={interviewModeLabels[post.interview_mode]} />
      </View>
    </View>
  );
}

function HeroMetaPill({ label, tone = "muted" }: { label: string; tone?: "brand" | "muted" }) {
  return (
    <View className={`rounded-full px-3 py-1.5 ${tone === "brand" ? "bg-hypo-brandSoft" : "bg-hypo-surface"}`}>
      <Text className={`text-xs font-black ${tone === "brand" ? "text-hypo-brand" : "text-hypo-muted"}`}>{label}</Text>
    </View>
  );
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <View className="border-b border-hypo-border py-4">
      <Text className="text-[15px] font-black text-hypo-text">{title}</Text>
      <View className="mt-3 gap-2.5">{children}</View>
    </View>
  );
}

function FounderInfoSection({ post }: { post: InterviewPost }) {
  const founder = post.founder;
  const founderName = founder?.name?.trim() || "모집자";
  const founderRole = founder?.role ? getRoleLabel(founder.role) : "창업자";
  const founderBio = founder?.bio || "인터뷰를 만든 모집자입니다.";
  const reviewSummary = formatFounderReviewSummary(post.founder_review_summary);

  return (
    <DetailSection title="모집자 정보">
      <View className="flex-row items-start gap-3">
        <FounderAvatar founder={founder} />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text numberOfLines={1} className="min-w-0 flex-1 text-sm font-black text-hypo-text">
              {founderName}
            </Text>
            <View className="shrink-0 rounded-full bg-hypo-brandSoft px-2.5 py-1">
              <Text className="text-[11px] font-black text-hypo-brand">{founderRole}</Text>
            </View>
          </View>
          {reviewSummary ? (
            <Text className="mt-1 text-xs font-black leading-[18px] text-hypo-brand">{reviewSummary}</Text>
          ) : null}
          <Text className="mt-1.5 text-xs font-bold leading-[19px] text-hypo-muted">{founderBio}</Text>
        </View>
      </View>
    </DetailSection>
  );
}

function FounderAvatar({ founder }: { founder?: InterviewPost["founder"] }) {
  if (founder?.profile_image_url) {
    return (
      <View className="h-11 w-11 overflow-hidden rounded-full border border-hypo-border bg-hypo-brandSoft">
        <Image
          accessibilityLabel={`${founder.name} 프로필 사진`}
          className="h-full w-full"
          resizeMode="cover"
          source={{ uri: founder.profile_image_url }}
        />
      </View>
    );
  }

  return (
    <View className="h-11 w-11 items-center justify-center rounded-full border border-hypo-border bg-hypo-brandSoft">
      <Feather color="#176B5D" name="user" size={18} />
    </View>
  );
}

function ApplicationStatusSummary({
  application,
  chatReturnTo,
  matchingChatRoom,
  session,
}: {
  application: Application;
  chatReturnTo: string;
  matchingChatRoom?: ChatRoom | null;
  session?: Session | null;
}) {
  const applicationDisplay = getApplicationDetailDisplay(application, session);

  return (
    <View className="mb-2 rounded-[16px] bg-hypo-brandSoft px-4 py-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-black leading-[22px] text-hypo-text">{applicationDisplay.title}</Text>
          <Text className="mt-1 text-xs font-bold leading-[19px] text-hypo-muted">{applicationDisplay.description}</Text>
        </View>
        <View className="rounded-full bg-white/70 px-2.5 py-1.5">
          <Text className={`text-xs font-black ${applicationDisplay.tone === "brand" ? "text-hypo-brand" : "text-hypo-muted"}`}>
            {applicationDisplay.label}
          </Text>
        </View>
      </View>

      <PrimaryButton
        className="mt-4 min-h-[46px] rounded-[13px]"
        disabled={!matchingChatRoom}
        onPress={() => {
          if (!matchingChatRoom) return;
          router.push({
            pathname: "/(tabs)/chat/[roomId]",
            params: { roomId: matchingChatRoom.id, returnTo: chatReturnTo },
          });
        }}
      >
        {matchingChatRoom ? "채팅 보기" : "채팅방을 준비 중이에요"}
      </PrimaryButton>
    </View>
  );
}

function ConfirmedSessionSection({ session }: { session: Session }) {
  return (
    <DetailSection title="확정된 일정">
      <DetailLine icon="calendar" label="일정" value={formatSessionTime(session.scheduled_at)} highlighted />
      <DetailLine icon="monitor" label="방식" value={session.meeting_type === "online" ? "화상" : "대면"} />
      {session.meeting_url ? <DetailLine icon="link" label="참여 링크" value={session.meeting_url} /> : null}
      {session.place ? <DetailLine icon="map-pin" label="장소" value={session.place} /> : null}
    </DetailSection>
  );
}

function SubmittedApplicationSection({ application }: { application: Application }) {
  const submittedAnswers = Object.entries(application.answers);

  if (!submittedAnswers.length && !application.available_times.length && !application.rejection_reason) {
    return null;
  }

  return (
    <DetailSection title="내가 제출한 내용">
      {submittedAnswers.map(([key, value]) => (
        <DetailTextValue key={key} label={formatAnswerLabel(key)} value={value} />
      ))}

      {application.available_times.length ? (
        <View className="gap-2">
          <Text className="text-xs font-black text-[#7D877A]">가능 시간</Text>
          <View className="flex-row flex-wrap gap-2">
            {application.available_times.map((time) => (
              <View key={time} className="rounded-full bg-hypo-surface px-3 py-1.5">
                <Text className="text-xs font-extrabold text-hypo-muted">{time}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {application.rejection_reason ? (
        <View className="rounded-[12px] bg-hypo-dangerSoft px-3 py-2.5">
          <Text className="text-xs font-black text-hypo-danger">반려 사유</Text>
          <Text className="mt-1 text-xs font-extrabold leading-[18px] text-hypo-danger">{application.rejection_reason}</Text>
        </View>
      ) : null}
    </DetailSection>
  );
}

function DetailTextValue({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-black text-[#7D877A]">{label}</Text>
      <Text className="text-sm font-bold leading-[21px] text-hypo-text">{value}</Text>
    </View>
  );
}

function DetailLine({
  highlighted,
  icon,
  label,
  value,
}: {
  highlighted?: boolean;
  icon: ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center gap-2.5">
      <View className="h-8 w-8 items-center justify-center rounded-full bg-hypo-surface">
        <Feather color={highlighted ? "#176B5D" : "#7D877A"} name={icon} size={15} />
      </View>
      <Text className="w-[58px] text-xs font-black text-[#7D877A]">{label}</Text>
      <Text numberOfLines={2} className={`min-w-0 flex-1 text-sm font-extrabold leading-5 ${highlighted ? "text-[#087C43]" : "text-hypo-text"}`}>
        {value}
      </Text>
    </View>
  );
}

function GuidanceLine({ text }: { text: string }) {
  return (
    <View className="flex-row items-start gap-2">
      <Feather color="#176B5D" name="check" size={15} />
      <Text className="min-w-0 flex-1 text-xs font-bold leading-[19px] text-hypo-muted">{text}</Text>
    </View>
  );
}

function DetailApplicationSection({
  canApply,
  currentUserId,
  errorMessage,
  existingApplication,
  initialApplyOpen,
  isApplying,
  onApply,
  parentReturnTo,
  post,
}: {
  canApply: boolean;
  currentUserId?: string | null;
  errorMessage?: string | null;
  existingApplication?: Application | null;
  initialApplyOpen: boolean;
  isApplying?: boolean;
  parentReturnTo: string;
  onApply: (input: CreateApplicationInput) => void;
  post: InterviewPost;
}) {
  const [isApplyFormOpen, setIsApplyFormOpen] = useState(initialApplyOpen);
  const [experienceAnswer, setExperienceAnswer] = useState("");
  const [availableTimes, setAvailableTimes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const isOwnPost = Boolean(currentUserId && post.founder_id === currentUserId);
  const loginRoute = {
    pathname: "/(auth)/login",
    params: { returnTo: `/interviews/${post.id}?apply=1&returnTo=${encodeURIComponent(parentReturnTo)}` },
  } as const;

  const submitApplication = () => {
    if (!canApply) {
      router.push(loginRoute);
      return;
    }
    if (isOwnPost) {
      router.push({
        pathname: "/(tabs)/interviews/my-interviews",
        params: { returnTo: `/interviews/${post.id}?returnTo=${encodeURIComponent(parentReturnTo)}` },
      });
      return;
    }

    const nextExperience = experienceAnswer.trim();
    const nextAvailableTimes = availableTimes
      .split(/\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (!nextExperience) {
      setValidationError("조건과 맞는 경험을 적어주세요.");
      return;
    }

    if (!nextAvailableTimes.length) {
      setValidationError("참여 가능한 시간을 한 개 이상 적어주세요.");
      return;
    }

    setValidationError(null);
    onApply({
      interview_post_id: post.id,
      answers: { experience: nextExperience },
      available_times: nextAvailableTimes,
    });
  };

  return (
    <View>
      {isOwnPost ? null : existingApplication ? null : !isApplyFormOpen ? (
        <PrimaryButton onPress={() => (canApply ? setIsApplyFormOpen(true) : router.push(loginRoute))}>
          {canApply ? "신청하기" : "로그인 후 신청"}
        </PrimaryButton>
      ) : (
        <View className="gap-3">
          <DetailTextArea
            label="관련 경험"
            placeholder="조건과 맞는 경험을 적어주세요."
            value={experienceAnswer}
            onChangeText={setExperienceAnswer}
          />
          <DetailTextArea
            label="가능 시간"
            placeholder="예: 평일 20시 이후"
            value={availableTimes}
            onChangeText={setAvailableTimes}
          />
          {validationError || errorMessage ? (
            <Text className="text-xs font-extrabold leading-[18px] text-hypo-danger">{validationError ?? errorMessage}</Text>
          ) : null}
          <View className="flex-row gap-2">
            <PrimaryButton
              className="flex-1"
              variant="secondary"
              onPress={() => {
                setIsApplyFormOpen(false);
                setValidationError(null);
              }}
            >
              취소
            </PrimaryButton>
            <PrimaryButton className="flex-1" disabled={isApplying} onPress={submitApplication}>
              {isApplying ? "신청 중" : "신청하기"}
            </PrimaryButton>
          </View>
        </View>
      )}
    </View>
  );
}

function getApplicationDetailDisplay(application: Application, session?: Session | null) {
  if (session?.status === "completed" || application.status === "completed") {
    return {
      description: "인터뷰가 완료됐어요.",
      label: "완료",
      title: "인터뷰 완료",
      tone: "muted" as const,
    };
  }

  if (session?.status === "no_show" || application.status === "no_show") {
    return {
      description: "참여 이력이 불참으로 기록됐어요.",
      label: "불참",
      title: "불참 처리",
      tone: "muted" as const,
    };
  }

  if (session?.status === "canceled" || application.status === "canceled") {
    return {
      description: "신청이 취소됐어요.",
      label: "취소",
      title: "신청 취소",
      tone: "muted" as const,
    };
  }

  if (application.status === "rejected") {
    return {
      description: "이번 인터뷰 대상자로 선정되지 않았어요.",
      label: "반려",
      title: "신청 반려",
      tone: "muted" as const,
    };
  }

  if (session || application.status === "selected") {
    return {
      description: session ? "확정된 일정을 확인하고 채팅에서 필요한 내용을 이어가세요." : "선정됐어요. 채팅에서 일정과 진행 방식을 조율하세요.",
      label: "선정",
      title: "인터뷰 대상자로 선정됐어요",
      tone: "brand" as const,
    };
  }

  return {
    description: "모집자가 신청 내용을 확인하고 있어요. 필요한 이야기는 채팅에서 이어갈 수 있어요.",
    label: "신청",
    title: "신청이 접수됐어요",
    tone: "brand" as const,
  };
}

function DetailTextArea({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-black text-hypo-text">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        multiline
        placeholder={placeholder}
        placeholderTextColor="#9AA399"
        className="min-h-[92px] rounded-xl border border-hypo-border bg-hypo-bg px-3 py-2.5 text-sm font-bold leading-5 text-hypo-text"
        textAlignVertical="top"
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

function getDetailLocationLabel(post: {
  interview_mode: string;
  location: string | null;
  location_address: string | null;
  location_place_name: string | null;
  location_text: string | null;
}) {
  if (post.interview_mode === "online") {
    return null;
  }

  return post.location_place_name ?? post.location_text ?? post.location_address ?? post.location;
}
