import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppUser, InterviewPost } from "../shared/api/types";

const mocks = vi.hoisted(() => ({
  applicationsQuery: {
    data: [],
  },
  authState: {
    accessToken: "token-123",
  },
  createApplicationMutation: {
    error: null,
    isPending: false,
    mutate: vi.fn(),
  },
  interviewPostViewsQuery: {
    data: [],
  },
  markPostViewedMutation: {
    mutate: vi.fn(),
  },
  navigateTo: vi.fn(),
  postsQuery: {
    data: [] as InterviewPost[],
    isError: false,
    isLoading: false,
  },
  replacePath: vi.fn(),
}));

vi.mock("../features/auth/useAuth", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("../features/applications/useApplicationMutations", () => ({
  useCreateApplication: () => mocks.createApplicationMutation,
}));

vi.mock("../features/applications/useApplications", () => ({
  useApplications: () => mocks.applicationsQuery,
}));

vi.mock("../features/interview-posts/useInterviewPostViews", () => ({
  useInterviewPostViews: () => mocks.interviewPostViewsQuery,
  useMarkInterviewPostViewed: () => mocks.markPostViewedMutation,
}));

vi.mock("../features/interview-posts/useInterviewPosts", () => ({
  useInterviewPosts: () => mocks.postsQuery,
}));

vi.mock("../features/interview-posts/components/InterviewSearchToolbar", () => ({
  InterviewSearchToolbar: (props: {
    onQueryChange: (query: string) => void;
    query: string;
    resultCount: number;
  }) => (
    <div>
      <label htmlFor="interviews-query">검색어</label>
      <input
        id="interviews-query"
        value={props.query}
        onChange={(event) => props.onQueryChange(event.target.value)}
      />
      <p data-testid="result-count">{props.resultCount}</p>
    </div>
  ),
}));

vi.mock("../features/interview-posts/components/InterviewResultsList", () => ({
  InterviewResultsList: (props: {
    filteredPosts: InterviewPost[];
    onSelect: (postId: string) => void;
    selectedPostId: string | null;
  }) => (
    <div>
      <p data-testid="selected-post-id">{props.selectedPostId ?? "none"}</p>
      {props.filteredPosts.map((post) => (
        <button key={post.id} type="button" onClick={() => props.onSelect(post.id)}>
          {post.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock("../features/interview-posts/components/OpportunityDetailPanel", () => ({
  OpportunityDetailPanel: (props: {
    canApply: boolean;
    onApply?: (input: {
      answers?: Record<string, string>;
      available_times?: string[];
      interview_post_id: string;
    }) => void;
    post: InterviewPost | null;
  }) => (
    <div>
      <p data-testid="detail-post-title">{props.post?.title ?? "none"}</p>
      <p data-testid="detail-can-apply">{String(props.canApply)}</p>
      <button
        disabled={!props.post}
        type="button"
        onClick={() =>
          props.post
            ? props.onApply?.({
                interview_post_id: props.post.id,
                answers: { relevant_experience: "상세 패널 경험" },
                available_times: ["평일 저녁"],
              })
            : undefined
        }
      >
        상세 패널 신청
      </button>
    </div>
  ),
}));

vi.mock("../shared/navigation/appNavigation", () => ({
  navigateTo: mocks.navigateTo,
  replacePath: mocks.replacePath,
}));

import { InterviewsPage } from "./InterviewsPage";

const respondentUser: AppUser = {
  bio: null,
  email: "respondent@example.com",
  id: "respondent-1",
  name: "인터뷰어",
  organization_name: null,
  organization_type: null,
  phone: null,
  profile_image_path: null,
  profile_image_url: null,
  role: "respondent",
};

function createPost(overrides: Partial<InterviewPost>): InterviewPost {
  return {
    distance_meters: null,
    duration_minutes: 30,
    founder: null,
    founder_id: "founder-1",
    founder_review_summary: null,
    id: "post-1",
    interview_mode: "online",
    location: null,
    location_address: null,
    location_latitude: null,
    location_longitude: null,
    location_place_name: null,
    location_precision: null,
    location_source: null,
    location_text: null,
    recruit_count: 1,
    reward_amount: 15000,
    schedule_options: ["weekday evening"],
    service_summary: "service summary",
    status: "open",
    target_description: "target audience",
    title: "alpha interview",
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe("InterviewsPage", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/interviews");
    mocks.applicationsQuery.data = [];
    mocks.createApplicationMutation.error = null;
    mocks.createApplicationMutation.isPending = false;
    mocks.createApplicationMutation.mutate.mockReset();
    mocks.interviewPostViewsQuery.data = [];
    mocks.markPostViewedMutation.mutate.mockReset();
    mocks.navigateTo.mockReset();
    mocks.replacePath.mockReset();
    mocks.postsQuery.data = [
      createPost({
        id: "post-1",
        interview_mode: "online",
        service_summary: "alpha summary",
        target_description: "alpha target",
        title: "alpha interview",
      }),
      createPost({
        id: "post-2",
        interview_mode: "offline",
        location: "Seoul Station",
        location_address: "서울역",
        location_latitude: 37.5547,
        location_longitude: 126.9706,
        location_place_name: "서울역",
        location_precision: "nearby",
        location_source: "kakao_place",
        service_summary: "beta summary",
        target_description: "beta target",
        title: "beta interview",
      }),
    ];
    mocks.postsQuery.isError = false;
    mocks.postsQuery.isLoading = false;
  });

  it("selects a detail post, marks it viewed, and applies with the selected post id", async () => {
    const user = userEvent.setup();

    render(<InterviewsPage appUser={respondentUser} />);

    expect(screen.getByTestId("detail-post-title")).toHaveTextContent("alpha interview");
    expect(screen.getByTestId("detail-can-apply")).toHaveTextContent("true");
    expect(screen.getByRole("button", { name: "모집글 만들기" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "beta interview" }));

    expect(mocks.markPostViewedMutation.mutate).toHaveBeenCalledWith({
      postId: "post-2",
      source: "interviews",
    });
    expect(screen.getByTestId("selected-post-id")).toHaveTextContent("post-2");
    expect(screen.getByTestId("detail-post-title")).toHaveTextContent("beta interview");

    await user.click(screen.getByRole("button", { name: "상세 패널 신청" }));

    expect(mocks.createApplicationMutation.mutate).toHaveBeenCalledWith({
      interview_post_id: "post-2",
      answers: { relevant_experience: "상세 패널 경험" },
      available_times: ["평일 저녁"],
    });

    await user.click(screen.getByRole("button", { name: "모집글 만들기" }));
    expect(mocks.navigateTo).toHaveBeenCalledWith("/interviews/new");
  });

  it("clears an invalid selected post after search filtering removes it", async () => {
    const user = userEvent.setup();

    render(<InterviewsPage appUser={respondentUser} />);

    await user.click(screen.getByRole("button", { name: "beta interview" }));

    expect(screen.getByTestId("selected-post-id")).toHaveTextContent("post-2");
    expect(screen.getByTestId("detail-post-title")).toHaveTextContent("beta interview");

    await user.clear(screen.getByLabelText("검색어"));
    await user.type(screen.getByLabelText("검색어"), "alpha");

    await waitFor(() => {
      expect(screen.getByTestId("result-count")).toHaveTextContent("1");
      expect(screen.getByTestId("selected-post-id")).toHaveTextContent("none");
    });

    expect(screen.getByTestId("detail-post-title")).toHaveTextContent("alpha interview");
    await waitFor(() => {
      expect(mocks.replacePath).toHaveBeenLastCalledWith(
        "/interviews?q=alpha",
        expect.objectContaining({
          focus: "none",
          intent: "state",
          scroll: "preserve",
        }),
      );
    });
  });
});
