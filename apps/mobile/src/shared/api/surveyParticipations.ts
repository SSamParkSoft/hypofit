import type { SurveyParticipation, SurveyParticipationAction } from "@hypofit/contracts";
import { apiRequest } from "./client";

const surveyBasePath = (postId: string) =>
  `/api/v1/interview-posts/${encodeURIComponent(postId)}/survey`;

export const surveyParticipationRoutes = {
  current: (postId: string) => `${surveyBasePath(postId)}/participation`,
  open: (postId: string) => `${surveyBasePath(postId)}/open`,
  submit: (postId: string) => `${surveyBasePath(postId)}/submit`,
  withdraw: (postId: string) => `${surveyBasePath(postId)}/withdraw`,
} as const;

export const surveyParticipationsApi = {
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
