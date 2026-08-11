import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PostCreationForm } from "./PostCreationForm";

const mocks = vi.hoisted(() => ({
  keywordSearch: vi.fn(),
  loadKakaoMaps: vi.fn(),
}));

vi.mock("../../../shared/map/kakaoMapLoader", () => ({
  loadKakaoMaps: mocks.loadKakaoMaps,
}));

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("PostCreationForm", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_KAKAO_MAP_APP_KEY", "kakao-test-key");
    mocks.keywordSearch.mockReset();
    mocks.loadKakaoMaps.mockReset();
    mocks.loadKakaoMaps.mockResolvedValue({
      maps: {
        services: {
          Places: function Places() {
            return {
              keywordSearch: mocks.keywordSearch,
            };
          },
          Status: {
            OK: "OK",
          },
        },
      },
    });
  });

  it("requires a selected place before submitting offline interviews", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <PostCreationForm
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("제목"), "오프라인 인터뷰");
    await user.type(screen.getByLabelText("서비스 설명"), "서비스 검증 설명");
    await user.type(screen.getByLabelText("찾는 응답자 조건"), "응답자 조건");
    await user.selectOptions(screen.getByLabelText("진행 방식"), "offline");
    await user.click(screen.getByRole("button", { name: "모집글 저장" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("대면 인터뷰 장소를 선택하세요.")).toBeInTheDocument();
  });

  it("searches a Kakao place, stores the chosen location, and submits the selected values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    mocks.keywordSearch.mockImplementation(
      (
        _query: string,
        callback: (
          result: Array<{
            address_name?: string;
            place_name?: string;
            road_address_name?: string;
            x: string;
            y: string;
          }>,
          status: string,
        ) => void,
      ) => {
        callback(
          [
            {
              address_name: "서울 강남구 역삼동",
              place_name: "강남역",
              road_address_name: "서울 강남구 강남대로 396",
              x: "127.0276",
              y: "37.4979",
            },
          ],
          "OK",
        );
      },
    );

    render(
      <PostCreationForm
        isSubmitting={false}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    await user.type(screen.getByLabelText("제목"), "대면 인터뷰");
    await user.type(screen.getByLabelText("서비스 설명"), "오프라인 사용자 조사");
    await user.type(screen.getByLabelText("찾는 응답자 조건"), "강남역 근처 직장인");
    await user.selectOptions(screen.getByLabelText("진행 방식"), "offline");
    await user.type(screen.getByPlaceholderText("장소, 역, 학교를 검색해요"), "강남역");
    await user.click(screen.getByRole("button", { name: "검색" }));

    await waitFor(() => expect(mocks.loadKakaoMaps).toHaveBeenCalledWith("kakao-test-key"));

    await user.click(screen.getByRole("button", { name: /강남역/ }));
    await user.click(screen.getByRole("button", { name: "정확한 장소" }));
    await user.click(screen.getByRole("button", { name: "모집글 저장" }));

    expect(onSubmit).toHaveBeenCalledWith({
      durationMinutes: "30",
      interviewMode: "offline",
      location: "강남역",
      locationAddress: "서울 강남구 강남대로 396",
      locationLatitude: 37.4979,
      locationLongitude: 127.0276,
      locationPlaceName: "강남역",
      locationPrecision: "exact",
      locationSource: "kakao_place",
      rewardAmount: "15000",
      scheduleOptions: "평일 저녁\n주말 오전",
      serviceSummary: "오프라인 사용자 조사",
      status: "open",
      targetDescription: "강남역 근처 직장인",
      title: "대면 인터뷰",
    });
  });
});
