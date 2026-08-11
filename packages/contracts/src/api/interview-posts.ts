import type { InterviewMode } from "../domain/interviewModes";
import type { UserSummary } from "./users";

export type InterviewPostStatus =
  | "draft"
  | "open"
  | "completed"
  | "closed"
  | "archived"
  | "hidden"
  | "removed";

export type LocationPrecision = "exact" | "nearby" | "district";

export type LocationSource = "kakao_place" | "manual" | "current_location";

export interface FounderReviewSummary {
  average_rating: number | null;
  review_count: number;
  latest_reviewed_at: string | null;
}

export interface InterviewAiSummary {
  status: "pending" | "processing" | "ready" | "failed";
  content: {
    overview: string;
    target_fit: string;
    key_points: string[];
  } | null;
  updated_at: string;
}

export interface InterviewPost {
  id: string;
  founder_id: string;
  founder?: UserSummary | null;
  founder_review_summary?: FounderReviewSummary | null;
  title: string;
  service_summary: string;
  target_description: string;
  reward_amount: number;
  duration_minutes: number;
  recruit_count: number;
  interview_mode: InterviewMode;
  location: string | null;
  location_text: string | null;
  location_address: string | null;
  location_place_name: string | null;
  location_latitude: number | null;
  location_longitude: number | null;
  location_precision: LocationPrecision | null;
  location_source: LocationSource | null;
  distance_meters: number | null;
  schedule_options: string[];
  status: InterviewPostStatus;
  ai_summary?: InterviewAiSummary | null;
}

export type InterviewPostViewSource = "home" | "interviews" | "map" | "detail" | "chat";

export interface InterviewPostView {
  id: string;
  user_id: string;
  interview_post_id: string;
  first_viewed_at: string;
  last_viewed_at: string;
  view_count: number;
  source: InterviewPostViewSource;
}

export interface CreateInterviewPostInput {
  title: string;
  service_summary: string;
  target_description: string;
  reward_amount: number;
  duration_minutes: number;
  recruit_count?: number;
  interview_mode: InterviewMode;
  location?: string | null;
  location_text?: string | null;
  location_address?: string | null;
  location_place_name?: string | null;
  location_latitude?: number | null;
  location_longitude?: number | null;
  location_precision?: LocationPrecision | null;
  location_source?: LocationSource | null;
  schedule_options?: string[];
  status?: "draft" | "open";
}

export type UpdateInterviewPostInput = Partial<
  Omit<InterviewPost, "id" | "founder_id" | "founder" | "distance_meters" | "ai_summary" | "status">
> & {
  status?: "draft" | "open";
};

export interface UpdateInterviewPostStatusInput {
  status: "closed";
}
