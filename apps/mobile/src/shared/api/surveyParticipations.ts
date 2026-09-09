import type { SurveyParticipation, SurveyParticipationAction } from "@hypofit/contracts";
import { apiRequest } from "./client";

const surveyBasePath = (postId: string) =>
  `/api/v1/interview-posts/${encodeURIComponent(postId)}/survey`;

export const surveyParticipationRoutes = {
  current: (postId: string) => `${surveyBasePath(postId)}/participation`,
  open: (postId: string) => `${surveyBasePath(postId)}/open`,
  submit: (postId: string) => `${surveyBasePath(postId)}/submit`,
  withdraw: (postId: string) => `${surveyBasePath(postId)}/withdraw`,
  participants: (postId: string) => `${surveyBasePath(postId)}/participants`,
  confirm: (postId: string) => `${surveyBasePath(postId)}/confirm`,
} as const;

export const surveyParticipationsApi = {
  participants(postId: string, accessToken?: string | null) {
    return apiRequest<SurveyParticipation[]>(surveyParticipationRoutes.participants(postId), { accessToken });
  },
  confirm(postId: string, participantId: string, accessToken?: string | null) {
    return apiRequest<SurveyParticipation>(surveyParticipationRoutes.confirm(postId), {
      accessToken, method: "POST", body: JSON.stringify({ participant_id: participantId }),
    });
  },
  current(postId: string, accessToken?: string | null) {
    return apiRequest<SurveyParticipation | null>(surveyParticipationRoutes.current(postId), {
      accessToken,
    });
  },
  open(postId: string, accessToken?: string | null) {
    return apiRequest<SurveyParticipationAction>(surveyParticipationRoutes.open(postId), {
      accessToken,
      method: "POST",
    });
  },
  submit(postId: string, accessToken?: string | null) {
    return apiRequest<SurveyParticipationAction>(surveyParticipationRoutes.submit(postId), {
      accessToken,
      method: "POST",
    });
  },
  withdraw(postId: string, accessToken?: string | null) {
    return apiRequest<SurveyParticipationAction>(surveyParticipationRoutes.withdraw(postId), {
      accessToken,
      method: "POST",
    });
  },
} as const;
