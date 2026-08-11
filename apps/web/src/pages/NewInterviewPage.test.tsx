import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppUser, CreateInterviewPostInput } from "../shared/api/types";

const mocks = vi.hoisted(() => ({
  createInterviewPostMutation: {
    error: null,
    isPending: false,
    mutate: vi.fn(),
  },
  navigateBack: vi.fn(),
  navigateTo: vi.fn(),
}));

vi.mock("../features/interview-posts/useCreateInterviewPost", () => ({
  useCreateInterviewPost: () => mocks.createInterviewPostMutation,
}));

vi.mock("../shared/navigation/appNavigation", () => ({
  navigateBack: mocks.navigateBack,
  navigateTo: mocks.navigateTo,
}));

import { NewInterviewPage } from "./NewInterviewPage";

const founderUser: AppUser = {
  bio: null,
  email: "founder@example.com",
  id: "founder-1",
  name: "창업자",
  phone: null,
  profile_image_path: null,
  profile_image_url: null,
  role: "both",
};

const respondentUser: AppUser = {
  bio: null,
  email: "respondent@example.com",
  id: "respondent-1",
  name: "인터뷰어",
  phone: null,
  profile_image_path: null,
  profile_image_url: null,
  role: "respondent",
};

afterEach(() => {
  cleanup();
});

describe("NewInterviewPage", () => {
  beforeEach(() => {
    mocks.createInterviewPostMutation.error = null;
    mocks.createInterviewPostMutation.isPending = false;
    mocks.createInterviewPostMutation.mutate.mockReset();
    mocks.navigateBack.mockReset();
    mocks.navigateTo.mockReset();
  });

  it("submits a normalized interview-post payload and returns to my interviews on success", async () => {
    const user = userEvent.setup();

    render(<NewInterviewPage accessToken="token-123" appUser={founderUser} />);

    await user.type(screen.getByLabelText("제목"), "  SaaS founder interview  ");
    await user.type(
      screen.getByLabelText("서비스 설명"),
      "  Validate early founder onboarding friction.  ",
    );
    await user.type(
      screen.getByLabelText("찾는 응답자 조건"),
      "  Founders who recently tested onboarding flows.  ",
    );

    await user.click(screen.getByRole("button", { name: "모집글 저장" }));

    expect(mocks.createInterviewPostMutation.mutate).toHaveBeenCalledWith(
      {
        duration_minutes: 30,
        interview_mode: "online",
        location: null,
        location_address: null,
        location_latitude: null,
        location_longitude: null,
        location_place_name: null,
        location_precision: null,
        location_source: null,
        location_text: null,
        reward_amount: 15000,
        schedule_options: ["평일 저녁", "주말 오전"],
        service_summary: "Validate early founder onboarding friction.",
        status: "open",
        target_description: "Founders who recently tested onboarding flows.",
        title: "SaaS founder interview",
      } satisfies CreateInterviewPostInput,
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );

    expect(mocks.navigateTo).not.toHaveBeenCalled();

    const [, mutationOptions] = mocks.createInterviewPostMutation.mutate.mock.calls[0] as [
      CreateInterviewPostInput,
      { onSuccess?: () => void },
    ];

    mutationOptions.onSuccess?.();

    expect(mocks.navigateTo).toHaveBeenCalledWith("/my-interviews");
  });

  it("shows the founder-only guard state for respondent accounts", async () => {
    const user = userEvent.setup();

    render(<NewInterviewPage accessToken="token-123" appUser={respondentUser} />);

    expect(screen.getByText("모집글을 만들 수 없는 계정입니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "모집글 저장" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "인터뷰 보기" }));

    expect(mocks.navigateTo).toHaveBeenCalledWith("/interviews");
  });
});
