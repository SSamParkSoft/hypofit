import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const session = {
    access_token: "token-123",
    user: {
      email: "founder@example.com",
      id: "user-1",
      user_metadata: { role: "founder" },
    },
  };

  return {
    authStateChange: null as ((event: string, nextSession: unknown) => void) | null,
    getSession: vi.fn(),
    meGet: vi.fn(),
    meSync: vi.fn(),
    meUpdate: vi.fn(),
    onAuthStateChange: vi.fn(),
    session,
    signOut: vi.fn(),
    updateUser: vi.fn(),
  };
});

vi.mock("../../shared/api/me", () => ({
  meApi: {
    get: mocks.meGet,
    sync: mocks.meSync,
    update: mocks.meUpdate,
  },
}));

vi.mock("../../shared/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      getSession: mocks.getSession,
      onAuthStateChange: mocks.onAuthStateChange,
      signOut: mocks.signOut,
      updateUser: mocks.updateUser,
    },
  },
}));

import { PROTECTED_QUERY_SCOPE } from "../../shared/api/queryAuth";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./useAuth";

function renderAuth(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{ui}</AuthProvider>
      </QueryClientProvider>,
    ),
  };
}

function TestHarness() {
  const { completeRoleOnboarding, isLoading, signOut, session } = useAuth();

  if (isLoading) {
    return <p>loading</p>;
  }

  return (
    <div>
      <p>{session?.user.email ?? "signed-out"}</p>
      <button type="button" onClick={() => void signOut()}>
        sign out
      </button>
      <button type="button" onClick={() => void completeRoleOnboarding({ role: "both" })}>
        complete role
      </button>
    </div>
  );
}

describe("AuthProvider social session lifecycle", () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({
      data: { session: mocks.session },
      error: null,
    });
    mocks.authStateChange = null;
    mocks.onAuthStateChange.mockImplementation((callback) => {
      mocks.authStateChange = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
    mocks.meGet.mockResolvedValue({
      id: "user-1",
      name: "Founder",
      role: "founder",
    });
    mocks.meSync.mockResolvedValue({
      bio: null,
      id: "user-1",
      name: "Founder",
      phone: null,
      role: "both",
    });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.updateUser.mockResolvedValue({
      data: { user: mocks.session.user },
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("stores the selected role in Supabase metadata and the API profile", async () => {
    const user = userEvent.setup();

    renderAuth(<TestHarness />);
    await user.click(await screen.findByRole("button", { name: "complete role" }));

    await waitFor(() =>
      expect(mocks.updateUser).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: "both" }),
      }),
    );
    expect(mocks.meSync).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Founder", role: "both" }),
      "token-123",
    );
  });

  it("clears the previous user's protected queries when auth switches users", async () => {
    const { queryClient } = renderAuth(<TestHarness />);

    await screen.findByRole("button", { name: "sign out" });
    queryClient.setQueryData(["applications", "user-1", PROTECTED_QUERY_SCOPE], ["application-1"]);
    queryClient.setQueryData(["chat-rooms", "user-1", PROTECTED_QUERY_SCOPE], ["room-1"]);
    queryClient.setQueryData(["applications", "user-2", PROTECTED_QUERY_SCOPE], ["application-2"]);
    queryClient.setQueryData(["interview-posts", "public", PROTECTED_QUERY_SCOPE], ["public-post"]);

    mocks.meGet.mockResolvedValueOnce({
      id: "user-2",
      name: "Next",
      role: "respondent",
    });
    act(() => {
      mocks.authStateChange?.("SIGNED_IN", {
        ...mocks.session,
        access_token: "token-456",
        user: {
          ...mocks.session.user,
          email: "next@example.com",
          id: "user-2",
          user_metadata: { role: "respondent" },
        },
      });
    });

    expect(await screen.findByText("next@example.com")).toBeInTheDocument();
    await waitFor(() => {
      expect(queryClient.getQueryData(["applications", "user-1", PROTECTED_QUERY_SCOPE])).toBeUndefined();
      expect(queryClient.getQueryData(["chat-rooms", "user-1", PROTECTED_QUERY_SCOPE])).toBeUndefined();
    });
    expect(queryClient.getQueryData(["applications", "user-2", PROTECTED_QUERY_SCOPE])).toEqual(["application-2"]);
    expect(queryClient.getQueryData(["interview-posts", "public", PROTECTED_QUERY_SCOPE])).toEqual(["public-post"]);
  });

  it("clears the signed-in user's protected queries after sign-out", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderAuth(<TestHarness />);

    await screen.findByRole("button", { name: "sign out" });
    queryClient.setQueryData(["applications", "user-1", PROTECTED_QUERY_SCOPE], ["application-1"]);
    queryClient.setQueryData(["chat-rooms", "user-1", PROTECTED_QUERY_SCOPE], ["room-1"]);
    queryClient.setQueryData(["interview-posts", "public", PROTECTED_QUERY_SCOPE], ["public-post"]);

    await user.click(screen.getByRole("button", { name: "sign out" }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("signed-out")).toBeInTheDocument();
    await waitFor(() => {
      expect(queryClient.getQueryData(["applications", "user-1", PROTECTED_QUERY_SCOPE])).toBeUndefined();
      expect(queryClient.getQueryData(["chat-rooms", "user-1", PROTECTED_QUERY_SCOPE])).toBeUndefined();
    });
    expect(queryClient.getQueryData(["interview-posts", "public", PROTECTED_QUERY_SCOPE])).toEqual(["public-post"]);
  });

  it("does not let a late initial session overwrite a newer auth event", async () => {
    let resolveInitialSession: ((value: unknown) => void) | null = null;
    let authStateChange: ((event: string, session: typeof mocks.session | null) => void) | null = null;
    const initialSessionPromise = new Promise((resolve) => {
      resolveInitialSession = resolve;
    });
    const nextSession = {
      ...mocks.session,
      access_token: "token-456",
      user: {
        ...mocks.session.user,
        email: "next@example.com",
        id: "user-2",
        user_metadata: { role: "respondent" },
      },
    };

    mocks.getSession.mockReturnValue(initialSessionPromise);
    mocks.onAuthStateChange.mockImplementation((callback) => {
      authStateChange = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mocks.meGet.mockResolvedValue({ id: "user-2", name: "Next", role: "respondent" });

    renderAuth(<TestHarness />);
    act(() => {
      authStateChange?.("SIGNED_IN", nextSession);
      resolveInitialSession?.({ data: { session: null }, error: null });
    });

    expect(await screen.findByText("next@example.com")).toBeInTheDocument();
    expect(screen.queryByText("signed-out")).not.toBeInTheDocument();
  });
});
