import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "../../../shared/api/admin";
import type { AdminNotice } from "../../../shared/api/types";
import { NoticePanel } from "./NoticePanel";

const notice: AdminNotice = { id: "notice-1", type: "IMPORTANT", title: "서비스 안내", body: "서비스 이용 안내입니다.", status: "PUBLISHED", published_at: "2026-10-05T00:00:00Z", created_at: "2026-10-04T00:00:00Z", updated_at: "2026-10-05T00:00:00Z" };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("notice editing", () => {
  it("edits a published notice only after confirmation and previews plain text", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const update = vi.spyOn(adminApi, "updateNotice").mockResolvedValue({ ...notice, title: "서비스 안내 수정" });
    render(<NoticePanel accessToken="token" notices={[notice]} onChanged={vi.fn()} onError={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: notice.title }));
    expect(screen.getByRole("button", { name: "변경 저장" })).toBeDisabled();
    await user.type(screen.getByLabelText("공지 제목"), " 수정");
    await user.click(screen.getByRole("button", { name: "미리보기" }));
    expect(screen.getByRole("heading", { name: "서비스 안내 수정" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    expect(update).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(notice.id, { title: "서비스 안내 수정", body: notice.body, type: notice.type }, "token"));
  });

  it("preserves failed edits and protects linked maintenance notices", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(adminApi, "updateNotice").mockRejectedValue(new Error("offline"));
    const onError = vi.fn();
    const view = render(<NoticePanel accessToken="token" notices={[notice]} onChanged={vi.fn()} onError={onError} />);
    await user.click(screen.getByRole("button", { name: notice.title }));
    await user.type(screen.getByLabelText("공지 내용"), " 추가");
    await user.click(screen.getByRole("button", { name: "변경 저장" }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByLabelText("공지 내용")).toHaveValue(`${notice.body} 추가`);
    view.unmount();
    render(<NoticePanel accessToken="token" notices={[{ ...notice, managed_by_maintenance: true }]} onChanged={vi.fn()} onError={onError} />);
    await user.click(screen.getByRole("button", { name: notice.title }));
    expect(screen.getByLabelText("공지 내용")).toBeDisabled();
    expect(screen.getByRole("button", { name: "보관" })).toBeDisabled();
    expect(screen.getByRole("button", { name: `${notice.title} 공지 삭제` })).toBeDisabled();
    expect(screen.getByText("연결된 점검 안내는 서비스 운영에서 수정해 주세요.")).toBeInTheDocument();
  });

  it.each(["DRAFT", "PUBLISHED", "ARCHIVED"] as const)("deletes a %s notice after confirmation and clears its editor", async (status) => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const remove = vi.spyOn(adminApi, "deleteNotice").mockResolvedValue(undefined);
    const onChanged = vi.fn();
    const view = render(<NoticePanel accessToken="token" notices={[{ ...notice, status }]} onChanged={onChanged} onError={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: notice.title }));
    await user.click(screen.getByRole("button", { name: `${notice.title} 공지 삭제` }));
    expect(remove).not.toHaveBeenCalled();
    expect(screen.getByLabelText("공지 제목")).toHaveValue(notice.title);
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: `${notice.title} 공지 삭제` }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith("공지를 삭제했어요."));
    expect(confirm).toHaveBeenLastCalledWith(expect.stringContaining("복구할 수 없어요"));
    expect(remove).toHaveBeenCalledWith(notice.id, "token");
    expect(screen.getByLabelText("공지 제목")).toHaveValue("");
    expect(screen.getByLabelText("공지 내용")).toHaveValue("");
    view.rerender(<NoticePanel accessToken="token" notices={[]} onChanged={onChanged} onError={vi.fn()} />);
    expect(screen.queryByRole("button", { name: `${notice.title} 공지 삭제` })).not.toBeInTheDocument();
  });

  it("prevents duplicate deletion and preserves the notice and editor on failure", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    let reject!: (error: Error) => void;
    const remove = vi.spyOn(adminApi, "deleteNotice").mockReturnValue(new Promise<void>((_, failure) => { reject = failure; }));
    const onError = vi.fn();
    const onChanged = vi.fn();
    render(<NoticePanel accessToken="token" notices={[notice]} onChanged={onChanged} onError={onError} />);
    await user.click(screen.getByRole("button", { name: notice.title }));
    await user.dblClick(screen.getByRole("button", { name: `${notice.title} 공지 삭제` }));
    expect(remove).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: `${notice.title} 공지 삭제` })).toBeDisabled();
    reject(new Error("offline"));
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.getByLabelText("공지 제목")).toHaveValue(notice.title);
    expect(screen.getByRole("button", { name: notice.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: `${notice.title} 공지 삭제` })).toBeEnabled();
  });

  it("disables deletion while edits are unsaved", async () => {
    const user = userEvent.setup();
    render(<NoticePanel accessToken="token" notices={[notice]} onChanged={vi.fn()} onError={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: notice.title }));
    await user.type(screen.getByLabelText("공지 제목"), " 수정");
    expect(screen.getByRole("button", { name: `${notice.title} 공지 삭제` })).toBeDisabled();
  });
});
