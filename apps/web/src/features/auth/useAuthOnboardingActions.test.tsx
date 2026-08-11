import type { Session, User } from "@supabase/supabase-js";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  meGet: vi.fn(),
  meSync: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("../../shared/api/me", () => ({
  meApi: {
    get: mocks.meGet,
    sync: mocks.meSync,
  },
}));

vi.mock("../../shared/supabase/client", () => ({
  supabase: {
    auth: {
      updateUser: mocks.updateUser,
    },
  },
}));

import { useAuthOnboardingActions } from "./useAuthOnboardingActions";

const session: Session = {
  access_token: "token-123",
  expires_at: 1_725_000_000,
  expires_in: 3600,
  refresh_token: "refresh-123",
  token_type: "bearer",
  user: {
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-07-16T00:00:00.000Z",
    email: "founder@example.com",
    id: "user-1",
    role: "authenticated",
    updated_at: "2026-07-16T00:00:00.000Z",
    user_metadata: {},
  } as User,
} as Session;

describe("useAuthOnboardingActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates Supabase metadata and syncs the API profile when onboarding completes", async () => {
    mocks.meGet.mockRejectedValue(new Error("Request failed with status 404"));
    mocks.updateUser.mockResolvedValue({
      data: {
        user: {
          ...session.user,
          user_metadata: { role: "both" },
        },
      },
      error: null,
    });
    mocks.meSync.mockResolvedValue({
      bio: null,
      email: "founder@example.com",
      id: "user-1",
      name: "founder",
      phone: null,
      profile_image_path: null,
      profile_image_url: null,
      role: "both",
    });

    const updateSessionUser = vi.fn();
    const { result } = renderHook(() => {
      const [appUser, setAppUser] = useState<unknown>(null);
      const [errorMessage, setErrorMessage] = useState<string | null>(null);
      const [hasPendingRoleSync, setHasPendingRoleSync] = useState(false);
      const [isSyncing, setIsSyncing] = useState(false);
      const actions = useAuthOnboardingActions({
        appUser: null,
        session,
        setAppUser,
        setErrorMessage,
        setHasPendingRoleSync,
        setIsSyncing,
        updateSessionUser,
      });

      return {
        ...actions,
        appUser,
        errorMessage,
        hasPendingRoleSync,
        isSyncing,
      };
    });

    await act(async () => {
      await result.current.completeRoleOnboarding({ role: "both" });
    });

    expect(mocks.meGet).toHaveBeenCalledWith("token-123");
    expect(mocks.updateUser).toHaveBeenCalledWith({
      data: {
        bio: null,
        name: "founder",
        phone: null,
        role: "both",
      },
    });
    expect(mocks.meSync).toHaveBeenCalledWith(
      {
        bio: null,
        name: "founder",
        phone: null,
        role: "both",
      },
      "token-123",
    );
    expect(updateSessionUser).toHaveBeenCalledWith(
      expect.objectContaining({
        user_metadata: { role: "both" },
      }),
    );
    expect(result.current.appUser).toMatchObject({
      id: "user-1",
      name: "founder",
      role: "both",
    });
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.hasPendingRoleSync).toBe(false);
    expect(result.current.isSyncing).toBe(false);
  });
});
