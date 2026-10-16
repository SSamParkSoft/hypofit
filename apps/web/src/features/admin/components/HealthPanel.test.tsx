import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { HealthPanel } from "./HealthPanel";

afterEach(cleanup);
const healthJson = { status: "degraded", checks: { database: "unavailable", push: { enabled: true, apns: { enabled: true, configured: true }, fcm: { enabled: true, configured: false } }, outbound_email: { configured: false } } };
it("shows actual readiness rather than an older healthy summary", () => {
  render(<HealthPanel health={{ api: "ok", database: "ok", push: "ready", outbound_email: "configured" }} healthJson={healthJson} onRefresh={vi.fn()} />);
  expect(within(screen.getByText("API").parentElement!).getByText("degraded")).toBeInTheDocument();
  expect(within(screen.getByText("DB").parentElement!).getByText("unavailable")).toBeInTheDocument();
  expect(within(screen.getByText("FCM 설정").parentElement!).getByText("미설정")).toHaveClass("text-hypo-warning");
  expect(within(screen.getByText("APNs 설정").parentElement!).getByText("설정됨")).toHaveClass("text-hypo-success");
});
it("marks old results as stale after a failed refresh and prevents duplicate refresh", () => {
  render(<HealthPanel health={null} healthJson={healthJson} checkedAt={Date.now()} error="연결 실패" isLoading onRefresh={vi.fn()} />);
  expect(screen.getByRole("button", { name: "새로고침" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("연결 실패");
  expect(within(screen.getByText("APNs 설정").parentElement!).getByText("설정됨")).not.toHaveClass("text-hypo-success");
});
