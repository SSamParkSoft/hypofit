import type { Application } from "./applications";

export type SessionStatus = "scheduled" | "completed" | "no_show" | "canceled";

export interface Session {
  id: string;
  application_id: string;
  scheduled_at: string;
  meeting_type: "offline" | "online";
  meeting_url: string | null;
  place: string | null;
  status: SessionStatus;
  application?: Application | null;
}

export interface AttendanceRecord {
  session_id: string;
  founder_confirmed: boolean;
  respondent_confirmed: boolean;
  founder_confirmed_at?: string | null;
  respondent_confirmed_at?: string | null;
  completed_at?: string | null;
  no_show_party?: "founder" | "respondent" | null;
}

export type RewardConfirmationStatus =
  | "pending"
  | "founder_marked_paid"
  | "respondent_confirmed"
  | "disputed"
  | "canceled";

export interface RewardConfirmation {
  id: string;
  session_id: string;
  application_id: string;
  founder_id: string;
  respondent_id: string;
  amount: number;
  status: RewardConfirmationStatus;
  founder_marked_paid_at?: string | null;
  respondent_confirmed_at?: string | null;
  disputed_at?: string | null;
  dispute_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewReview {
  id: string;
  session_id: string;
  reviewer_id: string;
  reviewee_id: string;
  reviewer_role: "founder" | "respondent";
  rating: number;
  tags: string[];
  comment?: string | null;
  visibility: string;
  created_at: string;
  updated_at: string;
}

export interface ConfirmAttendanceResult {
  session: Session;
  attendance: AttendanceRecord;
}

export interface DisputeRewardInput {
  reason?: string | null;
}

export interface CreateInterviewReviewInput {
  rating: number;
  tags?: string[];
  comment?: string | null;
}

export interface CreateSessionInput {
  application_id: string;
  scheduled_at: string;
  meeting_type: "offline" | "online";
  meeting_url?: string | null;
  place?: string | null;
}

export interface UpdateSessionInput {
  scheduled_at?: string | null;
  meeting_type?: "offline" | "online" | null;
  meeting_url?: string | null;
  place?: string | null;
  reason?: string | null;
}

export interface CancelSessionInput {
  reason?: string | null;
}

export interface CreateNoShowInput {
  no_show_party?: "founder" | "respondent" | null;
}
