import type { InterviewMode } from "../domain/interviewModes";
import type { Compensation, PostingType } from "../domain/postings";
import type { UserSummary } from "./users";

export type InterviewPostStatus =
  | "draft"
  | "open"
  | "completed"
  | "closed"
  | "archived"
  | "hidden"
  | "removed";

/** @deprecated Use PostingType in new product UI. */
export type RecruitmentType = PostingType;
export type SurveyExternalProvider = "google_forms";
export type ParticipationEntryMode = "application_required" | "direct";
export type PostingDurationUnit = "minutes" | "hours" | "days" | "weeks";
export type PostingScheduleMode = "fixed" | "recurring" | "negotiated" | "none";
export type RecruitmentLimitMode = "limited" | "unlimited";

export interface InterviewPostCreationCapabilities {
  enabled_recruitment_types: PostingType[];
  direct_participation_recruitment_types: PostingType[];
}
export type SurveyParticipationStatus =
  | "opened"
  | "submitted"
  | "confirmed"
  | "withdrawn";

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
  created_at?: string;
  founder?: UserSummary | null;
  founder_review_summary?: FounderReviewSummary | null;
  recruitment_type?: RecruitmentType;
  /** Canonical compensation model. Legacy clients may only receive reward_amount. */
  compensations?: Compensation[];
  /** Canonical duration fields. duration_minutes remains for released-client compatibility. */
  duration_value?: number | null;
  duration_unit?: PostingDurationUnit | null;
  schedule_mode?: PostingScheduleMode | null;
  schedule_fixed_slots?: string[];
  schedule_recurring_windows?: string[];
  schedule_note?: string | null;
  recruitment_limit_mode?: RecruitmentLimitMode | null;
  external_provider?: SurveyExternalProvider | null;
  external_url?: string | null;
  /** Indicates that an external action can be opened without exposing its URL. */
  external_action_available?: boolean;
  participation_deadline_at?: string | null;
  external_data_notice?: string | null;
  beta_test_platforms?: string[] | null;
  beta_test_starts_at?: string | null;
  beta_test_ends_at?: string | null;
  beta_test_environment?: string | null;
  beta_test_workflow_note?: string | null;
  entry_mode?: ParticipationEntryMode;
  title: string;
  service_summary: string;
  target_description: string;
  participant_requirements?: string[];
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
  /** Reused only when retrying the same create request. */
  client_submission_id?: string;
  recruitment_type?: RecruitmentType;
  compensations?: Compensation[];
  duration_value?: number | null;
  duration_unit?: PostingDurationUnit | null;
  schedule_mode?: PostingScheduleMode | null;
  schedule_fixed_slots?: string[];
  schedule_recurring_windows?: string[];
  schedule_note?: string | null;
  recruitment_limit_mode?: RecruitmentLimitMode | null;
  external_provider?: SurveyExternalProvider | null;
  external_url?: string | null;
  participation_deadline_at?: string | null;
  external_data_notice?: string | null;
  beta_test_platforms?: string[] | null;
  beta_test_starts_at?: string | null;
  beta_test_ends_at?: string | null;
  beta_test_environment?: string | null;
  beta_test_workflow_note?: string | null;
  entry_mode?: ParticipationEntryMode;
  title: string;
  service_summary: string;
  target_description: string;
  participant_requirements?: string[];
  reward_amount: number;
  duration_minutes: number;
  recruit_count?: number;
  interview_mode?: InterviewMode;
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

export interface SurveyParticipation {
  id: string;
  post_id: string;
  status: SurveyParticipationStatus;
  opened_at: string | null;
  submitted_at: string | null;
  confirmed_at: string | null;
  withdrawn_at: string | null;
  created_at: string;
  updated_at: string;
  participant?: UserSummary | null;
}

/** Open grants a URL. Submit replays may mask it; withdrawal returns an empty string. */
export interface SurveyParticipationAction extends SurveyParticipation {
  external_url: string;
}

export type OpenSurveyParticipationInput = Record<string, never>;

export type SubmitSurveyParticipationInput = Record<string, never>;

export type WithdrawSurveyParticipationInput = Record<string, never>;

export interface ConfirmSurveyParticipationInput {
  participant_id: string;
}
