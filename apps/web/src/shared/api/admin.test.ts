import { afterEach, describe, expect, it, vi } from "vitest";
import { adminApi } from "./admin";
import { apiRequest } from "./client";

vi.mock("./client", () => ({ apiRequest: vi.fn().mockResolvedValue([]) }));
afterEach(() => vi.clearAllMocks());
describe("admin wire requests", () => {
  it("serializes ticket filters and cancellation", async () => {
    const signal = new AbortController().signal;
    await adminApi.listTickets({ q: "문의 %", offset: 50, include_events: false, exclude_reports: true }, "token", signal);
    const [path, init] = vi.mocked(apiRequest).mock.calls[0];
    const params = new URL(`https://test.invalid${path}`).searchParams;
    expect(params.get("q")).toBe("문의 %");
    expect(params.get("offset")).toBe("50");
    expect(params.get("include_events")).toBe("false");
    expect(params.get("exclude_reports")).toBe("true");
    expect(init).toEqual({ accessToken: "token", signal });
  });
  it("serializes deletion pagination and search", async () => {
    await adminApi.listAccountDeletionRequests({ page: 0, q: "request-id", limit: 50 }, "token");
    const [path] = vi.mocked(apiRequest).mock.calls[0];
    const params = new URL(`https://test.invalid${path}`).searchParams;
    expect(params.get("page")).toBe("0");
    expect(params.get("q")).toBe("request-id");
  });
  it("uses the protected notice DELETE endpoint", async () => {
    await adminApi.deleteNotice("notice/id", "token");
    expect(apiRequest).toHaveBeenCalledWith("/api/v1/admin/notices/notice%2Fid", { accessToken: "token", method: "DELETE" });
  });
});
