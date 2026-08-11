import type { UserSummary } from "./users";

export interface UserBlockCreateInput {
  reason?: string | null;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_user_id: string;
  reason: string | null;
  source: string;
  created_at: string;
  revoked_at: string | null;
  blocked_user?: UserSummary | null;
}
