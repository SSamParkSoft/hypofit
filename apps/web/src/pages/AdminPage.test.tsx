import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  getMe: vi.fn(),
  getSummary: vi.fn(),
  getTargetPreview: vi.fn(),
  listAccountDeletionRequests: vi.fn(),
  listTickets: vi.fn(),
}));

vi.mock("../features/admin/components", () => ({
  AccountDeletionDetailPanel: () => <div>MockDeletionDetail</div>,
  AccountDeletionListPanel: () => <div>MockDeletionList</div>,
  AdminAccessState: ({
    description,
    title,
  }: {
    description: string;
    title: string;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
  AdminSectionNavigation: ({
    onSectionChange,
    section,
  }: {
    onSectionChange: (section: "tickets" | "reports" | "deletion" | "health" | "push" | "notices" | "operations") => void;
    section: string;
  }) => (
    <nav aria-label="관리자 섹션">
      <p>{`section:${section}`}</p>
      <button type="button" onClick={() => onSectionChange("tickets")}>
        문의
      </button>
      <button type="button" onClick={() => onSectionChange("health")}>
        상태 점검
      </button>
      <button type="button" onClick={() => onSectionChange("push")}>
        알림/푸시
      </button>
      <button type="button" onClick={() => onSectionChange("deletion")}>
        계정 삭제
      </button>
      <button type="button" onClick={() => onSectionChange("operations")}>
        서비스 운영
      </button>
    </nav>
  ),
  AdminSummaryStrip: ({ summary }: { summary: { support: { open: number } } }) => (
    <div>{`열린 티켓:${summary.support.open}`}</div>
  ),
  HealthPanel: ({
    health,
    healthJson,
    onRefresh,
  }: {
    health: { api: string } | null;
    healthJson: Record<string, unknown> | null;
    onRefresh: () => void;
  }) => (
    <section>
      <p>{`health:${health?.api ?? "unknown"}`}</p>
      <p>{healthJson ? JSON.stringify(healthJson) : "health:none"}</p>
      <button type="button" onClick={onRefresh}>
        헬스 새로고침
      </button>
    </section>
  ),
  MaintenancePanel: ({ maintenances = [] }: { maintenances?: unknown[] }) => (
    <div>{`maintenances:${maintenances.length}`}</div>
  ),
  NoticePanel: ({ notices = [] }: { notices?: unknown[] }) => <div>{`notices:${notices.length}`}</div>,
  PushPanel: ({
    accessToken,
    onAction,
    onError,
  }: {
    accessToken: string;
    onAction: (message: string) => void;
    onError: (message: string) => void;
  }) => (
    <section>
      <p>{`push:${accessToken}`}</p>
      <button type="button" onClick={() => onAction("테스트 알림을 만들었습니다.")}>
        푸시 액션
      </button>
      <button type="button" onClick={() => onError("푸시 실패")}>
        푸시 에러
      </button>
    </section>
  ),
  SupportTicketDetailPanel: ({
    ticket,
  }: {
    ticket: { id: string } | null;
  }) => <div>{`detail:${ticket?.id ?? "none"}`}</div>,
  SupportTicketListPanel: ({
    onRefresh,
    section,
    tickets,
  }: {
    onRefresh: () => void;
    section: string;
    tickets: unknown[];
  }) => (
    <section>
      <p>{`list:${section}:${tickets.length}`}</p>
      <button type="button" onClick={onRefresh}>
        목록 새로고침
      </button>
    </section>
  ),
}));

vi.mock("../shared/api/admin", () => ({
  adminApi: {
    getMe: (...args: unknown[]) => mocks.getMe(...args),
    getSummary: (...args: unknown[]) => mocks.getSummary(...args),
    getTargetPreview: (...args: unknown[]) => mocks.getTargetPreview(...args),
    listAccountDeletionRequests: (...args: unknown[]) => mocks.listAccountDeletionRequests(...args),
    listMaintenances: vi.fn().mockResolvedValue([]),
    listNotices: vi.fn().mockResolvedValue([]),
    listTickets: (...args: unknown[]) => mocks.listTickets(...args),
  },
}));

vi.mock("../shared/api/client", () => ({
  apiRequest: (...args: unknown[]) => mocks.apiRequest(...args),
}));

import { AdminPage } from "./AdminPage";

const admin = {
  email: "admin@example.com",
  id: "admin-id",
  name: "운영자",
  role: "admin" as const,
};

const summary = {
  health: {
    api: "ok",
    database: "ok",
    outbound_email: "configured",
    push: "ready",
  },
  support: {
    account_deletion_open: 1,
    in_review: 1,
    open: 2,
    reports_open: 1,
  },
};

describe("AdminPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.getMe.mockResolvedValue(admin);
    mocks.getSummary.mockResolvedValue(summary);
    mocks.getTargetPreview.mockResolvedValue(null);
    mocks.listAccountDeletionRequests.mockResolvedValue([]);
    mocks.listTickets.mockResolvedValue([]);
    mocks.apiRequest.mockResolvedValue({
      database: "ok",
      ready: true,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the access state when the admin bootstrap request is rejected", async () => {
    mocks.getMe.mockRejectedValueOnce(new Error("관리자 권한이 없어요."));

    render(<AdminPage accessToken="token" />);

    expect(await screen.findByRole("heading", { level: 1, name: "관리자 권한이 필요합니다." })).toBeInTheDocument();
    expect(screen.getByText("관리자 권한이 없어요.")).toBeInTheDocument();
    expect(mocks.listTickets).not.toHaveBeenCalled();
  });

  it("loads readiness data when the health section becomes active and refreshes it on demand", async () => {
    const user = userEvent.setup();

    render(<AdminPage accessToken="token" />);

    expect(await screen.findByText("list:tickets:0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "상태 점검" }));

    expect(await screen.findByText("health:ok")).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.apiRequest).toHaveBeenCalledWith("/api/v1/health/ready", expect.any(Object)),
    );
    expect(screen.getByText('{"database":"ok","ready":true}')).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "헬스 새로고침" }));

    await waitFor(() => expect(mocks.apiRequest).toHaveBeenCalledTimes(2));
  });

  it("renders the push section and refreshes admin data after a panel action", async () => {
    const user = userEvent.setup();

    render(<AdminPage accessToken="token" />);

    expect(await screen.findByText("list:tickets:0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "알림/푸시" }));

    expect(await screen.findByText("push:token")).toBeInTheDocument();
    const getMeCallsBeforeAction = mocks.getMe.mock.calls.length;
    const listTicketCallsBeforeAction = mocks.listTickets.mock.calls.length;

    await user.click(screen.getByRole("button", { name: "푸시 액션" }));

    expect(await screen.findByText("테스트 알림을 만들었습니다.")).toBeInTheDocument();
    await waitFor(() => expect(mocks.getMe).toHaveBeenCalledTimes(getMeCallsBeforeAction + 1));
    await waitFor(() =>
      expect(mocks.listTickets).toHaveBeenCalledTimes(listTicketCallsBeforeAction + 1),
    );
  });

  it("loads the service operations section", async () => {
    const user = userEvent.setup();

    render(<AdminPage accessToken="token" />);
    expect(await screen.findByText("list:tickets:0")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "서비스 운영" }));

    expect(await screen.findByText("maintenances:0")).toBeInTheDocument();
  });
});
