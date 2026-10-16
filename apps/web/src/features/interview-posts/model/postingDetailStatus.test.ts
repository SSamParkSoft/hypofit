import { describe, expect, it } from "vitest";
import type { InterviewPost } from "@hypofit/contracts";
import { getPostingDetailStatus } from "./postingDetailStatus";

const now = Date.parse("2026-10-11T06:00:00Z");
const post = { status: "open", recruitment_type: "survey" } as InterviewPost;

describe("survey detail status", () => {
  it.each([
    ["2026-10-11T05:59:59Z", "closed"],
    ["2026-10-11T06:00:00Z", "closed"],
    ["2026-10-11T15:00:00+09:00", "closed"],
    ["2026-10-11T06:00:01Z", "open"],
    [null, "open"],
  ] as const)("compares deadline %s as an instant", (deadline, status) => {
    expect(getPostingDetailStatus({ ...post, participation_deadline_at: deadline }, now)).toBe(status);
  });
  it.each(["completed", "closed", "hidden", "removed", "draft", "archived"] as const)(
    "retains the server's %s state", (status) => {
      expect(getPostingDetailStatus({ ...post, status, participation_deadline_at: new Date(now).toISOString() }, now)).toBe(status);
    },
  );
  it.each(["interview", "beta_test", "research_experiment"] as const)(
    "does not change %s participation policy", (type) => {
      expect(getPostingDetailStatus({ ...post, recruitment_type: type, participation_deadline_at: new Date(now).toISOString() }, now)).toBe("open");
    },
  );
});
