import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AppUser, CreateInterviewPostInput } from "../shared/api/types";
import { ApiError } from "../shared/api/client";

const mocks = vi.hoisted(() => ({
  createInterviewPostMutation: {
    error: null as Error | null,
    isPending: false,
    mutate: vi.fn(),
  },
  navigateBack: vi.fn(),
  navigateTo: vi.fn(),
}));

vi.mock("../features/interview-posts/useCreateInterviewPost", () => ({
  useCreateInterviewPost: () => mocks.createInterviewPostMutation,
}));

vi.mock("../features/interview-posts/usePostingImageCapabilities", () => ({
  usePostingImageCapabilities: () => ({ data: { posting_images_enabled: false } }),
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
  organization_name: null,
  organization_type: null,
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
  organization_name: null,
  organization_type: null,
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

  it("keeps the post-creation form available for respondent-labelled accounts", async () => {
    const user = userEvent.setup();

    render(<NewInterviewPage accessToken="token-123" appUser={respondentUser} />);

    expect(screen.queryByText("모집글을 만들 수 없는 계정입니다.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "모집글 저장" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "내 모집글 보기" }));

    expect(mocks.navigateTo).toHaveBeenCalledWith("/my-interviews");
  });

  it("shows a failed create request with its request ID without discarding the form", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NewInterviewPage accessToken="token-123" appUser={founderUser} />);
    await user.type(screen.getByLabelText("제목"), "충돌 후 유지할 공고 제목");
    await user.type(screen.getByLabelText("서비스 설명"), "서비스 사용 경험 확인");
    await user.type(screen.getByLabelText("찾는 응답자 조건"), "최근 사용 경험자");
    await user.click(screen.getByRole("button", { name: "모집글 저장" }));
    await waitFor(() => expect(mocks.createInterviewPostMutation.mutate).toHaveBeenCalledTimes(1));

    mocks.createInterviewPostMutation.error = new ApiError({
      code: "idempotency_key_reused",
      kind: "http",
      message: "같은 요청 키가 다른 내용에 사용됐어요.",
      method: "POST",
      path: "/api/v1/interview-posts",
      requestId: "req-create-conflict",
      status: 409,
    });
    rerender(<NewInterviewPage accessToken="token-123" appUser={founderUser} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "같은 요청 키가 다른 내용에 사용됐어요. 요청 ID: req-create-conflict",
    );
    expect(screen.getByLabelText("제목")).toHaveValue("충돌 후 유지할 공고 제목");
    expect(screen.getByRole("button", { name: "모집글 저장" })).toBeEnabled();
    expect(mocks.navigateTo).not.toHaveBeenCalled();
  });
});
