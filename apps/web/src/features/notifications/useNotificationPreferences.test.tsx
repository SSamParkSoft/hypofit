import type { NotificationPreference } from "@hypofit/contracts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ContextType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPreferences: vi.fn(),
  updatePreferences: vi.fn(),
}));

vi.mock("../../shared/api/push", () => ({
  pushApi: {
    getPreferences: mocks.getPreferences,
    updatePreferences: mocks.updatePreferences,
  },
}));

import { AuthContext } from "../auth/AuthProvider";
import {
  notificationPreferenceQueryKeys,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "./useNotificationPreferences";

type AuthContextValue = NonNullable<ContextType<typeof AuthContext>>;

const preference: NotificationPreference = {
  application_push_enabled: true,
  chat_push_enabled: true,
  created_at: "2026-07-17T00:00:00Z",
  marketing_push_enabled: false,
  push_enabled: true,
  session_push_enabled: true,
  support_push_enabled: true,
  updated_at: "2026-07-17T00:00:00Z",
  user_id: "session-user-1",
};

describe("notification preference hooks", () => {
  beforeEach(() => {
    mocks.getPreferences.mockResolvedValue(preference);
    mocks.updatePreferences.mockResolvedValue({ ...preference, chat_push_enabled: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keys preferences by stable user id and forwards query cancellation", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useNotificationPreferences(), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(preference));

    expect(mocks.getPreferences).toHaveBeenCalledWith(
      "token-123",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(
      queryClient.getQueryData(notificationPreferenceQueryKeys.detail("session-user-1")),
    ).toEqual(preference);
  });

  it("writes the updated preference into the current user's cache", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const { result } = renderHook(() => useUpdateNotificationPreferences(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ chat_push_enabled: false });
    });

    expect(mocks.updatePreferences).toHaveBeenCalledWith(
      { chat_push_enabled: false },
      "token-123",
    );
    expect(
      queryClient.getQueryData(notificationPreferenceQueryKeys.detail("session-user-1")),
    ).toEqual({ ...preference, chat_push_enabled: false });
  });
});

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function createWrapper(queryClient: QueryClient) {
  const value = {
    accessToken: "token-123",
    appUser: { id: "app-user-1" },
    user: { id: "session-user-1" },
  } as AuthContextValue;

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={value}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AuthContext.Provider>
    );
  };
}
