import { type FormEvent } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChatRoom } from "../../../shared/api/types";
import { useChatThreadController } from "./useChatThreadController";

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock("../useChatMessages", () => ({
  useChatMessages: () => ({ data: [], isLoading: false }),
}));
vi.mock("../useChatHistory", () => ({
  useChatHistory: () => ({ messages: [] }),
}));
vi.mock("../useMarkChatRoomRead", () => ({
  useMarkChatRoomRead: () => ({ mutate: mocks.markRead }),
}));
vi.mock("../useSendChatMessage", () => ({
  useSendChatMessage: () => ({ isError: false, isPending: false, mutate: mocks.mutate }),
}));

const room = { id: "room-1", unread_count: 0 } as ChatRoom;

function submit(handleSubmit: (event: FormEvent<HTMLFormElement>) => void) {
  handleSubmit({ preventDefault: vi.fn() } as unknown as FormEvent<HTMLFormElement>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useChatThreadController", () => {
  it("reuses the message ID when retrying the same body after an uncertain failure", () => {
    const { result } = renderHook(() =>
      useChatThreadController({ accessToken: "token", appUserId: "user-1", isBlocked: false, room }),
    );

    act(() => result.current.setMessage("  안녕하세요  "));
    act(() => submit(result.current.handleSubmit));
    act(() => submit(result.current.handleSubmit));

    expect(mocks.mutate).toHaveBeenCalledTimes(2);
    expect(mocks.mutate.mock.calls[0][0].input.body).toBe("안녕하세요");
    expect(mocks.mutate.mock.calls[1][0].input.client_message_id).toBe(
      mocks.mutate.mock.calls[0][0].input.client_message_id,
    );
  });

  it("uses a new message ID when the draft changes after a failed send", () => {
    const { result } = renderHook(() =>
      useChatThreadController({ accessToken: "token", appUserId: "user-1", isBlocked: false, room }),
    );

    act(() => result.current.setMessage("첫 메시지"));
    act(() => submit(result.current.handleSubmit));
    act(() => result.current.setMessage("수정한 메시지"));
    act(() => submit(result.current.handleSubmit));

    expect(mocks.mutate.mock.calls[1][0].input.client_message_id).not.toBe(
      mocks.mutate.mock.calls[0][0].input.client_message_id,
    );
  });

  it("keeps text typed during a pending send and gives it a new message ID", () => {
    const { result } = renderHook(() =>
      useChatThreadController({ accessToken: "token", appUserId: "user-1", isBlocked: false, room }),
    );

    act(() => result.current.setMessage("첫 메시지"));
    act(() => submit(result.current.handleSubmit));
    act(() => result.current.setMessage("다음 메시지"));
    act(() => mocks.mutate.mock.calls[0][1].onSuccess());

    expect(result.current.message).toBe("다음 메시지");
    act(() => submit(result.current.handleSubmit));
    expect(mocks.mutate.mock.calls[1][0].input.client_message_id).not.toBe(
      mocks.mutate.mock.calls[0][0].input.client_message_id,
    );
  });

  it("clears only the successfully sent draft", () => {
    const { result } = renderHook(() =>
      useChatThreadController({ accessToken: "token", appUserId: "user-1", isBlocked: false, room }),
    );

    act(() => result.current.setMessage("안녕하세요"));
    act(() => submit(result.current.handleSubmit));
    act(() => mocks.mutate.mock.calls[0][1].onSuccess());

    expect(result.current.message).toBe("");
  });
});
