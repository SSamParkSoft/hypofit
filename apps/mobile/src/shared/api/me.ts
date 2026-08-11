import type { AppUser, SyncMeInput, UpdateMeInput } from "@hypofit/contracts";
import { apiRequest } from "./client";

export function getMe(accessToken: string): Promise<AppUser> {
  return apiRequest<AppUser>("/api/v1/me", { accessToken });
}

export function syncMe(input: SyncMeInput, accessToken: string): Promise<AppUser> {
  return apiRequest<AppUser>("/api/v1/me/sync", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function updateMe(input: UpdateMeInput, accessToken: string): Promise<AppUser> {
  return apiRequest<AppUser>("/api/v1/me", {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
}

export const meApi = {
  get: getMe,
  sync: syncMe,
  update: updateMe,
} as const;
