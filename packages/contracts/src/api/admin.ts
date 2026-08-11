import type { Notification } from "./notifications";
import type { PushDispatchResult } from "./push";
import type {
  AdminSupportTicket,
  AdminSupportTicketReplyCreateInput,
  AdminSupportTicketStatusUpdateInput,
  SupportTicketKind,
  SupportTicketStatus,
} from "./support";

export type AdminTargetType =
  | "user"
  | "interview_post"
  | "application"
  | "chat_room"
  | "chat_message"
  | "session";

export type AdminTestNotificationType =
  | "chat_message"
  | "application_created"
  | "application_selected"
  | "application_rejected"
  | "session_rescheduled"
  | "session_canceled"
  | "no_show_marked"
  | "support_replied";

export type AdminNotificationTargetType =
  | "application"
  | "chat_room"
  | "interview_post"
  | "interview_session"
  | "support_ticket";

export interface AdminMe {
  id: string;
  email: string;
  name: string;
  role: "admin" | string;
}

export interface AdminSupportSummary {
  open: number;
  in_review: number;
  reports_open: number;
  account_deletion_open: number;
}

export interface AdminHealthSummary {
  api: string;
  database: string;
  push: string;
  outbound_email: string;
}

export interface AdminSummary {
  support: AdminSupportSummary;
  health: AdminHealthSummary;
}

export interface AdminTicketListParams {
  kind?: SupportTicketKind;
  status?: SupportTicketStatus;
  deleted_by_user?: boolean;
  limit?: number;
}

export type AdminTicketStatusUpdateInput = AdminSupportTicketStatusUpdateInput;
export type AdminTicketReplyInput = AdminSupportTicketReplyCreateInput;

export interface AdminTargetPreview {
  target_type: AdminTargetType;
  target_id: string;
  exists: boolean;
  title: string | null;
  summary: string | null;
  status: string | null;
  owner_user_id: string | null;
  metadata: Record<string, unknown>;
}

export interface AdminModerationActionCreateInput {
  target_type: AdminTargetType;
  target_id: string;
  action: "warn" | "hide" | "remove" | "block" | "unblock" | "close_report" | "restore";
  reason?: string | null;
  source_ticket_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AdminModerationAction {
  id: string;
  actor_user_id: string | null;
  target_type: string;
  target_id: string;
  action: string;
  reason: string | null;
  source_ticket_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminTestNotificationInput {
  email: string;
  type: AdminTestNotificationType;
  target_type?: AdminNotificationTargetType | null;
  target_id?: string | null;
  dispatch?: boolean;
}

export interface AdminTestNotificationResult {
  notification: Notification;
  dispatch_result: PushDispatchResult | null;
}

export type { AdminSupportTicket };

