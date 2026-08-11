import type {
  ConfirmAttendanceResult,
  CreateInterviewReviewInput,
  DisputeRewardInput,
  InterviewReview,
  RewardConfirmation,
  Session,
} from "@hypofit/contracts";
import { apiRequest } from "./client";

export interface CreateSessionInput {
  application_id: string;
  scheduled_at: string;
  meeting_type: "offline" | "online";
  meeting_url?: string | null;
  place?: string | null;
}

export interface MarkNoShowInput {
  no_show_party?: "founder" | "respondent" | null;
}

const sessionsCollectionPath = "/api/v1/sessions/";

export const sessionRoutes = {
  collection: sessionsCollectionPath,
  confirmAttendance: (sessionId: string) =>
    `${sessionsCollectionPath}${encodeURIComponent(sessionId)}/confirm-attendance`,
  complete: (sessionId: string) =>
    `${sessionsCollectionPath}${encodeURIComponent(sessionId)}/complete`,
  noShow: (sessionId: string) =>
    `${sessionsCollectionPath}${encodeURIComponent(sessionId)}/no-show`,
  rewardConfirm: (sessionId: string) =>
    `${sessionsCollectionPath}${encodeURIComponent(sessionId)}/reward/confirm`,
  rewardDispute: (sessionId: string) =>
    `${sessionsCollectionPath}${encodeURIComponent(sessionId)}/reward/dispute`,
  rewardMarkPaid: (sessionId: string) =>
    `${sessionsCollectionPath}${encodeURIComponent(sessionId)}/reward/mark-paid`,
  reviews: (sessionId: string) =>
    `${sessionsCollectionPath}${encodeURIComponent(sessionId)}/reviews`,
} as const;

export const sessionsApi = {
  list(accessToken?: string | null) {
    return apiRequest<Session[]>(sessionRoutes.collection, { accessToken });
  },
  create(input: CreateSessionInput, accessToken?: string | null) {
    return apiRequest<Session>(sessionRoutes.collection, {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    });
  },
  complete(sessionId: string, accessToken?: string | null) {
    return apiRequest<Session>(sessionRoutes.complete(sessionId), {
      method: "POST",
      accessToken,
    });
  },
  confirmAttendance(sessionId: string, accessToken?: string | null) {
    return apiRequest<ConfirmAttendanceResult>(sessionRoutes.confirmAttendance(sessionId), {
      method: "POST",
      accessToken,
    });
  },
  markRewardPaid(sessionId: string, accessToken?: string | null) {
    return apiRequest<RewardConfirmation>(sessionRoutes.rewardMarkPaid(sessionId), {
      method: "POST",
      accessToken,
    });
  },
  confirmRewardReceived(sessionId: string, accessToken?: string | null) {
    return apiRequest<RewardConfirmation>(sessionRoutes.rewardConfirm(sessionId), {
      method: "POST",
      accessToken,
    });
  },
  disputeReward(sessionId: string, input: DisputeRewardInput, accessToken?: string | null) {
    return apiRequest<RewardConfirmation>(sessionRoutes.rewardDispute(sessionId), {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    });
  },
  createReview(sessionId: string, input: CreateInterviewReviewInput, accessToken?: string | null) {
    return apiRequest<InterviewReview>(sessionRoutes.reviews(sessionId), {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    });
  },
  markNoShow(sessionId: string, input: MarkNoShowInput, accessToken?: string | null) {
    return apiRequest<Session>(sessionRoutes.noShow(sessionId), {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    });
  },
} as const;
