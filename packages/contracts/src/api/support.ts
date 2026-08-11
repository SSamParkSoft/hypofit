export type SupportTicketKind = "inquiry" | "report" | "privacy" | "account_deletion";

export type SupportTicketCategory =
  | "account"
  | "interview_post"
  | "application"
  | "chat"
  | "reward"
  | "privacy"
  | "abuse"
  | "no_show"
  | "other";

export type SupportTicketTargetType =
  | "interview_post"
  | "application"
  | "chat_room"
  | "chat_message"
  | "user"
  | "session";

export type SupportTicketStatus = "open" | "in_review" | "resolved" | "closed";

export interface CreateSupportTicketInput {
  kind: SupportTicketKind;
  category: SupportTicketCategory;
  subject?: string | null;
  body: string;
  contact_email: string;
  target_type?: SupportTicketTargetType | null;
  target_id?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateSupportTicketInput {
  category?: SupportTicketCategory;
  subject?: string | null;
  body?: string;
  contact_email?: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  kind: SupportTicketKind;
  category: SupportTicketCategory;
  subject: string | null;
  body: string;
  contact_email: string;
  target_type: SupportTicketTargetType | null;
  target_id: string | null;
  status: SupportTicketStatus | string;
  deleted_by_user_at?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  replies: SupportTicketReply[];
}

export interface SupportTicketReply {
  id: string;
  ticket_id: string;
  message: string;
  created_at: string;
}

export interface AdminSupportTicketStatusUpdateInput {
  status: SupportTicketStatus;
  reason?: string | null;
}

export interface AdminSupportTicketReplyCreateInput {
  body: string;
  visible_to_user?: boolean;
}

export interface SupportTicketEvent {
  id: string;
  ticket_id: string;
  actor_user_id: string | null;
  actor_type: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminSupportTicket extends SupportTicket {
  events: SupportTicketEvent[];
}
