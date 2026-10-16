import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ upload: vi.fn() }));

vi.mock("./usePostingImageEditor", () => ({
  usePostingImageEditor: () => ({
    add: vi.fn(),
    busy: false,
    enabled: true,
    error: null,
    images: [],
    remove: vi.fn(),
    setImages: vi.fn(),
    upload: mocks.upload,
  }),
}));

import { PostCreationForm } from "./PostCreationForm";

afterEach(cleanup);

describe("PostCreationForm", () => {
  beforeEach(() => {
    mocks.upload.mockReset();
    mocks.upload.mockResolvedValue([]);
  });

  it("keeps whitespace-only titles in the form and does not submit them", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<PostCreationForm isSubmitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("제목"), "   ");
    await user.type(screen.getByLabelText("서비스 설명"), "검증할 문제 상황");
    await user.type(screen.getByLabelText("찾는 응답자 조건"), "최근 서비스 이용자");
    await user.click(screen.getByRole("button", { name: "모집글 저장" }));

    expect(screen.getByText("모집글 제목을 입력하세요.")).toBeInTheDocument();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("clears a stale form error when the user edits the invalid field", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PostCreationForm isSubmitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("제목"), "   ");
    await user.type(screen.getByLabelText("서비스 설명"), "서비스 검증 설명");
    await user.type(screen.getByLabelText("찾는 응답자 조건"), "최근 이용자");
    await user.click(screen.getByRole("button", { name: "모집글 저장" }));
    expect(screen.getByText("모집글 제목을 입력하세요.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("제목"), "QA 제목");
    expect(screen.queryByText("모집글 제목을 입력하세요.")).not.toBeInTheDocument();

    const duration = screen.getByLabelText("예상 소요 시간");
    await user.clear(duration);
    await user.type(duration, "9");
    await user.click(screen.getByRole("button", { name: "모집글 저장" }));
    expect(duration).toBeInvalid();
    expect(screen.queryByText("모집글 제목을 입력하세요.")).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks durations below the API minimum without uploading images", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PostCreationForm isSubmitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("제목"), "온라인 인터뷰");
    await user.type(screen.getByLabelText("서비스 설명"), "서비스 검증 설명");
    await user.type(screen.getByLabelText("찾는 응답자 조건"), "최근 이용자");
    const duration = screen.getByLabelText("예상 소요 시간");
    await user.clear(duration);
    await user.type(duration, "9");
    await user.click(screen.getByRole("button", { name: "모집글 저장" }));

    expect(duration).toBeInvalid();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("requires a selected place for offline interviews", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<PostCreationForm isSubmitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("제목"), "대면 인터뷰");
    await user.type(screen.getByLabelText("서비스 설명"), "서비스 검증 설명");
    await user.type(screen.getByLabelText("찾는 응답자 조건"), "근처 이용자");
    await user.selectOptions(screen.getByLabelText("진행 방식"), "offline");
    await user.click(screen.getByRole("button", { name: "모집글 저장" }));

    expect(screen.getByText("대면 인터뷰 장소를 선택하세요.")).toBeInTheDocument();
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an upload failure and keeps the form available for retry", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    mocks.upload.mockRejectedValueOnce(new Error("이미지 업로드가 실패했어요."));

    render(<PostCreationForm isSubmitting={false} onCancel={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("제목"), "인터뷰 참여자 모집");
    await user.type(screen.getByLabelText("서비스 설명"), "서비스 사용 경험 확인");
    await user.type(screen.getByLabelText("찾는 응답자 조건"), "최근 사용 경험자");
    await user.click(screen.getByRole("button", { name: "모집글 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("이미지 업로드가 실패했어요.");
    expect(screen.getByLabelText("제목")).toHaveValue("인터뷰 참여자 모집");
    expect(screen.getByRole("button", { name: "모집글 저장" })).toBeEnabled();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "모집글 저장" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
