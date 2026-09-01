import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageLayout } from "./page";

describe("PageLayout", () => {
  it("lets the app shell own the viewport height for workspace pages", () => {
    render(<PageLayout variant="workspace">작업 공간</PageLayout>);

    const layout = screen.getByText("작업 공간");

    expect(layout).toHaveAttribute("data-page-layout", "workspace");
    expect(layout.className).toContain("max-w-none");
    expect(layout.className).not.toContain("h-dvh");
  });
});
