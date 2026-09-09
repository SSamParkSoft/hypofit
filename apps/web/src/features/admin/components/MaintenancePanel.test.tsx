import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "../../../shared/api/admin";
import { MaintenancePanel } from "./MaintenancePanel";

vi.mock("../../../shared/api/admin", () => ({
  adminApi: { createMaintenance: vi.fn() },
}));

describe("scheduled maintenance banner", () => {
  const now = new Date("2026-09-09T05:00:00Z");
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(now);
    vi.mocked(adminApi.createMaintenance).mockReset();
    vi.mocked(adminApi.createMaintenance).mockResolvedValue({} as Awaited<ReturnType<typeof adminApi.createMaintenance>>);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it.each([true, false])("sends the immediate exposure policy when showBanner=%s", async (showBanner) => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<MaintenancePanel accessToken="test-token" maintenances={[]} onChanged={onChanged} onError={vi.fn()} />);
    await user.type(screen.getByLabelText("점검 제목"), "시스템 점검");
    await user.type(screen.getByLabelText("사용자 안내"), "서비스 안정화 작업을 진행해요.");
    if (!showBanner) await user.click(screen.getByLabelText("앱 상단에 점검 예정 안내를 표시해요"));
    await user.click(screen.getByRole("button", { name: "점검 예약" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    const [input, token] = vi.mocked(adminApi.createMaintenance).mock.calls[0];
    expect(token).toBe("test-token");
    expect(input.show_banner).toBe(showBanner);
    expect(input.banner_starts_at).toBe(showBanner ? now.toISOString() : null);
    expect(new Date(input.starts_at).getTime()).toBeGreaterThan(now.getTime());
  });

  it("keeps the reservation content after an API failure", async () => {
    vi.mocked(adminApi.createMaintenance).mockRejectedValue(new Error("offline"));
    const user = userEvent.setup();
    const onError = vi.fn();
    render(<MaintenancePanel accessToken="test-token" maintenances={[]} onChanged={vi.fn()} onError={onError} />);
    await user.type(screen.getByLabelText("점검 제목"), "시스템 점검");
    await user.type(screen.getByLabelText("사용자 안내"), "서비스 안정화 작업을 진행해요.");
    await user.click(screen.getByRole("button", { name: "점검 예약" }));
    await waitFor(() => expect(onError).toHaveBeenCalled());
    expect(screen.getByLabelText("점검 제목")).toHaveValue("시스템 점검");
    expect(screen.getByLabelText("사용자 안내")).toHaveValue("서비스 안정화 작업을 진행해요.");
    expect(screen.getByRole("button", { name: "점검 예약" })).toBeEnabled();
  });
});
