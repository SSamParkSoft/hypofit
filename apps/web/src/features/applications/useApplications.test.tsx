import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ContextType, ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock("../../shared/api/applications", () => ({
  applicationsApi: {
    list: mocks.list,
  },
}));

import { AuthContext } from "../auth/AuthProvider";
import { applicationQueryKeys, useApplications } from "./useApplications";

type AuthContextValue = NonNullable<ContextType<typeof AuthContext>>;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function createAuthContextValue(overrides?: Partial<AuthContextValue>) {
  return {
    accessToken: "token-123",
    appUser: { id: "app-user-1" } as AuthContextValue["appUser"],
    completeRoleOnboarding: vi.fn(),
    errorMessage: null,
    isLoading: false,
    isSyncing: false,
    requiresRoleOnboarding: false,
    session: null,
    signOut: vi.fn(),
    syncCurrentUser: vi.fn(),
    updateCurrentUser: vi.fn(),
    user: { id: "session-user-1" } as AuthContextValue["user"],
    ...overrides,
  } as AuthContextValue;
}

function createWrapper(
  queryClient: QueryClient,
  getAuthContextValue: () => AuthContextValue,
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <AuthContext.Provider value={getAuthContextValue()}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </AuthContext.Provider>
    );
  };
}

describe("useApplications", () => {
  beforeEach(() => {
    mocks.list.mockResolvedValue([{ id: "application-1" }]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("keys applications by stable user id and passes an AbortSignal to the API method", async () => {
    const queryClient = createQueryClient();
    let authContextValue = createAuthContextValue();
    const wrapper = createWrapper(queryClient, () => authContextValue);

    const { result, rerender } = renderHook(
      ({ accessToken }: { accessToken?: string | null }) => useApplications(accessToken),
      {
        initialProps: { accessToken: "token-123" },
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.data).toEqual([{ id: "application-1" }]));

    expect(mocks.list).toHaveBeenCalledWith(
      "token-123",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(queryClient.getQueryData(applicationQueryKeys.list("session-user-1"))).toEqual([
      { id: "application-1" },
    ]);

    authContextValue = createAuthContextValue({
      accessToken: "token-456",
      appUser: { id: "session-user-1" } as AuthContextValue["appUser"],
      user: { id: "session-user-1" } as AuthContextValue["user"],
    });

    rerender({ accessToken: "token-456" });

    await waitFor(() => expect(result.current.data).toEqual([{ id: "application-1" }]));
    expect(mocks.list).toHaveBeenCalledTimes(1);
  });
});
