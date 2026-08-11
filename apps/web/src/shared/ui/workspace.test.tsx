import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ContextPanel,
  ListSurface,
  SplitView,
  getWorkspaceRegionClassName,
} from "./workspace";

describe("workspace shared contracts", () => {
  it("keeps the desktop split-view class contract", () => {
    render(<SplitView detail={<div>상세</div>} list={<div>목록</div>} />);

    const splitView = screen.getByText("목록").closest("section");
    const detail = screen.getByText("상세").closest("aside");

    expect(splitView?.className).toContain(
      "min-[1200px]:grid-cols-[minmax(520px,1fr)_minmax(360px,420px)]",
    );
    expect(splitView?.className).toContain("min-[1440px]:gap-5");
    expect(detail?.className).toContain("min-[1200px]:block");
  });

  it("applies the shared list-surface overflow ownership contract", () => {
    render(<ListSurface labelledBy="list-heading"><div id="list-heading">목록</div></ListSurface>);

    const listSurface = screen.getByRole("region", { name: "목록" });

    expect(listSurface.className).toContain("ui-pane");
    expect(listSurface.className).toContain("overflow-hidden");
    expect(listSurface.className).toContain("sm:rounded-hypo-md");
  });

  it("uses shared sticky-panel height and scroll variables", () => {
    render(<ContextPanel>상세 패널</ContextPanel>);

    const panel = screen.getByText("상세 패널");

    expect(panel.className).toContain("sticky");
    expect(panel.className).toContain("top-[var(--app-workspace-frame-gap)]");
    expect(panel.className).toContain("max-h-[var(--app-workspace-sticky-panel-max-height)]");
    expect(panel.className).toContain("overflow-y-auto");
    expect(panel.className).toContain("overscroll-contain");
  });

  it("exposes reusable workspace class helpers for future page adoption", () => {
    const contentWorkspaceClassName = getWorkspaceRegionClassName({
      height: "content",
      scroll: "clip",
    });
    const framedPanelClassName = getWorkspaceRegionClassName({
      height: "framedDesktop",
      scroll: "panel",
    });

    expect(contentWorkspaceClassName).toContain("min-h-[var(--app-workspace-content-height)]");
    expect(contentWorkspaceClassName).toContain(
      "md:max-[1199px]:h-[var(--app-workspace-content-height)]",
    );
    expect(contentWorkspaceClassName).toContain("overflow-hidden");

    expect(framedPanelClassName).toContain("min-[1200px]:h-[var(--app-workspace-framed-height)]");
    expect(framedPanelClassName).toContain("min-[1200px]:min-h-0");
    expect(framedPanelClassName).toContain("overflow-y-auto");
  });
});
