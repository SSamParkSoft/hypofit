export type ModerationTargetType =
  | "user"
  | "interview_post"
  | "application"
  | "chat_room"
  | "chat_message"
  | "session";

export type ModerationActionType =
  | "warn"
  | "hide"
  | "remove"
  | "block"
  | "unblock"
  | "close_report"
  | "restore";

export interface ModerationActionCreateInput {
  target_type: ModerationTargetType;
  target_id: string;
  action: ModerationActionType;
  reason?: string | null;
  source_ticket_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ModerationAction {
  id: string;
  actor_user_id: string | null;
  target_type: ModerationTargetType | string;
  target_id: string;
  action: ModerationActionType | string;
  reason: string | null;
  source_ticket_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
