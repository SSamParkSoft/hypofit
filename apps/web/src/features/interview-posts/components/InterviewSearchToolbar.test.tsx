import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { InterviewSearchToolbar } from "./InterviewSearchToolbar";

afterEach(() => {
  document.body.style.pointerEvents = "";
});

describe("InterviewSearchToolbar", () => {
  it("opens the mobile filter dialog and restores focus to the trigger on close", async () => {
    const user = userEvent.setup();

    render(
      <InterviewSearchToolbar
        isNearbyEnabled={false}
        modeFilter="all"
        nearbyRadiusM={3000}
        nearbyStatus="idle"
        query=""
        resultCount={12}
        compensationFilter="all"
        postingTypeFilter="all"
        onClearFilters={vi.fn()}
        onModeChange={vi.fn()}
        onNearbyDisable={vi.fn()}
        onNearbyEnable={vi.fn()}
        onNearbyRadiusChange={vi.fn()}
        onQueryChange={vi.fn()}
        onCompensationChange={vi.fn()}
        onPostingTypeChange={vi.fn()}
      />,
    );

    const trigger = screen.getByRole("button", { name: /필터/ });

    await user.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "필터" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
