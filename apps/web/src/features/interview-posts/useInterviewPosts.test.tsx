import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { InterviewPost, InterviewPostStatus } from "../../shared/api/types";

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock("../../shared/api/interviewPosts", () => ({
  interviewPostsApi: {
    list: mocks.list,
  },
}));

import type { ListInterviewPostsParams } from "../../shared/api/interviewPosts";
import { useInterviewPosts } from "./useInterviewPosts";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function createDeferredPromise<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return {
    promise,
    reject,
    resolve,
  };
}

function buildInterviewPost(id: string, status: InterviewPostStatus = "open"): InterviewPost {
  return {
    distance_meters: 620,
    duration_minutes: 45,
    founder: null,
    founder_id: "founder-1",
    founder_review_summary: null,
    id,
    interview_mode: "offline",
    location: "서울 강남구",
    location_address: "서울 강남구 강남대로 396",
    location_latitude: 37.4979,
    location_longitude: 127.0276,
    location_place_name: "강남역",
    location_precision: "district",
    location_source: "kakao_place",
    location_text: "강남역",
    recruit_count: 3,
    reward_amount: 30000,
    schedule_options: ["평일 저녁"],
    service_summary: "가설 검증 인터뷰 모집",
    status,
    target_description: "최근 관련 서비스를 이용한 고객",
    title: `인터뷰 ${id}`,
  };
}

describe("useInterviewPosts", () => {
  beforeEach(() => {
    mocks.list.mockResolvedValue([buildInterviewPost("post-1")]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes an AbortSignal to the interview posts API list method", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const params: ListInterviewPostsParams = { limit: 20, status: "open" };

    const { result } = renderHook(() => useInterviewPosts(params), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual([buildInterviewPost("post-1")]));

    expect(mocks.list).toHaveBeenCalledWith(
      params,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("keeps the previous successful result while a params key change is fetching", async () => {
    const queryClient = createQueryClient();
    const wrapper = createWrapper(queryClient);
    const initialPosts = [buildInterviewPost("post-initial")];
    const nextPosts = [buildInterviewPost("post-next")];
    const nextRequest = createDeferredPromise<InterviewPost[]>();

    mocks.list
      .mockResolvedValueOnce(initialPosts)
      .mockImplementationOnce(() => nextRequest.promise);

    const { result, rerender } = renderHook(
      ({ params }: { params?: ListInterviewPostsParams }) => useInterviewPosts(params),
      {
        initialProps: { params: { status: "open" } },
        wrapper,
      },
    );

    await waitFor(() => expect(result.current.data).toEqual(initialPosts));
    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPlaceholderData).toBe(false);

    rerender({ params: { status: "closed" } });

    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(true));

    expect(result.current.data).toEqual(initialPosts);
    expect(result.current.isFetching).toBe(true);

    nextRequest.resolve(nextPosts);

    await waitFor(() => expect(result.current.data).toEqual(nextPosts));
    expect(result.current.isFetching).toBe(false);
    expect(result.current.isPlaceholderData).toBe(false);
  });
});
