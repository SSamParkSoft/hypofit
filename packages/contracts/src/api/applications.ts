import type { UserSummary } from "./users";

export type ApplicationStatus =
  | "applied"
  | "selected"
  | "rejected"
  | "canceled"
  | "no_show"
  | "completed";

export interface ApplicantAiSummary {
  status: "pending" | "processing" | "ready" | "failed";
  content: {
    overview: string;
    relevant_experience: string[];
    availability: string;
    questions_to_confirm: string[];
  } | null;
  updated_at: string;
}

export interface Application {
  id: string;
  interview_post_id: string;
  respondent_id: string;
  answers: Record<string, string>;
  available_times: string[];
  status: ApplicationStatus;
  rejection_reason: string | null;
  respondent?: UserSummary | null;
  ai_summary?: ApplicantAiSummary | null;
}

export interface CreateApplicationInput {
  interview_post_id: string;
  answers?: Record<string, string>;
  available_times?: string[];
}

export interface UpdateApplicationStatusInput {
  status: "selected" | "rejected" | "canceled";
  rejection_reason?: string | null;
}
