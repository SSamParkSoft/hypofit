import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HomeDashboardData } from "../model/homeDashboardModel";
import { HomeDashboard } from "./HomeDashboard";

const mocks = vi.hoisted(() => ({
  navigateTo: vi.fn(),
  query: {
    data: null as HomeDashboardData | null,
    hasError: false,
    isLoading: false,
    refetch: vi.fn(),
  },
}));

vi.mock("../../../shared/navigation/appNavigation", () => ({
  navigateTo: (...args: unknown[]) => mocks.navigateTo(...args),
}));

vi.mock("../useHomeDashboard", () => ({
  useHomeDashboard: () => mocks.query,
}));

const recentPost = {
  id: "post-recent",
  founder_id: "founder-2",
  founder: {
    id: "founder-2",
    name: "김도현",
    bio: null,
    organization_name: "콘텐츠럭",
    organization_type: "team" as const,
    role: "founder" as const,
    profile_image_url: null,
  },
  title: "중고거래 약속 조율 경험 인터뷰",
  service_summary: "중고거래 약속을 정하며 겪은 경험을 듣는 인터뷰예요.",
  target_description: "최근 6개월 안에 중고거래를 해 본 분",
  reward_amount: 30_000,
  duration_minutes: 30,
  recruit_count: 3,
  interview_mode: "online" as const,
  location: null,
  location_text: null,
  location_address: null,
  location_place_name: null,
  location_latitude: null,
  location_longitude: null,
  location_precision: null,
  location_source: null,
  distance_meters: null,
  schedule_options: [],
  status: "open" as const,
};

const recommendationPost = {
  ...recentPost,
  created_at: "2026-08-17T09:00:00+09:00",
  id: "post-recommendation",
  title: "건강 기록 앱 사용 경험 인터뷰",
  service_summary: "건강 기록 앱을 실제로 사용한 경험을 듣는 인터뷰예요.",
  target_description: "건강 기록 앱을 3개월 이상 사용해 본 직장인",
  reward_amount: 50_000,
};

const dashboardData: HomeDashboardData = {
  focus: {
    badgeLabel: "진행 중",
    body: "새 지원자 2명의 신청 내용을 확인하고 다음 단계를 정해보세요.",
    currentStep: 1,
    primaryAction: { href: "/my-interviews", label: "지원자 2명 보기" },
    secondaryAction: { href: "/chat?room=room-1", label: "읽지 않은 채팅 1개" },
    stageLabel: "지원자 확인 단계",
    steps: ["모집글 등록", "지원자 확인", "선정", "인터뷰"],
    title: "모바일 헬스케어 앱 사용성 인터뷰",
  },
  nextSchedule: {
    counterpart: "김민지",
    href: "/chat?room=room-1",
    interviewTitle: "모바일 헬스케어 앱 사용성 인터뷰",
    location: "성수역 3번 출구",
    when: "내일 오후 7:30",
  },
  recentInterviews: [{ post: recentPost, secondaryMeta: "비대면 · 30,000원 · 30분" }],
  recommendation: {
    post: recommendationPost,
  },
};

describe("HomeDashboard", () => {
  beforeEach(() => {
    mocks.navigateTo.mockReset();
    mocks.query.data = dashboardData;
    mocks.query.hasError = false;
    mocks.query.isLoading = false;
    mocks.query.refetch.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders API-backed home data with the current app user name", () => {
    const { container } = render(
      <HomeDashboard accessToken="token" appUserId="user-1" canApply displayName="세현" />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "세현님, 안녕하세요" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "오늘의 추천" })).toBeInTheDocument();
    expect(
      screen.getAllByRole("heading", {
        level: 2,
        name: "모바일 헬스케어 앱 사용성 인터뷰",
      }),
    ).toHaveLength(2);
    expect(screen.getByText("지원자 2명 보기")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "최근 올라온 인터뷰" })).toBeInTheDocument();
    expect(screen.queryByText("AI 추천")).not.toBeInTheDocument();
    expect(screen.getAllByText(/등록$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("김도현 · 콘텐츠럭")).toHaveLength(2);

    const dashboardGrid = container.querySelector('section[aria-label="오늘 이어갈 인터뷰"]');
    expect(dashboardGrid).toHaveClass("lg:grid-cols-12");
  });

  it("opens the real recommendation preview and navigates to its detail route", async () => {
    const user = userEvent.setup();
    render(<HomeDashboard accessToken="token" appUserId="user-1" canApply displayName="세현" />);

    await user.click(screen.getByRole("button", { name: /건강 기록 앱 사용 경험 인터뷰/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("건강 기록 앱을 3개월 이상 사용해 본 직장인")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "상세 보기" }));
    expect(mocks.navigateTo).toHaveBeenLastCalledWith("/interviews/post-recommendation");
  });

  it("opens a preview for a recent API interview before navigating", async () => {
    const user = userEvent.setup();
    render(<HomeDashboard accessToken="token" appUserId="user-1" canApply displayName="세현" />);

    await user.click(screen.getByRole("button", { name: /중고거래 약속 조율 경험 인터뷰/ }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("최근 6개월 안에 중고거래를 해 본 분")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "미리보기 닫기" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mocks.navigateTo).not.toHaveBeenCalled();
  });

  it("shows real empty states instead of mock interviews", () => {
    mocks.query.data = {
      ...dashboardData,
      nextSchedule: null,
      recentInterviews: [],
      recommendation: null,
    };

    render(<HomeDashboard accessToken="token" appUserId="user-1" canApply displayName="세현" />);

    expect(screen.getByText("예정된 인터뷰가 없어요")).toBeInTheDocument();
    expect(screen.getByText("새로 올라온 인터뷰가 없어요")).toBeInTheDocument();
    expect(screen.getByText("추천할 인터뷰를 찾고 있어요")).toBeInTheDocument();
    expect(screen.queryByText("중고거래 약속 조율 경험 인터뷰")).not.toBeInTheDocument();
  });

  it("renders a stable skeleton while home queries are loading", () => {
    mocks.query.isLoading = true;

    render(<HomeDashboard accessToken="token" appUserId="user-1" canApply displayName="세현" />);

    expect(screen.getByLabelText("홈 정보를 불러오는 중")).toHaveAttribute("aria-busy", "true");
  });
});
