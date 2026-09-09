import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { InterviewPost } from "@hypofit/contracts";
import { SurveyParticipationPanel } from "./SurveyParticipationPanel";

const api = vi.hoisted(() => ({ current: vi.fn(), act: vi.fn() }));
vi.mock("../../../shared/api/surveyParticipations", () => ({ surveyParticipationsApi: api }));
vi.mock("../../auth/AuthProvider", async () => {
  const { createContext } = await import("react");
  return { AuthContext: createContext({ accessToken: "test-token", appUser: { id: "participant" } }) };
});
const post = { id: "survey", founder_id: "owner", status: "open", recruitment_type: "survey", entry_mode: "direct" } as InterviewPost;
let client: QueryClient;
function mount(status: string | null) {
  api.current.mockResolvedValue(status ? { id: "participation", status } : null);
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><SurveyParticipationPanel post={post} /></QueryClientProvider>);
}
afterEach(() => { cleanup(); client?.clear(); vi.resetAllMocks(); });

describe("survey participation", () => {
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
