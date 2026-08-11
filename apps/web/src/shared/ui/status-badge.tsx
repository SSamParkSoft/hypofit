import type { Application, InterviewPost, Session } from "../api/types";
import { Badge } from "./badge";

const interviewPostStatusMeta: Record<
  InterviewPost["status"],
  { intent: "neutral" | "brand" | "success" | "warning"; label: string }
> = {
  draft: { intent: "warning", label: "작성중" },
  open: { intent: "brand", label: "모집중" },
  completed: { intent: "success", label: "완료" },
  closed: { intent: "neutral", label: "마감" },
  archived: { intent: "neutral", label: "보관" },
  hidden: { intent: "warning", label: "숨김" },
  removed: { intent: "neutral", label: "삭제됨" },
};

export function InterviewPostStatusBadge({ status }: { status: InterviewPost["status"] }) {
  const meta = interviewPostStatusMeta[status];
  return <Badge intent={meta.intent}>{meta.label}</Badge>;
}

const applicationStatusMeta: Record<
  Application["status"],
  { intent: "neutral" | "brand" | "success" | "warning" | "danger"; label: string }
> = {
  applied: { intent: "brand", label: "신청됨" },
  selected: { intent: "success", label: "선정됨" },
  rejected: { intent: "danger", label: "반려됨" },
  canceled: { intent: "neutral", label: "취소됨" },
  no_show: { intent: "warning", label: "노쇼" },
  completed: { intent: "success", label: "완료" },
};

export function ApplicationStatusBadge({ status }: { status: Application["status"] }) {
  const meta = applicationStatusMeta[status];
  return <Badge intent={meta.intent}>{meta.label}</Badge>;
}

const sessionStatusMeta: Record<
  Session["status"],
  { intent: "neutral" | "success" | "warning" | "danger"; label: string }
> = {
  scheduled: { intent: "warning", label: "예정" },
  completed: { intent: "success", label: "완료" },
  no_show: { intent: "danger", label: "노쇼" },
  canceled: { intent: "neutral", label: "취소됨" },
};

export function SessionStatusBadge({ status }: { status: Session["status"] }) {
  const meta = sessionStatusMeta[status];
  return <Badge intent={meta.intent}>{meta.label}</Badge>;
}
