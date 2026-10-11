import type {
  Application,
  ChatRoom,
  InterviewPost,
  SurveyParticipation,
} from "@hypofit/contracts";

export type PostingDetailCtaAction =
  | "apply"
  | "chat"
  | "login-apply"
  | "login-participate"
  | "manage"
  | "open-survey";

export type PostingDetailCta = {
  action: PostingDetailCtaAction;
  disabled?: boolean;
  label: string;
};

type ResolvePostingDetailCtaInput = {
  accessToken?: string | null;
  application?: Application | null;
  chatRoom?: ChatRoom | null;
  isApplicationFormOpen: boolean;
  isOwner: boolean;
  post: InterviewPost;
  surveyParticipation?: SurveyParticipation | null;
  now?: number;
};

export function resolvePostingDetailCta({
  accessToken,
  application,
  chatRoom,
  isApplicationFormOpen,
  isOwner,
  post,
  surveyParticipation,
  now = Date.now(),
}: ResolvePostingDetailCtaInput): PostingDetailCta | null {
  if (isOwner) return { action: "manage", label: "공고 관리" };

  // Recruitment closure stops new applications, not an existing selected conversation.
  if (
    post.status === "closed" &&
    ["interview", "beta_test", "research_experiment"].includes(post.recruitment_type ?? "interview") &&
    application?.status === "selected" &&
    application.interview_post_id === post.id &&
    chatRoom?.application_id === application.id &&
    chatRoom.interview_post_id === post.id &&
    (chatRoom.status === "open" || chatRoom.status === "selected")
  ) {
    return { action: "chat", label: "채팅 보기" };
  }

  if (post.status !== "open") {
    return { action: "apply", disabled: true, label: getPostingStatusLabel(post.status) };
  }

  const isSurvey = post.recruitment_type === "survey";
  const requiresApplication = !isSurvey || post.entry_mode !== "direct";

  if (!requiresApplication && isSurvey) {
    return resolveSurveyAction(post, accessToken, surveyParticipation, now);
  }

  if (!application) {
    if (getPostingDetailStatus(post, now) === "closed") {
      return { action: "apply", disabled: true, label: "모집 종료" };
    }
    if (isApplicationFormOpen) return null;
    return {
      action: accessToken ? "apply" : "login-apply",
      label: accessToken ? "신청하기" : "로그인 후 신청",
    };
  }

  if (application.status === "completed") {
    return { action: "apply", disabled: true, label: "참여 완료" };
  }
  if (application.status === "selected") {
    if (isSurvey) return resolveSurveyAction(post, accessToken, surveyParticipation, now);
    return chatRoom
      ? { action: "chat", label: "채팅 보기" }
      : { action: "chat", disabled: true, label: "채팅방을 준비 중이에요" };
  }
  if (application.status === "rejected") {
    return { action: "apply", disabled: true, label: "신청 반려" };
  }
  if (application.status === "canceled") {
    return { action: "apply", disabled: true, label: "신청 취소" };
  }
  if (application.status === "no_show") {
    return { action: "apply", disabled: true, label: "불참 처리" };
  }

  return { action: "apply", disabled: true, label: "검토 중" };
}

function resolveSurveyAction(
  post: InterviewPost,
  accessToken: string | null | undefined,
  participation?: SurveyParticipation | null,
  now = Date.now(),
): PostingDetailCta | null {
  if (participation?.status === "withdrawn") {
    return { action: "open-survey", disabled: true, label: "참여 취소" };
  }
  if (participation?.status === "confirmed") {
    return { action: "open-survey", disabled: true, label: "참여 완료" };
  }
  if (participation?.status === "submitted") return null;
  if (getPostingDetailStatus(post, now) === "closed") {
    return { action: "open-survey", disabled: true, label: "모집 종료" };
  }
  if (post.external_action_available === false) {
    return { action: "open-survey", disabled: true, label: "설문 링크 준비 중이에요" };
  }

  return {
    action: accessToken ? "open-survey" : "login-participate",
    label: accessToken
      ? participation?.status === "opened"
        ? "설문 다시 열기"
        : "설문 참여하기"
      : "로그인 후 참여",
  };
}

// Survey opening and new submission both require a future deadline on the server.
export function getPostingDetailStatus(post: InterviewPost, now = Date.now()): InterviewPost["status"] {
  if (post.status === "open" && post.recruitment_type === "survey" &&
      post.participation_deadline_at && Date.parse(post.participation_deadline_at) <= now) {
    return "closed";
  }
  return post.status;
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
