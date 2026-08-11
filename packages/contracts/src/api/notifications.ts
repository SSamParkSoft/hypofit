export type NotificationType =
  | "chat_message"
  | "application_created"
  | "application_selected"
  | "application_rejected"
  | "application_withdrawn"
  | "attendance_confirmation_requested"
  | "session_rescheduled"
  | "session_canceled"
  | "session_completed"
  | "reward_marked_paid"
  | "reward_confirmed"
  | "reward_disputed"
  | "review_received"
  | "no_show_marked"
  | "support_replied";

export type NotificationTargetType =
  | "application"
  | "chat_room"
  | "interview_post"
  | "interview_session"
  | "support_ticket";

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType | string;
  title: string;
  body: string;
  target_type: NotificationTargetType | string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
