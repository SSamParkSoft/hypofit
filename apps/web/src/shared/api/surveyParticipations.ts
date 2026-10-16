import type { SurveyParticipation, SurveyParticipationAction } from "@hypofit/contracts";
import { apiRequest } from "./client";

export const surveyParticipationsApi = {
  async current(postId: string, accessToken: string) {
    const participation = await apiRequest<SurveyParticipation | null>(`/api/v1/interview-posts/${encodeURIComponent(postId)}/survey/participation`, { accessToken });
    // The server returns 204 before participation; query data must not be undefined.
    return participation ?? null;
  },
  act(postId: string, action: "open" | "submit" | "withdraw", accessToken: string) {
    return apiRequest<SurveyParticipationAction>(`/api/v1/interview-posts/${encodeURIComponent(postId)}/survey/${action}`, {
      accessToken, method: "POST",
    });
  },
};
