import type { User } from "@supabase/supabase-js";

import type { AppUser, SyncMeInput, UserRole } from "../../shared/api/types";
import { isApiError } from "../../shared/api/client";

const COMPATIBILITY_ROLE: UserRole = "both";

export function getMetadataRole(user: User | null | undefined): UserRole | null {
  const role = user?.user_metadata?.role;

  return role === "founder" || role === "respondent" || role === "both" ? role : null;
}

export function getOptionalMetadataValue(user: User, key: "bio" | "name" | "phone") {
  const value = user.user_metadata?.[key];

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : null;
}

export function getDisplayName(user: User) {
  return getOptionalMetadataValue(user, "name") ?? user.email?.split("@")[0] ?? "Hypofit user";
}

export function buildDefaultSyncInput(user: User): SyncMeInput {
  return {
    name: getDisplayName(user),
    bio: getOptionalMetadataValue(user, "bio"),
    phone: getOptionalMetadataValue(user, "phone"),
    role: getMetadataRole(user) ?? COMPATIBILITY_ROLE,
  };
}

export function buildRoleOnboardingSyncInput(
  user: User,
  role: UserRole,
  appUser: AppUser | null,
): SyncMeInput {
  return {
    name: getOptionalMetadataValue(user, "name") ?? appUser?.name ?? getDisplayName(user),
    bio: getOptionalMetadataValue(user, "bio") ?? appUser?.bio ?? null,
    phone: getOptionalMetadataValue(user, "phone") ?? appUser?.phone ?? null,
    role,
  };
}

export function isMissingAppUserError(error: unknown) {
  if (isApiError(error)) {
    return (
      error.code === "profile_missing" ||
      error.code === "role_onboarding_required" ||
      error.status === 404
    );
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return error.message.includes("404");
}
