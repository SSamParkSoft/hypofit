import type { SurveyParticipation, SurveyParticipationAction } from "@hypofit/contracts";
import { apiRequest } from "./client";

export const surveyParticipationsApi = {
  current(postId: string, accessToken: string) {
    return apiRequest<SurveyParticipation | null>(`/api/v1/interview-posts/${encodeURIComponent(postId)}/survey/participation`, { accessToken });
  },
  act(postId: string, action: "open" | "submit" | "withdraw", accessToken: string) {
    return apiRequest<SurveyParticipationAction>(`/api/v1/interview-posts/${encodeURIComponent(postId)}/survey/${action}`, {
      accessToken, method: "POST",
    });
  },
};
