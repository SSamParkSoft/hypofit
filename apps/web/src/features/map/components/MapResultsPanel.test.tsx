import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { InterviewPost } from "../../../shared/api/types";
import type { MapPostView } from "../model/mapPageModel";
import { MapResultsPanel } from "./MapResultsPanel";

function createInterviewPost(overrides: Partial<InterviewPost> = {}): InterviewPost {
  return {
    id: "post-1",
    founder_id: "founder-1",
    founder: null,
    founder_review_summary: null,
    title: "가정식 밀키트 인터뷰",
    service_summary: "주 1회 장보기 패턴 조사",
    target_description: "최근 1개월 안에 밀키트를 구매한 경험",
    reward_amount: 18000,
    duration_minutes: 45,
    recruit_count: 3,
    interview_mode: "offline",
    location: "성수역 인근",
    location_text: null,
    location_address: null,
    location_place_name: null,
    location_latitude: 37.5447,
    location_longitude: 127.0557,
    location_precision: "district",
    location_source: "kakao_place",
    distance_meters: 620,
    schedule_options: ["평일 저녁"],
    status: "open",
    ...overrides,
  };
}

function createView(post: InterviewPost, overrides: Partial<MapPostView> = {}): MapPostView {
  return {
    area: "성수역",
    distance: "620m",
    lat: post.location_latitude ?? 37.5447,
    lng: post.location_longitude ?? 127.0557,
    post,
    ...overrides,
  };
}

describe("MapResultsPanel", () => {
  it("renders selected content and forwards filter and row selection actions", async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const onSelect = vi.fn();
    const firstView = createView(createInterviewPost());
    const secondView = createView(
      createInterviewPost({
        id: "post-2",
        interview_mode: "both",
        reward_amount: 22000,
        title: "B2B 협업툴 인터뷰",
      }),
      {
        area: "강남역",
        distance: "2.1km",
      },
    );

    render(
      <MapResultsPanel
        activeFilter="all"
        isError={false}
        isLoading={false}
        isRefreshing
        locationStatus="denied"
        searchCenter={null}
        searchControls={<div>search controls slot</div>}
        selectedView={firstView}
        viewedPostIds={new Set(["post-2"])}
        views={[firstView, secondView]}
        onFilterChange={onFilterChange}
        onSelect={onSelect}
      />,
    );

    expect(screen.getByText("search controls slot")).toBeInTheDocument();
    expect(screen.getByLabelText("지도 모집글 업데이트 중")).toBeInTheDocument();
    expect(screen.getByText("위치 권한이 꺼져 있어요. 지역을 검색하거나 지도를 움직여 찾아볼 수 있어요.")).toBeInTheDocument();
    expect(screen.getAllByText("가정식 밀키트 인터뷰")).toHaveLength(2);
    expect(screen.queryByText("지도를 움직이거나 목록을 비교해보세요.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "대면·화상" }));
    expect(onFilterChange).toHaveBeenCalledWith("both");

    await user.click(screen.getByRole("button", { name: /B2B 협업툴 인터뷰/ }));
    expect(onSelect).toHaveBeenCalledWith("post-2");
  });

  it("shows the empty state when no map results are available", () => {
    render(
      <MapResultsPanel
        activeFilter="all"
        isError={false}
        isLoading={false}
        isRefreshing={false}
        locationStatus="idle"
        searchCenter={null}
        searchControls={<div>search controls slot</div>}
        selectedView={null}
        viewedPostIds={new Set()}
        views={[]}
        onFilterChange={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("이 지역에는 모집글이 없어요.")).toBeInTheDocument();
  });
});
