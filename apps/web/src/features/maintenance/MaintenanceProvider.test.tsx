import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MaintenanceProvider, useMaintenance } from "./MaintenanceProvider";
import { fetchServiceStatus, normalServiceStatus } from "./serviceStatus";

vi.mock("./serviceStatus", async (original) => ({
  ...await original<typeof import("./serviceStatus")>(),
  fetchServiceStatus: vi.fn(),
}));

function Probe() {
  const { isActive } = useMaintenance();
  return <span>{isActive ? "blocked" : "normal"}</span>;
}

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe("maintenance polling", () => {
  it("rechecks unchanged status repeatedly and stops after completion", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.mocked(fetchServiceStatus).mockReset().mockResolvedValue({
      ...normalServiceStatus(), mode: "FULL", status: "IN_PROGRESS",
    });
    await act(async () => { render(<MaintenanceProvider><Probe /></MaintenanceProvider>); });
    expect(screen.getByText("blocked")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(130_000); });
    expect(fetchServiceStatus).toHaveBeenCalledTimes(3);
    vi.mocked(fetchServiceStatus).mockResolvedValue(normalServiceStatus());
    await act(async () => { await vi.advanceTimersByTimeAsync(65_000); });
    expect(screen.getByText("normal")).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(130_000); });
    expect(fetchServiceStatus).toHaveBeenCalledTimes(4);
  });

  it("keeps retrying after a failed check and cancels on unmount", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.mocked(fetchServiceStatus).mockReset().mockResolvedValueOnce({
      ...normalServiceStatus(), mode: "FULL", status: "IN_PROGRESS",
    }).mockRejectedValue(new Error("offline"));
    const view = render(<MaintenanceProvider><Probe /></MaintenanceProvider>);
    await act(async () => {});
    await act(async () => { await vi.advanceTimersByTimeAsync(130_000); });
    expect(fetchServiceStatus).toHaveBeenCalledTimes(3);
    view.unmount();
    await vi.advanceTimersByTimeAsync(130_000);
    expect(fetchServiceStatus).toHaveBeenCalledTimes(3);
  });
});
