import type { ReactNode } from "react";

import { cn } from "./cn";

export const workspaceHeightClassNames = {
  content:
    "min-h-[var(--app-workspace-content-height)] md:max-[1199px]:h-[var(--app-workspace-content-height)]",
  framedDesktop: "min-[1200px]:h-[var(--app-workspace-framed-height)] min-[1200px]:min-h-0",
  stickyPanel: "max-h-[var(--app-workspace-sticky-panel-max-height)]",
} as const;

export const workspaceOffsetClassNames = {
  frameGap: "top-[var(--app-workspace-frame-gap)]",
} as const;

export const workspaceScrollOwnershipClassNames = {
  clip: "overflow-hidden",
  panel: "min-h-0 overflow-y-auto overscroll-contain",
} as const;

export interface WorkspaceRegionClassNameOptions {
  height?: keyof typeof workspaceHeightClassNames;
  offset?: keyof typeof workspaceOffsetClassNames;
  scroll?: keyof typeof workspaceScrollOwnershipClassNames;
}

export function getWorkspaceRegionClassName({
  height,
  offset,
  scroll,
}: WorkspaceRegionClassNameOptions = {}) {
  return cn(
    height ? workspaceHeightClassNames[height] : null,
    offset ? workspaceOffsetClassNames[offset] : null,
    scroll ? workspaceScrollOwnershipClassNames[scroll] : null,
  );
}

export function SplitView({
  detail,
  list,
  className,
}: {
  detail: ReactNode;
  list: ReactNode;
  className?: string;
}) {
  const hasDetail = detail !== null && detail !== false;

  return (
    <section
      className={cn(
        "grid min-w-0 items-start gap-4",
        hasDetail
          ? "min-[1200px]:grid-cols-[minmax(520px,1fr)_minmax(360px,420px)] min-[1440px]:gap-5"
          : "min-[1200px]:grid-cols-1",
        className,
      )}
    >
      <div className="min-w-0">{list}</div>
      {hasDetail ? (
        <aside className="hidden min-w-0 min-[1200px]:block">{detail}</aside>
      ) : null}
    </section>
  );
}

export function ListSurface({
  children,
  className,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  labelledBy?: string;
}) {
  return (
    <section
      aria-labelledby={labelledBy}
      className={cn(
        "ui-pane min-w-0 border-y border-hypo-border bg-hypo-surface sm:rounded-hypo-md sm:border",
        getWorkspaceRegionClassName({ scroll: "clip" }),
        className,
      )}
    >
      {children}
    </section>
  );
}

export function ContextPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "ui-pane sticky rounded-hypo-md border border-hypo-border bg-hypo-surface",
        getWorkspaceRegionClassName({
          height: "stickyPanel",
          offset: "frameGap",
          scroll: "panel",
        }),
        className,
      )}
    >
      {children}
    </div>
  );
}
