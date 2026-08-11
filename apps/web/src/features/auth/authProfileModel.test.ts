import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { ApiError } from "../../shared/api/client";
import {
  buildDefaultSyncInput,
  buildRoleOnboardingSyncInput,
  getMetadataRole,
  isMissingAppUserError,
} from "./authProfileModel";

function createUser(overrides?: Partial<User>): User {
  return {
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-07-16T00:00:00.000Z",
    email: "founder@example.com",
    id: "user-1",
    role: "authenticated",
    updated_at: "2026-07-16T00:00:00.000Z",
    user_metadata: {},
    ...overrides,
  } as User;
}

describe("authProfileModel", () => {
  it("builds the default sync payload from trimmed user metadata", () => {
    const user = createUser({
      user_metadata: {
        bio: "  초기 사용자 인터뷰를 진행해요. ",
        name: "  박세현 ",
        phone: " 010-1234-5678 ",
        role: "founder",
      },
    });

    expect(getMetadataRole(user)).toBe("founder");
    expect(buildDefaultSyncInput(user)).toEqual({
      bio: "초기 사용자 인터뷰를 진행해요.",
      name: "박세현",
      phone: "010-1234-5678",
      role: "founder",
    });
  });

  it("fills role-onboarding sync input from metadata, app user, and email fallback", () => {
    const metadataUser = createUser({
      user_metadata: {
        bio: "  메타데이터 소개 ",
        name: "  메타데이터 이름 ",
        phone: " 010-0000-0000 ",
      },
    });
    const fallbackUser = createUser({ email: "respondent@example.com" });

    expect(
      buildRoleOnboardingSyncInput(metadataUser, "both", {
        bio: "기존 소개",
        email: "existing@example.com",
        id: "user-1",
        name: "기존 이름",
        phone: "010-9999-9999",
        profile_image_path: null,
        profile_image_url: null,
        role: "founder",
      }),
    ).toEqual({
      bio: "메타데이터 소개",
      name: "메타데이터 이름",
      phone: "010-0000-0000",
      role: "both",
    });

    expect(buildRoleOnboardingSyncInput(fallbackUser, "respondent", null)).toEqual({
      bio: null,
      name: "respondent",
      phone: null,
      role: "respondent",
    });
  });

  it("detects profile-missing API errors from the auth sync paths", () => {
    const profileMissingError = new ApiError({
      code: "profile_missing",
      kind: "http",
      message: "프로필 설정이 필요해요.",
      method: "GET",
      path: "/api/v1/me",
      status: 403,
    });
    const deletedAccountError = new ApiError({
      code: "account_deleted",
      kind: "http",
      message: "삭제된 계정이에요.",
      method: "GET",
      path: "/api/v1/me",
      status: 403,
    });

    expect(isMissingAppUserError(profileMissingError)).toBe(true);
    expect(isMissingAppUserError(deletedAccountError)).toBe(false);
    expect(isMissingAppUserError(new Error("Request failed with status 403"))).toBe(false);
    expect(isMissingAppUserError(new Error("Request failed with status 404"))).toBe(true);
    expect(isMissingAppUserError(new Error("Request failed with status 500"))).toBe(false);
    expect(isMissingAppUserError("403")).toBe(false);
  });
});
