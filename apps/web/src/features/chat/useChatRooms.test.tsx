import { type ReactNode } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useChatRooms } from "./useChatRooms";

const mocks = vi.hoisted(() => ({ listRooms: vi.fn().mockResolvedValue([]) }));

vi.mock("../../shared/api/chat", () => ({
  chatApi: { listRooms: mocks.listRooms },
}));

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useChatRooms", () => {
  it("polls the room list only when the chat workspace requests it", async () => {
    vi.useFakeTimers();
    renderHook(() => useChatRooms("token", { pollWhileActive: true }), {
      wrapper: createWrapper(),
    });

    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(mocks.listRooms).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(mocks.listRooms).toHaveBeenCalledTimes(2);
  });

  it("does not poll on other screens by default", async () => {
    vi.useFakeTimers();
    renderHook(() => useChatRooms("token"), { wrapper: createWrapper() });

    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(mocks.listRooms).toHaveBeenCalledTimes(1);
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(mocks.listRooms).toHaveBeenCalledTimes(1);
  });
});
