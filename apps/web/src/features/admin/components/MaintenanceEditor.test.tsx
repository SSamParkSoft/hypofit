import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "../../../shared/api/admin";
import type { AdminMaintenance } from "../../../shared/api/types";
import { MaintenanceEditor } from "./MaintenanceEditor";

const maintenance: AdminMaintenance = { id: "maintenance-1", title: "안정화 점검", message: "서비스 점검을 진행하고 있어요.", mode: "FULL", status: "IN_PROGRESS", starts_at: "2026-10-05T01:00:37Z", ends_at: "2026-10-05T03:00:43Z", notice_id: "notice-1", show_banner: true, banner_starts_at: "2026-10-04T01:00:00Z", started_at: "2026-10-05T01:00:37Z", completed_at: null, created_at: "2026-10-04T01:00:00Z", updated_at: "2026-10-05T01:00:37Z", version: 3 };
function mount(onError = vi.fn()) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MaintenanceEditor adminId="admin-1" accessToken="token" maintenance={maintenance} onClose={vi.fn()} onChanged={vi.fn()} onError={onError} /></QueryClientProvider>);
}
beforeEach(() => { vi.spyOn(window, "confirm").mockReturnValue(true); vi.spyOn(adminApi, "listMaintenanceEvents").mockResolvedValue([{ id: "event-1", actorId: "admin-1", actorName: "운영자", action: "MAINTENANCE_UPDATED", before: '{"message":"이전"}', after: '{"message":"변경"}', createdAt: "2026-10-05T02:00:00Z" }]); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("maintenance operations editing", () => {
  it("preserves unchanged instant precision, uses expected version and displays the actor", async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(adminApi, "updateMaintenance").mockResolvedValue({ ...maintenance, message: `${maintenance.message} 연장 안내`, version: 4 });
    mount();
    expect(screen.getByLabelText("수정 시작 날짜")).toBeDisabled();
    await user.type(screen.getByLabelText("점검 안내 수정"), " 연장 안내");
    await user.click(screen.getByRole("button", { name: "점검 안내 저장" }));
    await waitFor(() => expect(update).toHaveBeenCalledWith(maintenance.id, expect.objectContaining({ expected_version: 3, starts_at: maintenance.starts_at, ends_at: maintenance.ends_at }), "token"));
    expect(await screen.findByText(/운영자 ·/)).toBeInTheDocument();
    expect(screen.getByText("안내 문구")).toBeInTheDocument();
  });

  it("keeps the input and original version after a conflict", async () => {
    const user = userEvent.setup();
    const onError = vi.fn();
    const update = vi.spyOn(adminApi, "updateMaintenance").mockRejectedValue(new Error("conflict"));
    mount(onError);
    await user.type(screen.getByLabelText("점검 안내 수정"), " 변경");
    await user.click(screen.getByRole("button", { name: "점검 안내 저장" }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByLabelText("점검 안내 수정")).toHaveValue(`${maintenance.message} 변경`);
    expect(update.mock.calls[0][1].expected_version).toBe(3);
  });

  it("rejects an incomplete end time without sending a PATCH", async () => {
    const user = userEvent.setup();
    const update = vi.spyOn(adminApi, "updateMaintenance");
    mount();
    await user.clear(screen.getByLabelText("수정 종료 시간"));
    await user.click(screen.getByRole("button", { name: "점검 안내 저장" }));
    expect(screen.getByRole("alert")).toHaveTextContent("시작·종료 날짜와 시간을 모두 확인해 주세요.");
    expect(update).not.toHaveBeenCalled();
  });
});
