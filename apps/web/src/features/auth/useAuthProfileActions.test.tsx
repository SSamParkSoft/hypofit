import type { Session, User } from "@supabase/supabase-js";
import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  meSync: vi.fn(),
  meUpdate: vi.fn(),
}));

vi.mock("../../shared/api/me", () => ({
  meApi: {
    sync: mocks.meSync,
    update: mocks.meUpdate,
  },
}));

vi.mock("../../shared/supabase/client", () => ({
  supabase: { auth: {} },
}));

import { useAuthProfileActions } from "./useAuthProfileActions";

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

describe("useAuthProfileActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores the synced app user for the current social session token", async () => {
    mocks.meSync.mockResolvedValue({
      bio: null,
      email: "founder@example.com",
      id: "user-1",
      name: "Founder",
      phone: null,
      profile_image_path: null,
      profile_image_url: null,
      role: "founder",
    });

    const { result } = renderHook(() => {
      const [appUser, setAppUser] = useState<unknown>(null);
      const [errorMessage, setErrorMessage] = useState<string | null>(null);
      const [isSyncing, setIsSyncing] = useState(false);
      const actions = useAuthProfileActions({
        session,
        setAppUser,
        setErrorMessage,
        setIsSyncing,
      });

      return { ...actions, appUser, errorMessage, isSyncing };
    });

    await act(async () => {
      await result.current.syncCurrentUser({
        bio: null,
        name: "Founder",
        phone: null,
        role: "founder",
      });
    });

    expect(mocks.meSync).toHaveBeenCalledWith(
      { bio: null, name: "Founder", phone: null, role: "founder" },
      "token-123",
    );
    expect(result.current.appUser).toMatchObject({ id: "user-1", name: "Founder", role: "founder" });
    expect(result.current.errorMessage).toBeNull();
    expect(result.current.isSyncing).toBe(false);
  });
});
