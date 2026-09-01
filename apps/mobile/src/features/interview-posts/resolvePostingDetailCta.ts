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
};

export function resolvePostingDetailCta({
  accessToken,
  application,
  chatRoom,
  isApplicationFormOpen,
  isOwner,
  post,
  surveyParticipation,
}: ResolvePostingDetailCtaInput): PostingDetailCta | null {
  if (isOwner) return { action: "manage", label: "공고 관리" };

  if (post.status !== "open") {
    return { action: "apply", disabled: true, label: getPostingStatusLabel(post.status) };
  }

  const isSurvey = post.recruitment_type === "survey";
  const requiresApplication = !isSurvey || post.entry_mode !== "direct";

  if (!requiresApplication && isSurvey) {
    return resolveSurveyAction(post, accessToken, surveyParticipation);
  }

  if (!application) {
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
    if (isSurvey) return resolveSurveyAction(post, accessToken, surveyParticipation);
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
): PostingDetailCta | null {
  if (participation?.status === "confirmed") {
    return { action: "open-survey", disabled: true, label: "참여 완료" };
  }
  if (participation?.status === "submitted") return null;
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
