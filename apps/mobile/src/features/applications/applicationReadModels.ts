import {
  formatUserDisplayName,
  type Application,
  type InterviewPost,
  type Session,
} from "@hypofit/contracts";
import { formatSessionTime } from "@/features/sessions/sessionPresentation";

export interface ApplicationReadModel {
  application: Application;
  answerCount: number;
  applicationLabel: string;
  availableTimeCount: number;
  displayTitle: string;
  post?: InterviewPost;
  participantLabel: string;
  session?: Session;
  sessionTimeLabel: string | null;
  targetSummary: string;
}

export function buildApplicationReadModels({
  applications,
  posts,
  sessions,
}: {
  applications: Application[];
  posts: InterviewPost[];
  sessions: Session[];
}): ApplicationReadModel[] {
  const postById = new Map(posts.map((post) => [post.id, post]));
  const sessionByApplicationId = new Map(sessions.map((session) => [session.application_id, session]));

  return applications.map((application) => {
    const post = postById.get(application.interview_post_id);
    const session = sessionByApplicationId.get(application.id);
    return {
      application,
      answerCount: Object.keys(application.answers).length,
      applicationLabel: `지원 ${shortId(application.id)}`,
      availableTimeCount: application.available_times.length,
      displayTitle: post?.title ?? `공고 ${shortId(application.interview_post_id)}`,
      post,
      participantLabel: formatUserDisplayName(application.respondent),
      session,
      sessionTimeLabel: session ? formatSessionTime(session.scheduled_at) : null,
      targetSummary: post?.target_description ?? "공고 정보를 불러오면 참여 조건이 표시됩니다.",
    };
  });
}

export function formatAnswerLabel(key: string): string {
  const labels: Record<string, string> = {
    experience: "관련 경험",
    relevant_experience: "관련 경험",
    motivation: "참여 이유",
    reason: "참여 이유",
  };

  return labels[key] ?? key.replace(/_/g, " ");
}

function shortId(id: string): string {
  return id.slice(0, 8);
}
