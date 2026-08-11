import type { UserSummary } from "@hypofit/contracts";
import { apiRequest } from "./client";

export interface BlockUserInput {
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

const blockedUsersPath = "/api/v1/me/blocked-users";

export const blockRoutes = {
  blockedUsers: blockedUsersPath,
  userBlock: (userId: string) => `/api/v1/users/${encodeURIComponent(userId)}/block`,
} as const;

export const blocksApi = {
  block(userId: string, input: BlockUserInput, accessToken?: string | null) {
    return apiRequest<UserBlock>(blockRoutes.userBlock(userId), {
      method: "POST",
      accessToken,
      body: JSON.stringify(input),
    });
  },
  list(accessToken?: string | null) {
    return apiRequest<UserBlock[]>(blockRoutes.blockedUsers, { accessToken });
  },
  unblock(userId: string, accessToken?: string | null) {
    return apiRequest<void>(blockRoutes.userBlock(userId), {
      method: "DELETE",
      accessToken,
    });
  },
} as const;
