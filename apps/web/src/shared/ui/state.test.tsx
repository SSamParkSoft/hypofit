import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LoadingState } from "./state";

describe("LoadingState", () => {
  it("keeps the default class contract while marking the region busy", () => {
    render(<LoadingState />);

    const loadingState = screen.getByText("불러오는 중입니다.");

    expect(loadingState).toHaveAttribute("data-state-block", "loading");
    expect(loadingState).toHaveAttribute("aria-busy", "true");
    expect(loadingState).not.toHaveAttribute("role");
    expect(loadingState).not.toHaveAttribute("aria-live");
    expect(loadingState.className).toContain("ui-control-text");
    expect(loadingState.className).toContain("min-h-14");
    expect(loadingState.className).toContain("border-hypo-border");
  });

  it("uses polite status semantics without duplicating an explicit aria-live attribute", () => {
    render(<LoadingState live="polite" title="채팅을 불러오는 중입니다." />);

    const loadingState = screen.getByRole("status");

    expect(loadingState).toHaveTextContent("채팅을 불러오는 중입니다.");
    expect(loadingState).toHaveAttribute("aria-atomic", "true");
    expect(loadingState).not.toHaveAttribute("aria-live");
    expect(loadingState).toHaveAttribute("aria-busy", "true");
  });

  it("supports assertive alerts and opt-out busy semantics", () => {
    render(
      <LoadingState
        busy={false}
        live="assertive"
        title="메시지를 불러오는 중입니다."
      />,
    );

    const loadingState = screen.getByRole("alert");

    expect(loadingState).toHaveTextContent("메시지를 불러오는 중입니다.");
    expect(loadingState).toHaveAttribute("aria-atomic", "true");
    expect(loadingState).not.toHaveAttribute("aria-busy");
    expect(loadingState).not.toHaveAttribute("aria-live");
  });
});
