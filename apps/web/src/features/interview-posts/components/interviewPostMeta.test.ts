import { describe, expect, it } from "vitest";

import { formatReward, interviewModeLabels } from "./interviewPostMeta";

describe("interview post meta helpers", () => {
  it("formats interview rewards for Korean won", () => {
    expect(formatReward(15000)).toBe("15,000원");
    expect(formatReward(200000)).toBe("200,000원");
  });

  it("maps interview mode labels to product Korean copy", () => {
    expect(interviewModeLabels.online).toBe("화상");
    expect(interviewModeLabels.offline).toBe("대면");
    expect(interviewModeLabels.both).toBe("대면/화상");
  });
});
