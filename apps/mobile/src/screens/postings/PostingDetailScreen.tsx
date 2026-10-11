import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ActionSheetIOS,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { isExternalSurveyUrl } from "@hypofit/contracts/survey-urls";
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
import { useApplications } from "@/features/applications/useApplications";
import { useCreateApplication } from "@/features/applications/useApplicationMutations";
import { useChatRooms } from "@/features/chat/useChat";
import {
  usePostingViews,
  useMarkPostingViewed,
} from "@/features/postings/usePostingViews";
import {
  getPostingDetailStatus,
  resolvePostingDetailCta,
  type PostingDetailCta,
} from "@/features/postings/resolvePostingDetailCta";
import { usePosting } from "@/features/postings/usePostings";
import { useSessions } from "@/features/sessions/useSessions";
import {
  useSurveyParticipation,
  useSurveyParticipationMutations,
} from "@/features/surveys/useSurveyParticipation";
import { formatAnswerLabel } from "@/features/applications/applicationReadModels";
import { formatSessionTime } from "@/features/sessions/sessionPresentation";
import { useAuth } from "@/features/auth/AuthProvider";
import { StateMessage } from "@/shared/ui/StateMessage";
import type { CreateApplicationInput } from "@/features/applications/applicationsApi";
import {
  PostingDetailOverview,
  PostingParticipationGuide,
} from "@/features/postings/PostingDetailOverview";
import {
  getSafeReturnTo,
  goBackOrReplaceReturnTo,
} from "@/shared/navigation/backNavigation";
import { GlassActionButton } from "@/shared/ui/GlassActionButton";
import { GlassHeaderButton } from "@/shared/ui/GlassHeaderButton";
import { colors } from "@/shared/theme/tokens";

type DetailAction = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

export function PostingDetailScreen() {
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
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
    refetch: refetchPost,
  } = usePosting(postId, accessToken);
  const { data: applications = [] } = useApplications(accessToken);
  const { data: chatRooms = [] } = useChatRooms(accessToken);
  const { data: sessions = [] } = useSessions(accessToken);
  usePostingViews(accessToken);
  const createApplication = useCreateApplication(accessToken);
  const { mutate: markPostViewed } = useMarkPostingViewed(accessToken);
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
    [existingApplication, isInterview, sessions],
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
      if (!isExternalSurveyUrl(action.external_url)) throw new Error("Invalid survey link");
      await WebBrowser.openBrowserAsync(action.external_url.trim());
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
  const detailAction = toDetailAction(resolvedCta, {
    backTo: String(backTo),
    openApplicationForm,
    openExternalSurvey,
    post,
    room: matchingChatRoom,
  });
  const headerAction = detailAction?.disabled ? null : detailAction;
  const stackHeaderAction = fontScale > 1.2;
  const showHeaderTitle = !post;
  const isHeaderActionBusy =
    resolvedCta?.action === "open-survey" && surveyParticipationMutations.open.isPending;

  const openReport = () => {
    if (!post || isOwnPost) return;
    router.push({
      pathname: "/support/report",
      params: {
        category: "interview_post",
        interview_title: post.title,
        returnTo: `/interviews/${post.id}?returnTo=${encodedBackTo}`,
        target_id: post.id,
        target_type: "interview_post",
      },
    });
  };

  const openPostMenu = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ["신고하기", "취소"], cancelButtonIndex: 1 },
        (index) => {
          if (index === 0) openReport();
        },
      );
      return;
    }
    Alert.alert("공고 메뉴", undefined, [
      { text: "취소", style: "cancel" },
      { text: "신고하기", onPress: openReport },
    ]);
  };

  useEffect(() => {
    if (post?.id && accessToken) {
      markPostViewed({ postId: post.id, source: "detail" });
    }
  }, [accessToken, post?.id, markPostViewed]);

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
        <View className="px-5 pb-1 pt-2">
          <View className="min-h-11 flex-row items-center gap-2">
            <GlassHeaderButton
              accessibilityLabel="뒤로가기"
              icon="chevron-left"
              onPress={() =>
                goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/interviews")
              }
            />
            {showHeaderTitle ? (
              <Text allowFontScaling={false} className="min-w-0 flex-1 font-medium text-hypo-text-secondary" style={{ fontSize: 14 * fontScale, lineHeight: 22 * fontScale }}>
                공고 상세
              </Text>
            ) : <View className="flex-1" />}
            {headerAction && !stackHeaderAction ? (
              <GlassActionButton
                accessibilityLabel={headerAction.label}
                busy={isHeaderActionBusy}
                size="compact"
                onPress={headerAction.onPress}
              >
                {isHeaderActionBusy ? "설문 여는 중" : headerAction.label}
              </GlassActionButton>
            ) : null}
            {post && !isOwnPost ? (
              <Pressable
                accessibilityLabel="공고 메뉴, 신고하기"
                accessibilityRole="button"
                className="h-11 w-11 flex-row items-center justify-center gap-1"
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                onPress={openPostMenu}
              >
                <View className="h-1 w-1 rounded-full bg-hypo-muted" />
                <View className="h-1 w-1 rounded-full bg-hypo-muted" />
                <View className="h-1 w-1 rounded-full bg-hypo-muted" />
              </Pressable>
            ) : null}
          </View>
          {headerAction && stackHeaderAction ? (
            <GlassActionButton
              accessibilityLabel={headerAction.label}
              busy={isHeaderActionBusy}
              className="mt-2"
              onPress={headerAction.onPress}
            >
              {isHeaderActionBusy ? "설문 여는 중" : headerAction.label}
            </GlassActionButton>
          ) : null}
        </View>

        {isLoading ? (
          <StateMessage title="공고를 불러오는 중이에요." loading />
        ) : null}
        {isError ? (
          <View className="items-center gap-3 px-4 py-12">
            <StateMessage
              title="공고를 불러오지 못했어요."
              description="잠시 후 다시 시도해 주세요."
            />
            <Pressable
              accessibilityLabel="공고 다시 불러오기"
              accessibilityRole="button"
              className="min-h-11 items-center justify-center px-4"
              onPress={() => void refetchPost()}
            >
              <Text className="text-[14px] font-semibold text-hypo-brand">
                다시 시도
              </Text>
            </Pressable>
          </View>
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
            className="flex-1 px-5"
            contentContainerClassName="pt-2"
            contentContainerStyle={{
              paddingBottom: Math.max(insets.bottom + 24, 32),
            }}
            showsVerticalScrollIndicator={false}
          >
            {shouldShowAppliedState && existingApplication ? (
              <ApplicationStatusSummary
                application={existingApplication}
                recruitmentType={post.recruitment_type ?? "interview"}
                session={existingSession}
                isChatPreparing={isSelectedParticipant && !isSurvey && !matchingChatRoom}
              />
            ) : null}

            {isSelectedParticipant && existingSession ? (
              <ConfirmedSessionSection session={existingSession} />
            ) : null}

            {isSelectedParticipant && existingApplication ? (
              <SubmittedApplicationSection application={existingApplication} />
            ) : null}

            <PostingDetailOverview
              onRefreshImages={() => void refetchPost()}
              hideOpenStatus={isSelectedParticipant}
              isOwner={isOwnPost}
              post={post}
            />

            {shouldShowAppliedState &&
            existingApplication &&
            !isSelectedParticipant &&
            existingSession ? (
              <ConfirmedSessionSection session={existingSession} />
            ) : null}

            {shouldShowAppliedState &&
            existingApplication &&
            !isSelectedParticipant ? (
              <SubmittedApplicationSection application={existingApplication} />
            ) : null}

            {isSurvey ? (
              <SurveyParticipationSection
                currentUserId={appUser?.id}
                isSubmitting={surveyParticipationMutations.submit.isPending}
                isWithdrawing={surveyParticipationMutations.withdraw.isPending}
                participation={surveyParticipation.data ?? null}
                post={post}
                requiresApplication={requiresApplication}
                hasApplication={Boolean(existingApplication)}
                hasGrantedAccess={existingApplication?.status === "selected"}
                unavailableMessage={resolvedCta?.disabled ? resolvedCta.label : null}
                onSubmit={() =>
                  surveyParticipationMutations.submit.mutateAsync()
                }
                onWithdraw={() =>
                  surveyParticipationMutations.withdraw.mutateAsync()
                }
              />
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

            <PostingParticipationGuide post={post} />
          </ScrollView>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function toDetailAction(
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
): DetailAction | null {
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
            params: { returnTo: `/interviews/${post.id}`, tab: "posts" },
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

function DetailSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <View className="border-t border-hypo-border py-5">
      <Text accessibilityRole="header" className="text-[15px] font-semibold text-hypo-text">{title}</Text>
      <View className="mt-3.5 gap-3.5">{children}</View>
    </View>
  );
}

function ApplicationStatusSummary({
  application,
  isChatPreparing,
  recruitmentType,
  session,
}: {
  application: Application;
  isChatPreparing: boolean;
  recruitmentType: NonNullable<InterviewPost["recruitment_type"]>;
  session?: Session | null;
}) {
  const applicationDisplay = getApplicationDetailDisplay(
    application,
    session,
    recruitmentType,
  );

  return (
    <View className="mb-2 mt-4 rounded-[12px] bg-hypo-surfaceMuted px-4 py-3.5">
      <View className="flex-row items-start gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold leading-[22px] text-hypo-text">
            {applicationDisplay.title}
          </Text>
          <Text className="mt-1 text-[13px] leading-5 text-hypo-text-secondary">
            {applicationDisplay.description}
          </Text>
        </View>
        {application.status === "selected" ? null : (
          <View className="pt-0.5">
            <Text
              className={`text-xs font-medium ${applicationDisplay.tone === "brand" ? "text-hypo-brand" : "text-hypo-muted"}`}
            >
              {applicationDisplay.label}
            </Text>
          </View>
        )}
      </View>

      {isChatPreparing ? (
        <Text className="mt-2 text-[13px] leading-5 text-hypo-muted">
          채팅방을 준비 중이에요
        </Text>
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
          <Text className="text-[13px] text-hypo-text-secondary">가능 시간</Text>
          <View className="gap-1">
            {application.available_times.map((time) => (
              <View key={time}>
                <Text className="text-[14px] leading-[21px] text-hypo-text">
                  {time}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {application.rejection_reason ? (
        <View className="rounded-[12px] bg-hypo-dangerSoft px-3 py-2.5">
          <Text className="text-xs font-medium text-hypo-danger">반려 사유</Text>
          <Text className="mt-1 text-[14px] leading-[21px] text-hypo-danger">
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
      <Text className="text-[13px] text-hypo-text-secondary">{label}</Text>
      <Text className="text-[14px] leading-[21px] text-hypo-text">
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
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  return (
    <View className={stacked ? "gap-1" : "flex-row items-start gap-4"}>
      <Text className={`${stacked ? "" : "w-[76px] pt-0.5"} text-[13px] leading-5 text-hypo-muted`}>
        {label}
      </Text>
      <Text
        className={`min-w-0 ${stacked ? "" : "flex-1"} text-[15px] leading-[22px] ${highlighted ? "font-medium text-hypo-brand" : "text-hypo-text"}`}
      >
        {value}
      </Text>
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
          tab: "posts",
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
            <Text className="text-[13px] leading-5 text-hypo-danger">
              {validationError ?? errorMessage}
            </Text>
          ) : null}
          <View className="flex-row gap-2">
            <GlassActionButton
              className="flex-1"
              tone="secondary"
              onPress={() => {
                onCancel();
                setValidationError(null);
              }}
            >
              취소
            </GlassActionButton>
            <GlassActionButton
              className="flex-1"
              disabled={isApplying}
              busy={isApplying}
              onPress={submitApplication}
            >
              {isApplying ? "신청 중" : "신청하기"}
            </GlassActionButton>
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
  const typeLabel = recruitmentType === "beta_test" ? "베타테스트" : recruitmentType === "research_experiment" ? "연구 실험" : "참여";

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
        description: "승인됐어요. 설문 참여 방법과 진행 상태를 확인하세요.",
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
    description: "모집자가 신청 내용을 확인하고 있어요.",
    label: "검토 중",
    title: "신청이 접수됐어요",
    tone: "brand" as const,
  };
}

function SurveyParticipationSection({
  currentUserId,
  hasApplication,
  hasGrantedAccess,
  isSubmitting,
  isWithdrawing,
  onSubmit,
  onWithdraw,
  participation,
  post,
  requiresApplication,
  unavailableMessage,
}: {
  currentUserId?: string | null;
  hasApplication: boolean;
  hasGrantedAccess: boolean;
  isSubmitting: boolean;
  isWithdrawing: boolean;
  onSubmit: () => Promise<SurveyParticipationAction>;
  onWithdraw: () => Promise<SurveyParticipationAction>;
  participation: SurveyParticipation | null;
  post: InterviewPost;
  requiresApplication: boolean;
  unavailableMessage: string | null;
}) {
  const { fontScale } = useWindowDimensions();
  const isOwnPost = Boolean(currentUserId && post.founder_id === currentUserId);
  const canSubmit = getPostingDetailStatus(post) === "open";

  return (
    <DetailSection key={fontScale} title="참여 방법">
      <Text className="text-sm font-semibold text-hypo-text">
        {requiresApplication ? "승인 후 외부 설문에서 참여해요" : "바로 외부 설문에서 참여해요"}
      </Text>
      <Text className="text-[13px] leading-5 text-hypo-muted">
        설문 답변은 Hypofit에 저장되지 않고 외부 설문 서비스에서 처리돼요.
      </Text>
      {post.external_data_notice ? (
        <Text className="text-[13px] leading-5 text-hypo-muted">
          {post.external_data_notice}
        </Text>
      ) : null}
      {isOwnPost ? null : participation?.status === "confirmed" ? (
        <View className="gap-1 py-2">
          <Text className="text-sm font-semibold text-hypo-text">
            참여가 확인됐어요
          </Text>
          <Text className="text-[13px] leading-5 text-hypo-muted">
            모집자가 설문 참여를 확인했어요.
          </Text>
        </View>
      ) : participation?.status === "submitted" ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-hypo-text">
            제출 완료로 표시했어요
          </Text>
          <Text className="text-[13px] leading-5 text-hypo-muted">
            모집자가 참여를 확인하면 상태가 업데이트돼요.
          </Text>
          <GlassActionButton
            disabled={isWithdrawing}
            busy={isWithdrawing}
            tone="secondary"
            onPress={() => void onWithdraw().catch(() => undefined)}
          >
            참여 취소
          </GlassActionButton>
        </View>
      ) : participation?.status === "opened" ? (
        <View className="gap-2">
          <Text className="text-sm font-semibold text-hypo-text">
            {canSubmit
              ? "외부 설문을 제출한 뒤 여기에서 '제출했어요'를 눌러주세요"
              : "모집이 종료되어 설문을 제출 완료로 표시할 수 없어요."}
          </Text>
          {canSubmit && unavailableMessage ? (
            <Text className="text-[13px] leading-5 text-hypo-muted">
              {unavailableMessage}
            </Text>
          ) : null}
          <GlassActionButton
            disabled={isSubmitting || !canSubmit}
            busy={isSubmitting}
            onPress={() => void onSubmit().catch(() => undefined)}
          >
            {isSubmitting ? "제출 처리 중" : "제출했어요"}
          </GlassActionButton>
        </View>
      ) : participation?.status === "withdrawn" ? (
        <Text className="text-sm font-semibold text-hypo-muted">
          참여를 취소한 설문이에요.
        </Text>
      ) : requiresApplication && !hasGrantedAccess ? (
        <Text className="text-[13px] leading-5 text-hypo-muted">
          {participation
            ? "신청이 접수됐어요. 모집자가 신청 내용을 확인하고 있어요."
            : hasApplication
              ? "신청이 접수됐어요. 모집자가 신청 내용을 확인하고 있어요."
              : "신청 후 모집자가 확인하면 설문 링크가 열려요."}
        </Text>
      ) : unavailableMessage ? (
        <Text className="text-[13px] leading-5 text-hypo-muted">
          {unavailableMessage}
        </Text>
      ) : null}
    </DetailSection>
  );
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
      <Text className="text-[13px] font-medium text-hypo-text">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        multiline
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        className="min-h-[92px] rounded-xl border border-hypo-border bg-hypo-surface px-3 py-2.5 text-sm leading-5 text-hypo-text"
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
