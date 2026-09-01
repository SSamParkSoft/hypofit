import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useHomeDashboard } from "./useHomeDashboard";

const mocks = vi.hoisted(() => ({
  applications: {
    data: [],
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  chatRooms: {
    data: [],
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  posts: {
    data: [],
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  sessions: {
    data: [],
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  },
  useApplications: vi.fn(),
  useChatRooms: vi.fn(),
  useInterviewPosts: vi.fn(),
  useSessions: vi.fn(),
}));

vi.mock("../applications/useApplications", () => ({
  useApplications: (...args: unknown[]) => mocks.useApplications(...args),
}));

vi.mock("../chat/useChatRooms", () => ({
  useChatRooms: (...args: unknown[]) => mocks.useChatRooms(...args),
}));

vi.mock("../interview-posts/useInterviewPosts", () => ({
  useInterviewPosts: (...args: unknown[]) => mocks.useInterviewPosts(...args),
}));

vi.mock("../sessions/useSessions", () => ({
  useSessions: (...args: unknown[]) => mocks.useSessions(...args),
}));

describe("useHomeDashboard", () => {
  beforeEach(() => {
    mocks.applications.data = [];
    mocks.applications.isError = false;
    mocks.applications.isLoading = false;
    mocks.chatRooms.data = [];
    mocks.chatRooms.isError = false;
    mocks.chatRooms.isLoading = false;
    mocks.posts.data = [];
    mocks.posts.isError = false;
    mocks.posts.isLoading = false;
    mocks.sessions.data = [];
    mocks.sessions.isError = false;
    mocks.sessions.isLoading = false;

    for (const query of [mocks.applications, mocks.chatRooms, mocks.posts, mocks.sessions]) {
      query.refetch.mockReset();
      query.refetch.mockResolvedValue({ data: query.data });
    }

    mocks.useApplications.mockReset().mockReturnValue(mocks.applications);
    mocks.useChatRooms.mockReset().mockReturnValue(mocks.chatRooms);
    mocks.useInterviewPosts.mockReset().mockReturnValue(mocks.posts);
    mocks.useSessions.mockReset().mockReturnValue(mocks.sessions);
  });

  it("loads the four existing API domains with the intended home query", () => {
    const { result } = renderHook(() =>
      useHomeDashboard({ accessToken: "access-token", appUserId: "user-1" }),
    );

    expect(mocks.useInterviewPosts).toHaveBeenCalledWith({
      limit: 8,
      sort: "newest",
      status: "open",
    });
    expect(mocks.useApplications).toHaveBeenCalledWith("access-token");
    expect(mocks.useSessions).toHaveBeenCalledWith("access-token");
    expect(mocks.useChatRooms).toHaveBeenCalledWith("access-token");
    expect(result.current.data.recentInterviews).toEqual([]);
  });

  it("combines query status and retries every home source", async () => {
    mocks.sessions.isError = true;
    mocks.chatRooms.isLoading = true;

    const { result } = renderHook(() =>
      useHomeDashboard({ accessToken: "access-token", appUserId: "user-1" }),
    );

    expect(result.current.hasError).toBe(true);
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await result.current.refetch();
    });

    expect(mocks.posts.refetch).toHaveBeenCalledOnce();
    expect(mocks.applications.refetch).toHaveBeenCalledOnce();
    expect(mocks.sessions.refetch).toHaveBeenCalledOnce();
    expect(mocks.chatRooms.refetch).toHaveBeenCalledOnce();
  });
});
