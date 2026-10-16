import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { chatMessageHistorySearch, mergeChatMessagePages, type ChatMessage } from "@hypofit/contracts";
import { chatApi } from "../../shared/api/chat";
import { useChatHistory } from "./useChatHistory";

vi.mock("../../shared/api/chat", () => ({ chatApi: { listOlderMessages: vi.fn() } }));
const message = (id: number): ChatMessage => ({
  id: String(id), room_id: "room", sender_id: "user", body: String(id),
  created_at: "2026-10-05T00:00:00.123456Z", message_type: "user", metadata: {}, client_message_id: null,
});
const latest = Array.from({ length: 50 }, (_, index) => message(index + 50));
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe("chat history", () => {
  it("preserves server order and deduplicates overlapping pages with updated bodies", () => {
    expect(mergeChatMessagePages([message(2), message(1)], [{ ...message(1), body: "updated" }, message(3)]))
      .toEqual([message(2), { ...message(1), body: "updated" }, message(3)]);
    const params = new URLSearchParams(chatMessageHistorySearch(message(1)));
    expect(params.get("before")).toBe("2026-10-05T00:00:00.123456Z");
    expect(params.get("before_id")).toBe("1");
  });

  it("loads previous pages without replacing the live window or polling old pages", async () => {
    vi.mocked(chatApi.listOlderMessages).mockResolvedValue([message(49), message(50)]);
    const { result, rerender } = renderHook(({ items }) => useChatHistory("room", "user", "token", items), { initialProps: { items: latest } });
    await act(async () => { await result.current.loadOlder(); });
    expect(chatApi.listOlderMessages).toHaveBeenCalledWith("room", latest[0], "token", expect.any(AbortSignal));
    expect(result.current.messages).toHaveLength(51);
    expect(result.current.hasOlder).toBe(false);
    rerender({ items: [...latest.slice(1), message(100)] });
    await waitFor(() => expect(result.current.messages).toHaveLength(52));
    expect(result.current.messages[0].id).toBe("49");
    expect(chatApi.listOlderMessages).toHaveBeenCalledTimes(1);
  });

  it("prevents duplicate loads, aborts on account/room changes and discards late results", async () => {
    let finish!: (value: ChatMessage[]) => void;
    vi.mocked(chatApi.listOlderMessages).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result, rerender } = renderHook(({ room, user }) => useChatHistory(room, user, "token", latest), { initialProps: { room: "room", user: "user" } });
    act(() => { void result.current.loadOlder(); void result.current.loadOlder(); });
    expect(chatApi.listOlderMessages).toHaveBeenCalledTimes(1);
    const signal = vi.mocked(chatApi.listOlderMessages).mock.calls[0][3];
    rerender({ room: "other", user: "another-user" });
    expect(signal?.aborted).toBe(true);
    await act(async () => { finish([message(1)]); });
    expect(result.current.messages).toEqual(latest);
    expect(result.current.isLoadingOlder).toBe(false);
  });

  it("preserves messages on failure and allows retry", async () => {
    vi.mocked(chatApi.listOlderMessages).mockRejectedValueOnce(new Error("offline")).mockResolvedValue([]);
    const { result, unmount } = renderHook(() => useChatHistory("room", "user", "token", latest));
    await act(async () => { await result.current.loadOlder(); });
    expect(result.current.isHistoryError).toBe(true);
    expect(result.current.messages).toEqual(latest);
    await act(async () => { await result.current.loadOlder(); });
    expect(result.current.isHistoryError).toBe(false);
    expect(result.current.hasOlder).toBe(false);
    unmount();
  });
});
