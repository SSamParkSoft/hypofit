import type { Application } from "./applications";
import type { InterviewPost } from "./interview-posts";
import type { AttendanceRecord, InterviewReview, RewardConfirmation, Session } from "./sessions";
import type { UserSummary } from "./users";

export type ChatRoomStatus = "open" | "selected" | "closed" | "blocked";

export type ChatMessageType =
  | "system"
  | "user"
  | "application_created"
  | "application_selected"
  | "application_rejected"
  | "schedule_created";

export interface CreateChatMessageInput {
  body: string;
  client_message_id?: string | null;
}

export interface UpdateChatRoomSettingsInput {
  is_muted?: boolean | null;
  is_hidden?: boolean | null;
}

export interface UpdateChatRoomReadInput {
  last_read_message_id?: string | null;
}

export interface ChatRoom {
  id: string;
  interview_post_id: string;
  application_id: string;
  founder_id: string;
  respondent_id: string;
  status: ChatRoomStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  application?: Application | null;
  interview_post?: InterviewPost | null;
  founder?: UserSummary | null;
  respondent?: UserSummary | null;
  last_message?: ChatMessage | null;
  unread_count: number;
  is_muted: boolean;
  is_hidden: boolean;
  last_read_at: string | null;
}

export interface ChatRoomSettings {
  room_id: string;
  user_id: string;
  is_muted: boolean;
  is_hidden: boolean;
  last_read_at: string | null;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string | null;
  message_type: ChatMessageType;
  body: string;
  client_message_id?: string | null;
  metadata: Record<string, unknown>;
  hidden_at?: string | null;
  hidden_reason?: string | null;
  created_at: string;
}

export type ChatWorkflowAction =
  | "open_application_answers"
  | "select_application"
  | "reject_application"
  | "create_schedule"
  | "confirm_attendance"
  | "mark_no_show"
  | "mark_reward_paid"
  | "confirm_reward_received"
  | "dispute_reward"
  | "write_review"
  | "open_support_report";

export type ChatWorkflowStep =
  | "application_review"
  | "selected"
  | "schedule_needed"
  | "scheduled"
  | "attendance_confirmation_needed"
  | "attendance_counterpart_pending"
  | "completed"
  | "reward_payment_needed"
  | "reward_confirmation_needed"
  | "reward_confirmed"
  | "review_needed"
  | "closed"
  | "problem_reported";

export interface WorkflowAction {
  action: ChatWorkflowAction;
  label: string;
  tone: "default" | "primary" | "danger";
}

export interface ChatWorkflow {
  step: ChatWorkflowStep;
  title: string;
  description?: string | null;
  primary_action?: WorkflowAction | null;
  secondary_action?: WorkflowAction | null;
  danger_action?: WorkflowAction | null;
  session?: Session | null;
  attendance?: AttendanceRecord | null;
  reward?: RewardConfirmation | null;
  my_review?: InterviewReview | null;
  counterpart_review_submitted: boolean;
}
