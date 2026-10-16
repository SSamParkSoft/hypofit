import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InterviewPost } from "@hypofit/contracts";
import { surveyProviderOptions } from "@hypofit/contracts";
import { SurveyParticipationPanel } from "./SurveyParticipationPanel";

const api = vi.hoisted(() => ({ current: vi.fn(), act: vi.fn() }));
vi.mock("../../../shared/api/surveyParticipations", () => ({ surveyParticipationsApi: api }));
vi.mock("../../auth/AuthProvider", async () => {
  const { createContext } = await import("react");
  return { AuthContext: createContext({ accessToken: "test-token", appUser: { id: "participant" } }) };
});
const post = { id: "survey", founder_id: "owner", status: "open", recruitment_type: "survey", entry_mode: "direct" } as InterviewPost;
let client: QueryClient;
const assign = vi.fn();
const now = Date.parse("2026-10-11T06:00:00Z");
beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(now);
  vi.stubGlobal("window", new Proxy(window, {
    get(target, key) {
      return key === "location" ? { assign } : Reflect.get(target, key);
    },
  }));
});
function mount(status: string | null, posting = post) {
  api.current.mockResolvedValue(status ? { id: "participation", status } : null);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><SurveyParticipationPanel post={posting} /></QueryClientProvider>);
}
afterEach(() => { cleanup(); client?.clear(); vi.resetAllMocks(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("survey participation", () => {
  it.each([
    ["direct", null], ["direct", "opened"],
    ["application_required", null], ["application_required", "opened"],
  ] as const)("blocks expired %s participation in state %s without a mutation", async (entryMode, state) => {
    mount(state, { ...post, entry_mode: entryMode, participation_deadline_at: new Date(now).toISOString() });
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const open = await screen.findByRole("button", { name: "모집 종료" });
    expect(open).toBeDisabled();
    await user.click(open);
    if (state === "opened") {
      const submit = screen.getByRole("button", { name: "제출 알리기" });
      expect(submit).toBeDisabled();
      await user.click(submit);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "참여 취소" })).not.toBeInTheDocument();
    }
    expect(api.act).not.toHaveBeenCalled();
  });
  it("keeps an unexpired survey available", async () => {
    mount(null, { ...post, participation_deadline_at: new Date(now + 1000).toISOString() });
    expect(await screen.findByRole("button", { name: "설문 참여하기" })).toBeEnabled();
  });
  it("does not offer withdrawal before submission", async () => {
    mount("opened");
    expect(await screen.findByRole("button", { name: "설문 다시 열기" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "참여 취소" })).not.toBeInTheDocument();
  });
  it("retains submitted readback and withdrawal after the deadline", async () => {
    mount("submitted", { ...post, participation_deadline_at: new Date(now - 1000).toISOString() });
    expect(await screen.findByText("제출을 알렸어요. 모집자가 확인하고 있어요.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "참여 취소" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "설문 다시 열기" })).not.toBeInTheDocument();
  });
  it.each(surveyProviderOptions)("discloses the stored survey service: $label", async ({ value, label }) => {
    mount(null, { ...post, external_provider: value });
    expect(await screen.findByText(`설문 종류 · ${label}`)).toBeInTheDocument();
  });
  it.each(["https://tally.so/r/example", "https://research.typeform.com/to/example", "https://research.example.org/form"])(
  "opens an authorized external HTTPS form without caching its URL: %s", async (url) => {
    mount(null);
    api.act.mockResolvedValue({ id: "participation", status: "opened", external_url: url });
    await userEvent.click(await screen.findByRole("button", { name: "설문 참여하기" }));
    await screen.findByRole("button", { name: "설문 다시 열기" });
    expect(assign).toHaveBeenCalledWith(url);
    expect(screen.queryByText(/Google Forms/)).not.toBeInTheDocument();
    expect(JSON.stringify(client.getQueryCache().getAll().map((query) => query.state.data))).not.toContain(url);
  });
  it.each(["javascript:alert(1)", "http://example.com/form", "https://user:secret@example.com/form", "not-a-url"])(
  "does not navigate to an invalid external action: %s", async (url) => {
    mount(null);
    api.act.mockResolvedValue({ id: "participation", status: "opened", external_url: url });
    await userEvent.click(await screen.findByRole("button", { name: "설문 참여하기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("설문 링크를 열 수 없어요.");
    expect(assign).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "설문 다시 열기" })).toBeEnabled();
  });
  it("offers direct participation without an application form", async () => {
    mount(null);
    expect(await screen.findByRole("button", { name: "설문 참여하기" })).toBeEnabled();
    expect(api.current).toHaveBeenCalledWith("survey", "test-token");
  });
  it("requires explicit submit confirmation and replaces the current state", async () => {
    mount("opened");
    api.act.mockResolvedValue({ id: "participation", status: "submitted", external_url: "" });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "제출 알리기" }));
    expect(api.act).not.toHaveBeenCalled();
    const buttons = screen.getAllByRole("button", { name: "제출 알리기" });
    await user.click(buttons[buttons.length - 1]);
    expect(await screen.findByText("제출을 알렸어요. 모집자가 확인하고 있어요.")).toBeInTheDocument();
    expect(api.act).toHaveBeenCalledWith("survey", "submit", "test-token");
  });
  it.each(["withdrawn", "confirmed"])("does not offer reopening for %s", async (state) => {
    mount(state);
    await screen.findByText(state === "withdrawn" ? "참여 취소" : "참여 완료");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("keeps the open action retryable after failure", async () => {
    mount(null);
    api.act.mockRejectedValue(new Error("연결을 확인해 주세요."));
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "설문 참여하기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("연결을 확인해 주세요.");
    expect(screen.getByRole("button", { name: "설문 참여하기" })).toBeEnabled();
  });
});
