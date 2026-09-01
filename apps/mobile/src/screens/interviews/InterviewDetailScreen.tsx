import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import type {
  Application,
  ChatRoom,
  InterviewPost,
  Session,
  SurveyParticipation,
  SurveyParticipationAction,
} from "@hypofit/contracts";
import { formatRecruitCount } from "@hypofit/contracts";
import { useApplications } from "@/features/applications/useApplications";
import { useCreateApplication } from "@/features/applications/useApplicationMutations";
import { useChatRooms } from "@/features/chat/useChat";
import {
  useInterviewPostViews,
  useMarkInterviewPostViewed,
} from "@/features/interview-posts/useInterviewPostViews";
import {
  resolvePostingDetailCta,
  type PostingDetailCta,
} from "@/features/interview-posts/resolvePostingDetailCta";
import { useInterviewPost } from "@/features/interview-posts/useInterviewPosts";
import { useSessions } from "@/features/sessions/useSessions";
import {
  useSurveyParticipation,
  useSurveyParticipationMutations,
} from "@/features/surveys/useSurveyParticipation";
import {
  formatAnswerLabel,
  formatSessionTime,
} from "@/features/workflow/readModels";
import { useAuth } from "@/features/auth/AuthProvider";
import { StateMessage } from "@/screens/home/HomeScreen";
import type { CreateApplicationInput } from "@/shared/api/applications";
import {
  getPostingCompensationLabel,
  getPostingDurationLabel,
  getPostingModeLabel,
  getPostingTypeLabel,
} from "@/shared/format/postings";
import {
  getSafeReturnTo,
  goBackOrReplaceReturnTo,
} from "@/shared/navigation/backNavigation";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";

type DetailBottomAction = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

const detailStickyActionHeight = 64;

export function InterviewDetailScreen() {
  const insets = useSafeAreaInsets();
  const detailScrollRef = useRef<ScrollView>(null);
  const params = useLocalSearchParams<{
    postId?: string;
    apply?: string;
    returnTo?: string | string[];
  }>();
  const postId = Array.isArray(params.postId)
    ? params.postId[0]
    : params.postId;
  const shouldOpenApply = params.apply === "1";
  const explicitBackTo = getSafeReturnTo(params.returnTo);
  const backTo = explicitBackTo ?? "/(tabs)/interviews";
  const encodedBackTo = encodeURIComponent(String(backTo));
  const { accessToken, appUser } = useAuth();
  const [isApplyFormOpen, setIsApplyFormOpen] = useState(shouldOpenApply);
  const {
    data: post,
    isError,
    isLoading,
  } = useInterviewPost(postId, accessToken);
  const { data: applications = [] } = useApplications(accessToken);
  const { data: chatRooms = [] } = useChatRooms(accessToken);
  const { data: sessions = [] } = useSessions(accessToken);
  useInterviewPostViews(accessToken);
  const createApplication = useCreateApplication(accessToken);
  const markPostViewed = useMarkInterviewPostViewed(accessToken);
  const isSurvey = post?.recruitment_type === "survey";
  const requiresApplication = Boolean(
    post && (!isSurvey || post.entry_mode !== "direct"),
  );
  const isInterview =
    !post?.recruitment_type || post.recruitment_type === "interview";
  const surveyParticipation = useSurveyParticipation(
    isSurvey ? post?.id : null,
    accessToken,
  );
  const surveyParticipationMutations = useSurveyParticipationMutations(
    post?.id ?? "",
    accessToken,
  );

  const existingApplication = useMemo(
    () =>
      post
        ? (applications.find(
            (application) => application.interview_post_id === post.id,
          ) ?? null)
        : null,
    [applications, post],
  );
  const existingSession = useMemo(
    () =>
      existingApplication && isInterview
        ? (sessions.find(
            (session) => session.application_id === existingApplication.id,
          ) ?? null)
        : null,
    [existingApplication, sessions],
  );
  const matchingChatRoom = useMemo(
    () =>
      existingApplication
        ? (chatRooms.find(
            (room) => room.application_id === existingApplication.id,
          ) ?? null)
        : null,
    [chatRooms, existingApplication],
  );
  const isOwnPost = Boolean(appUser?.id && post?.founder_id === appUser.id);
  const shouldShowAppliedState = Boolean(
    requiresApplication && existingApplication && !isOwnPost,
  );
  const isSelectedParticipant = Boolean(
    shouldShowAppliedState && existingApplication?.status === "selected",
  );
  const participationMethod = post ? getParticipationMethodContent(post) : null;

  const openApplicationForm = () => {
    setIsApplyFormOpen(true);
    requestAnimationFrame(() => {
      detailScrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  const openExternalSurvey = async () => {
    if (!post) {
      return;
    }

    if (!accessToken) {
      router.push({
        pathname: "/(auth)/login",
        params: {
          returnTo: `/interviews/${post.id}?returnTo=${encodeURIComponent(String(backTo))}`,
        },
      });
      return;
    }

    try {
      const action = await surveyParticipationMutations.open.mutateAsync();
      await WebBrowser.openBrowserAsync(action.external_url);
    } catch {
      Alert.alert(
        "설문을 열지 못했어요",
        "잠시 후 다시 시도해 주세요.",
      );
    }
  };

  const resolvedCta = post
    ? resolvePostingDetailCta({
        accessToken,
        application: existingApplication,
        chatRoom: matchingChatRoom,
        isApplicationFormOpen: isApplyFormOpen,
        isOwner: isOwnPost,
        post,
        surveyParticipation: surveyParticipation.data ?? null,
      })
    : null;
  const bottomAction = toBottomAction(resolvedCta, {
    backTo: String(backTo),
    openApplicationForm,
    openExternalSurvey,
    post,
    room: matchingChatRoom,
  });

  useEffect(() => {
    if (post?.id && accessToken) {
      markPostViewed.mutate({ postId: post.id, source: "detail" });
    }
  }, [accessToken, post?.id]);

  useEffect(() => {
    if (!shouldOpenApply || !post?.id) {
      return;
    }

    setIsApplyFormOpen(true);
    requestAnimationFrame(() => {
      detailScrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [post?.id, shouldOpenApply]);

  useEffect(() => {
    if (!postId || shouldOpenApply) {
      return;
    }

    requestAnimationFrame(() => {
      detailScrollRef.current?.scrollTo({ animated: false, y: 0 });
    });
  }, [postId, shouldOpenApply]);

  return (
    <SafeAreaView
      className="flex-1 bg-hypo-bg"
      edges={["top", "left", "right"]}
    >
      <View className="flex-1">
        <View className="px-4 pt-3">
          <View className="min-h-11 flex-row items-center gap-2">
            <Pressable
              accessibilityLabel="뒤로가기"
              accessibilityRole="button"
              hitSlop={12}
              className="h-10 w-10 items-center justify-center"
              onPress={() =>
                goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/interviews")
              }
            >
              <Text className="text-[34px] font-semibold leading-9 text-hypo-text">
                ‹
              </Text>
            </Pressable>
            <Text className="flex-1 text-lg font-bold text-hypo-text">
              공고 상세
            </Text>
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
              <Text className="text-xs font-medium text-hypo-muted">
                신고하기
              </Text>
              </Pressable>
            ) : (
              <View className="w-14" />
            )}
          </View>
        </View>

        {isLoading ? (
          <StateMessage title="공고를 불러오는 중이에요." loading />
        ) : null}
        {isError ? (
          <StateMessage
            title="공고를 불러오지 못했어요."
            description="잠시 후 다시 시도해 주세요."
          />
        ) : null}
        {!isLoading && !isError && !post ? (
          <StateMessage
            title="공고를 찾을 수 없어요."
            description="공고가 마감되었거나 삭제되었을 수 있어요."
          />
        ) : null}

        {post ? (
          <ScrollView
            ref={detailScrollRef}
            className="flex-1 px-4"
            contentContainerClassName="pt-2"
            contentContainerStyle={{
              paddingBottom: bottomAction
                ? detailStickyActionHeight + Math.max(insets.bottom, 16) + 28
                : Math.max(insets.bottom + 24, 32),
            }}
            showsVerticalScrollIndicator={false}
          >
            {shouldShowAppliedState && existingApplication ? (
              <ApplicationStatusSummary
                application={existingApplication}
                chatReturnTo={`/interviews/${post.id}?returnTo=${encodeURIComponent(String(backTo))}`}
                matchingChatRoom={matchingChatRoom}
                recruitmentType={post.recruitment_type ?? "interview"}
                session={existingSession}
                showChatAction={post.recruitment_type !== "survey" && !matchingChatRoom}
              />
            ) : null}

            <InterviewHero
              hideOpenStatus={isSelectedParticipant}
              post={post}
            />

            {shouldShowAppliedState &&
            existingApplication &&
            existingSession ? (
              <ConfirmedSessionSection session={existingSession} />
            ) : null}

            {shouldShowAppliedState && existingApplication ? (
              <SubmittedApplicationSection application={existingApplication} />
            ) : null}

            <DetailSection title="공고 정보">
              {isSurvey ? (
                <>
                  {post.participation_deadline_at ? (
                    <DetailLine
                      label="마감"
                      value={formatParticipationDeadline(
                        post.participation_deadline_at,
                      )}
                    />
                  ) : null}
                  <DetailLine label="방식" value="온라인 · 외부 설문" />
                </>
              ) : (
                <>
                  <DetailLine
                    label={isInterview ? "일정" : "기간"}
                    value={getPostingSchedule(post)}
                  />
                  <DetailLine label="방식" value={getPostingModeLabel(post)} />
                  {isInterview && getDetailLocationLabel(post) ? (
                    <DetailLine
                      label="위치"
                      value={getDetailLocationLabel(post) as string}
                    />
                  ) : null}
                </>
              )}
              <DetailLine
                label="모집 인원"
                value={formatRecruitCount(post.recruit_count)}
              />
              {getPostingDurationLabel(post) ? (
                <DetailLine
                  label="예상 시간"
                  value={getPostingDurationLabel(post) as string}
                />
              ) : null}
              <DetailLine
                label="보상"
                value={getPostingCompensationLabel(post)}
                highlighted
              />
            </DetailSection>

            <DetailSection title="찾는 참여자">
              <Text className="text-[15px] font-medium leading-[23px] text-hypo-muted">
                {post.target_description}
              </Text>
            </DetailSection>

            {!isOwnPost ? <FounderInfoSection post={post} /> : null}

            {isSurvey ? (
              <SurveyParticipationSection
                canParticipate={Boolean(accessToken)}
                currentUserId={appUser?.id}
                isOpening={surveyParticipationMutations.open.isPending}
                isSubmitting={surveyParticipationMutations.submit.isPending}
                isWithdrawing={surveyParticipationMutations.withdraw.isPending}
                participation={surveyParticipation.data ?? null}
                post={post}
                requiresApplication={requiresApplication}
                hasApplication={Boolean(existingApplication)}
                hasGrantedAccess={existingApplication?.status === "selected"}
                onOpenExternal={() => void openExternalSurvey()}
                usesStickyAction={Boolean(bottomAction)}
                onSubmit={() =>
                  surveyParticipationMutations.submit.mutateAsync()
                }
                onWithdraw={() =>
                  surveyParticipationMutations.withdraw.mutateAsync()
                }
              />
            ) : participationMethod ? (
              <DetailSection title="참여 방법">
                <Text className="text-[15px] font-semibold text-hypo-text">
                  {participationMethod.title}
                </Text>
                <Text className="text-[13px] font-medium leading-[20px] text-hypo-muted">
                  {participationMethod.description}
                </Text>
              </DetailSection>
            ) : null}

            {requiresApplication ? (
              <DetailApplicationSection
                canApply={Boolean(accessToken)}
                currentUserId={appUser?.id}
                errorMessage={
                  createApplication.error instanceof Error
                    ? createApplication.error.message
                    : null
                }
                existingApplication={existingApplication}
                isApplyFormOpen={isApplyFormOpen}
                isApplying={createApplication.isPending}
                onCancel={() => setIsApplyFormOpen(false)}
                parentReturnTo={String(backTo)}
                post={post}
                onApply={(input) => createApplication.mutate(input)}
              />
            ) : null}
          </ScrollView>
        ) : null}

        {bottomAction ? (
          <DetailStickyAction
            action={bottomAction}
            bottomInset={insets.bottom}
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function InterviewHero({
  hideOpenStatus = false,
  post,
}: {
  hideOpenStatus?: boolean;
  post: InterviewPost;
}) {
  return (
    <View className="border-b border-hypo-border pb-5 pt-3">
      <View className="flex-row flex-wrap items-center gap-x-2.5 gap-y-2">
        <Text className="text-[13px] font-medium leading-[18px] text-hypo-brand">
          {getPostingTypeLabel(post)}
        </Text>
        <Text className="-ml-1.5 text-[13px] leading-[18px] text-hypo-textSoft">
          ·
        </Text>
        <Text className="-ml-1.5 text-[13px] font-medium leading-[18px] text-hypo-muted">
          {getPostingModeLabel(post)}
        </Text>
        {hideOpenStatus && post.status === "open" ? null : (
          <PostingStatusBadge status={post.status} />
        )}
      </View>

      <Text className="mt-4 text-[26px] font-bold leading-[34px] text-hypo-text">
        {post.title}
      </Text>
      <Text
        lineBreakStrategyIOS="hangul-word"
        className="mt-2 text-[15px] leading-[23px] text-hypo-muted"
      >
        {post.service_summary}
      </Text>
    </View>
  );
}

function toBottomAction(
  cta: PostingDetailCta | null,
  {
    backTo,
    openApplicationForm,
    openExternalSurvey,
    post,
    room,
  }: {
    backTo: string;
    openApplicationForm: () => void;
    openExternalSurvey: () => Promise<void>;
    post?: InterviewPost;
    room?: ChatRoom | null;
  },
): DetailBottomAction | null {
  if (!cta || !post) return null;

  const returnTo = `/interviews/${post.id}?returnTo=${encodeURIComponent(backTo)}`;
  const login = (apply: boolean) =>
    router.push({
      pathname: "/(auth)/login",
      params: { returnTo: apply ? `${returnTo}&apply=1` : returnTo },
    });

  return {
    disabled: cta.disabled,
    label: cta.label,
    onPress: () => {
      if (cta.disabled) return;

      switch (cta.action) {
        case "manage":
          router.push({
            pathname: "/(tabs)/interviews/my-interviews",
            params: { returnTo: `/interviews/${post.id}` },
          });
          return;
        case "apply":
          openApplicationForm();
          return;
        case "login-apply":
          login(true);
          return;
        case "login-participate":
          login(false);
          return;
        case "open-survey":
          void openExternalSurvey();
          return;
        case "chat":
          if (!room) return;
          router.push({
            pathname: "/(tabs)/chat/[roomId]",
            params: { roomId: room.id, returnTo },
          });
      }
    },
  };
}

function PostingStatusBadge({ status }: { status: InterviewPost["status"] }) {
  const isOpen = status === "open";

  return (
    <View
      className={`rounded-full px-2 py-0.5 ${isOpen ? "bg-hypo-brandSoft" : "bg-hypo-surfaceMuted"}`}
    >
      <Text
        className={`text-[11px] font-medium leading-4 ${isOpen ? "text-hypo-brand" : "text-hypo-muted"}`}
      >
        {getPostingStatusLabel(status)}
      </Text>
    </View>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View className="border-b border-hypo-border py-5">
      <Text className="text-[15px] font-semibold text-hypo-text">{title}</Text>
      <View className="mt-4 gap-3.5">{children}</View>
    </View>
  );
}

function FounderInfoSection({ post }: { post: InterviewPost }) {
  const founder = post.founder;
  const founderName = founder?.name?.trim() || "모집자";
  const founderOrganization = founder?.organization_name?.trim() || null;

  return (
    <DetailSection title="모집자 정보">
      <View className="flex-row items-start gap-3">
        <FounderAvatar founder={founder} />
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={1}
            className="min-w-0 flex-1 text-[15px] font-semibold text-hypo-text"
          >
            {founderName}
          </Text>
          {founderOrganization ? (
            <Text className="mt-1 text-[13px] leading-[19px] text-hypo-muted">
              {founderOrganization}
            </Text>
          ) : null}
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
  recruitmentType,
  session,
  showChatAction,
}: {
  application: Application;
  chatReturnTo: string;
  matchingChatRoom?: ChatRoom | null;
  recruitmentType: NonNullable<InterviewPost["recruitment_type"]>;
  session?: Session | null;
  showChatAction: boolean;
}) {
  const applicationDisplay = getApplicationDetailDisplay(
    application,
    session,
    recruitmentType,
  );

  return (
    <View className="mb-2 rounded-[16px] bg-hypo-brandSoft px-4 py-4">
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-black leading-[22px] text-hypo-text">
            {applicationDisplay.title}
          </Text>
          <Text className="mt-1 text-xs font-bold leading-[19px] text-hypo-muted">
            {applicationDisplay.description}
          </Text>
        </View>
        {application.status === "selected" ? null : (
          <View className="rounded-full bg-white/70 px-2.5 py-1.5">
            <Text
              className={`text-xs font-black ${applicationDisplay.tone === "brand" ? "text-hypo-brand" : "text-hypo-muted"}`}
            >
              {applicationDisplay.label}
            </Text>
          </View>
        )}
      </View>

      {showChatAction ? (
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
      ) : null}
    </View>
  );
}

function ConfirmedSessionSection({ session }: { session: Session }) {
  return (
    <DetailSection title="확정된 일정">
      <DetailLine
        label="일정"
        value={formatSessionTime(session.scheduled_at)}
        highlighted
      />
      <DetailLine
        label="방식"
        value={session.meeting_type === "online" ? "화상" : "대면"}
      />
      {session.meeting_url ? (
        <DetailLine label="참여 링크" value={session.meeting_url} />
      ) : null}
      {session.place ? <DetailLine label="장소" value={session.place} /> : null}
    </DetailSection>
  );
}

function SubmittedApplicationSection({
  application,
}: {
  application: Application;
}) {
  const submittedAnswers = Object.entries(application.answers);

  if (
    !submittedAnswers.length &&
    !application.available_times.length &&
    !application.rejection_reason
  ) {
    return null;
  }

  return (
    <DetailSection title="내가 제출한 내용">
      {submittedAnswers.map(([key, value]) => (
        <DetailTextValue
          key={key}
          label={formatAnswerLabel(key)}
          value={value}
        />
      ))}

      {application.available_times.length ? (
        <View className="gap-2">
          <Text className="text-xs font-black text-[#7D877A]">가능 시간</Text>
          <View className="flex-row flex-wrap gap-2">
            {application.available_times.map((time) => (
              <View
                key={time}
                className="rounded-full bg-hypo-surface px-3 py-1.5"
              >
                <Text className="text-xs font-extrabold text-hypo-muted">
                  {time}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {application.rejection_reason ? (
        <View className="rounded-[12px] bg-hypo-dangerSoft px-3 py-2.5">
          <Text className="text-xs font-black text-hypo-danger">반려 사유</Text>
          <Text className="mt-1 text-xs font-extrabold leading-[18px] text-hypo-danger">
            {application.rejection_reason}
          </Text>
        </View>
      ) : null}
    </DetailSection>
  );
}

function DetailTextValue({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-xs font-black text-[#7D877A]">{label}</Text>
      <Text className="text-sm font-bold leading-[21px] text-hypo-text">
        {value}
      </Text>
    </View>
  );
}

function DetailLine({
  highlighted,
  label,
  value,
}: {
  highlighted?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-start gap-4">
      <Text className="w-[64px] pt-0.5 text-[13px] font-medium leading-5 text-hypo-muted">
        {label}
      </Text>
      <Text
        className={`min-w-0 flex-1 text-[15px] font-medium leading-[22px] ${highlighted ? "text-hypo-brand" : "text-hypo-text"}`}
      >
        {value}
      </Text>
    </View>
  );
}

function DetailStickyAction({
  action,
  bottomInset,
}: {
  action: DetailBottomAction;
  bottomInset: number;
}) {
  return (
    <View
      className="border-t border-hypo-border bg-hypo-bg px-4 pt-3"
      style={{ paddingBottom: Math.max(bottomInset + 12, 16) }}
    >
      <PrimaryButton disabled={action.disabled} onPress={action.onPress}>
        {action.label}
      </PrimaryButton>
    </View>
  );
}

function DetailApplicationSection({
  canApply,
  currentUserId,
  errorMessage,
  existingApplication,
  isApplyFormOpen,
  isApplying,
  onCancel,
  onApply,
  parentReturnTo,
  post,
}: {
  canApply: boolean;
  currentUserId?: string | null;
  errorMessage?: string | null;
  existingApplication?: Application | null;
  isApplyFormOpen: boolean;
  isApplying?: boolean;
  onCancel: () => void;
  parentReturnTo: string;
  onApply: (input: CreateApplicationInput) => void;
  post: InterviewPost;
}) {
  const [experienceAnswer, setExperienceAnswer] = useState("");
  const [availableTimes, setAvailableTimes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const isOwnPost = Boolean(currentUserId && post.founder_id === currentUserId);
  const loginRoute = {
    pathname: "/(auth)/login",
    params: {
      returnTo: `/interviews/${post.id}?apply=1&returnTo=${encodeURIComponent(parentReturnTo)}`,
    },
  } as const;

  const submitApplication = () => {
    if (!canApply) {
      router.push(loginRoute);
      return;
    }
    if (isOwnPost) {
      router.push({
        pathname: "/(tabs)/interviews/my-interviews",
        params: {
          returnTo: `/interviews/${post.id}?returnTo=${encodeURIComponent(parentReturnTo)}`,
        },
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
      {isOwnPost || existingApplication || !isApplyFormOpen ? null : (
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
            <Text className="text-xs font-extrabold leading-[18px] text-hypo-danger">
              {validationError ?? errorMessage}
            </Text>
          ) : null}
          <View className="flex-row gap-2">
            <PrimaryButton
              className="flex-1"
              variant="secondary"
              onPress={() => {
                onCancel();
                setValidationError(null);
              }}
            >
              취소
            </PrimaryButton>
            <PrimaryButton
              className="flex-1"
              disabled={isApplying}
              onPress={submitApplication}
            >
              {isApplying ? "신청 중" : "신청하기"}
            </PrimaryButton>
          </View>
        </View>
      )}
    </View>
  );
}

function getApplicationDetailDisplay(
  application: Application,
  session?: Session | null,
  recruitmentType: string = "interview",
) {
  const typeLabel = recruitmentType === "beta_test" ? "베타테스트" : "참여";

  if (session?.status === "completed" || application.status === "completed") {
    return {
      description: `${typeLabel}가 완료됐어요.`,
      label: "완료",
      title: `${typeLabel} 완료`,
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
      description: `이번 ${typeLabel} 대상자로 선정되지 않았어요.`,
      label: "반려",
      title: "신청 반려",
      tone: "muted" as const,
    };
  }

  if (session || application.status === "selected") {
    if (recruitmentType === "survey") {
      return {
        description: "아래 버튼에서 설문을 시작할 수 있어요.",
        label: "승인",
        title: "설문 참여가 승인됐어요",
        tone: "brand" as const,
      };
    }

    return {
      description: session
        ? "확정된 일정을 확인하고 채팅에서 필요한 내용을 이어가세요."
        : recruitmentType === "beta_test"
          ? "선정됐어요. 채팅에서 테스트 범위와 다음 단계를 확인하세요."
          : "선정됐어요. 채팅에서 일정과 진행 방식을 조율하세요.",
      label: "선정",
      title: `${typeLabel} 대상자로 선정됐어요`,
      tone: "brand" as const,
    };
  }

  return {
    description:
      recruitmentType === "survey"
        ? "모집자가 신청 내용을 확인하고 있어요."
        : "모집자가 신청 내용을 확인하고 있어요. 필요한 이야기는 채팅에서 이어갈 수 있어요.",
    label: "신청",
    title: "신청이 접수됐어요",
    tone: "brand" as const,
  };
}

function getParticipationMethodContent(post: InterviewPost) {
  switch (post.recruitment_type ?? "interview") {
    case "interview":
      return {
        description:
          "공고에 적힌 조건을 기준으로 신청해요. 모집자가 신청을 확인한 뒤 필요한 경우 채팅에서 세부 사항을 정해요.",
        title: "선정되면 채팅에서 조율해요",
      };
    case "beta_test":
      return {
        description:
          "공고에 맞는 경험을 적어 신청해요. 선정되면 채팅에서 테스트 범위와 다음 단계를 안내받아요.",
        title: "선정되면 채팅에서 안내해요",
      };
    default:
      return null;
  }
}

function SurveyParticipationSection({
  canParticipate,
  currentUserId,
  hasApplication,
  hasGrantedAccess,
  isOpening,
  isSubmitting,
  isWithdrawing,
  onOpenExternal,
  onSubmit,
  onWithdraw,
  participation,
  post,
  requiresApplication,
  usesStickyAction,
}: {
  canParticipate: boolean;
  currentUserId?: string | null;
  hasApplication: boolean;
  hasGrantedAccess: boolean;
  isOpening: boolean;
  isSubmitting: boolean;
  isWithdrawing: boolean;
  onOpenExternal: () => void;
  onSubmit: () => Promise<SurveyParticipationAction>;
  onWithdraw: () => Promise<SurveyParticipationAction>;
  participation: SurveyParticipation | null;
  post: InterviewPost;
  requiresApplication: boolean;
  usesStickyAction: boolean;
}) {
  const isOwnPost = Boolean(currentUserId && post.founder_id === currentUserId);

  return (
    <DetailSection title="참여 방법">
      <Text className="text-sm font-semibold text-hypo-text">
        {requiresApplication ? "승인 후 외부 설문에서 참여해요" : "바로 외부 설문에서 참여해요"}
      </Text>
      <Text className="text-xs font-bold leading-[19px] text-hypo-muted">
        설문 답변은 Hypofit에 저장되지 않고 외부 설문 서비스에서 처리돼요.
      </Text>
      {post.external_data_notice ? (
        <Text className="text-xs font-semibold leading-[19px] text-hypo-muted">
          {post.external_data_notice}
        </Text>
      ) : null}
      {isOwnPost ? null : participation?.status === "confirmed" ? (
        <View className="gap-1 py-2">
          <Text className="text-sm font-semibold text-hypo-text">
            참여가 확인됐어요
          </Text>
          <Text className="text-xs font-bold leading-[19px] text-hypo-muted">
            모집자가 설문 참여를 확인했어요.
          </Text>
        </View>
      ) : participation?.status === "submitted" ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-hypo-text">
            제출 완료로 표시했어요
          </Text>
          <Text className="text-xs font-bold leading-[19px] text-hypo-muted">
            모집자가 참여를 확인하면 상태가 업데이트돼요.
          </Text>
          <PrimaryButton
            disabled={isWithdrawing}
            variant="secondary"
            onPress={() => void onWithdraw().catch(() => undefined)}
          >
            참여 취소
          </PrimaryButton>
        </View>
      ) : participation?.status === "opened" ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-hypo-text">
            설문을 작성한 뒤 완료를 알려주세요
          </Text>
          {usesStickyAction ? null : (
            <PrimaryButton variant="secondary" onPress={onOpenExternal}>
              설문 다시 열기
            </PrimaryButton>
          )}
          <PrimaryButton
            disabled={isSubmitting}
            onPress={() => void onSubmit().catch(() => undefined)}
          >
            {isSubmitting ? "제출 처리 중" : "제출했어요"}
          </PrimaryButton>
        </View>
      ) : participation?.status === "withdrawn" ? (
        <Text className="text-sm font-semibold text-hypo-muted">
          참여를 취소한 설문이에요.
        </Text>
      ) : requiresApplication && !hasGrantedAccess ? (
        <Text className="text-xs font-bold leading-[19px] text-hypo-muted">
          {participation
            ? "신청이 접수됐어요. 모집자가 신청 내용을 확인하고 있어요."
            : hasApplication
              ? "신청이 접수됐어요. 모집자가 신청 내용을 확인하고 있어요."
              : "신청 후 모집자가 확인하면 설문 링크가 열려요."}
        </Text>
      ) : usesStickyAction ? null : (
        <PrimaryButton disabled={isOpening} onPress={onOpenExternal}>
          {canParticipate
            ? isOpening
              ? "설문 여는 중"
              : "설문 참여하기"
            : "로그인 후 참여"}
        </PrimaryButton>
      )}
    </DetailSection>
  );
}

function getPostingSchedule(post: InterviewPost) {
  if (post.recruitment_type === "beta_test") {
    if (post.beta_test_starts_at && post.beta_test_ends_at) {
      return `${formatDate(post.beta_test_starts_at)} - ${formatDate(post.beta_test_ends_at)}`;
    }
    return post.beta_test_starts_at
      ? `${formatDate(post.beta_test_starts_at)}부터`
      : "모집자와 협의";
  }

  return post.schedule_options.length
    ? post.schedule_options.join(" · ")
    : "모집자와 협의";
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

function formatParticipationDeadline(value?: string | null) {
  return value ? `${formatDate(value)}까지` : "마감일 미정";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(new Date(value));
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

  return (
    post.location_place_name ??
    post.location_text ??
    post.location_address ??
    post.location
  );
}
