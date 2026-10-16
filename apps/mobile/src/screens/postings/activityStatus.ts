import { Feather } from "@expo/vector-icons";
import type { Application, InterviewPost } from "@hypofit/contracts";
import { type PostingLifecycleAction } from "@/features/postings/usePostings";

export function canEditPostingContent(status: InterviewPost["status"]) {
  return !["archived", "completed", "hidden", "removed"].includes(status);
}

export function canDeletePosting(status: InterviewPost["status"]) {
  return !["archived", "completed", "hidden", "removed"].includes(status);
}

export function canOpenApplicantChat(status: Application["status"]) {
  return status === "selected" || status === "completed" || status === "no_show";
}

export function getApplicantManagementStatus(status: Application["status"]): {
  label: string;
  tone: "neutral" | "brand" | "danger";
} {
  if (status === "applied") return { label: "검토 대기", tone: "neutral" };
  if (status === "selected") return { label: "진행 중", tone: "brand" };
  if (status === "completed") return { label: "인터뷰 완료", tone: "neutral" };
  if (status === "no_show") return { label: "불참", tone: "danger" };
  if (status === "rejected") return { label: "반려", tone: "danger" };
  return { label: "취소", tone: "neutral" };
}

export function getApplicationDisplayStatus(
  applicationStatus: Application["status"],
  sessionStatus?: string,
): {
  label: string;
  tone: "neutral" | "brand" | "danger";
} {
  if (sessionStatus) {
    const sessionLabelByStatus: Record<string, string> = {
      canceled: "취소",
      completed: "완료",
      no_show: "불참",
      scheduled: "선정",
    };
    const sessionToneByStatus: Record<string, "neutral" | "brand" | "danger"> = {
      canceled: "neutral",
      completed: "neutral",
      no_show: "danger",
      scheduled: "brand",
    };

    return {
      label: sessionLabelByStatus[sessionStatus] ?? sessionStatus,
      tone: sessionToneByStatus[sessionStatus] ?? "neutral",
    };
  }

  const applicationLabelByStatus: Record<Application["status"], string> = {
    applied: "신청",
    canceled: "취소",
    completed: "완료",
    no_show: "불참",
    rejected: "반려",
    selected: "선정",
  };
  const applicationToneByStatus: Record<Application["status"], "neutral" | "brand" | "danger"> = {
    applied: "neutral",
    canceled: "neutral",
    completed: "neutral",
    no_show: "danger",
    rejected: "danger",
    selected: "brand",
  };

  return {
    label: applicationLabelByStatus[applicationStatus],
    tone: applicationToneByStatus[applicationStatus],
  };
}

export function getPostStatusDisplay(status: InterviewPost["status"]): {
  label: string;
  tone: "neutral" | "brand" | "danger";
} {
  const labelByStatus: Record<InterviewPost["status"], string> = {
    archived: "보관됨",
    closed: "마감",
    completed: "완료",
    draft: "임시저장",
    hidden: "숨김",
    open: "모집 중",
    removed: "삭제됨",
  };
  const toneByStatus: Record<InterviewPost["status"], "neutral" | "brand" | "danger"> = {
    archived: "neutral",
    closed: "neutral",
    completed: "neutral",
    draft: "neutral",
    hidden: "danger",
    open: "brand",
    removed: "danger",
  };

  return {
    label: labelByStatus[status],
    tone: toneByStatus[status],
  };
}

export function getAvailablePostStatusActions(status: InterviewPost["status"]): Array<{
  action: PostingLifecycleAction;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  label: string;
  tone: "brand" | "neutral";
}> {
  if (status === "open") {
    return [
      {
        action: "close",
        description: "새 지원을 멈추고 기존 지원자만 관리합니다.",
        icon: "pause-circle",
        label: "모집 마감하기",
        tone: "neutral",
      },
    ];
  }

  if (status === "closed") {
    return [
      {
        action: "reopen",
        description: "다시 지원자를 받을 수 있도록 모집을 엽니다.",
        icon: "play-circle",
        label: "모집 재개하기",
        tone: "brand",
      },
    ];
  }

  if (status === "archived") {
    return [
      {
        action: "reopen",
        description: "보관을 풀고 다시 지원자를 받을 수 있게 합니다.",
        icon: "play-circle",
        label: "모집 재개하기",
        tone: "brand",
      },
    ];
  }

  return [];
}
