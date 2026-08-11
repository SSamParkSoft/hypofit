import type { ReactNode } from "react";

import { Button } from "./button";
import { cn } from "./cn";

interface StateBlockProps {
  action?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
  title: string;
}

export type LoadingStateLiveMode = "off" | "polite" | "assertive";

export interface LoadingStateProps {
  busy?: boolean;
  className?: string;
  live?: LoadingStateLiveMode;
  title?: string;
}

export function EmptyState({ action, children, className, title }: StateBlockProps) {
  return (
    <div
      data-state-block="empty"
      className={cn(
        "grid justify-items-center gap-2 rounded-hypo-md border border-dashed border-hypo-border bg-hypo-surface/55 px-5 py-8 text-center",
        className,
      )}
    >
      <h3 className="ui-section-title text-hypo-text">{title}</h3>
      {children ? (
        <div className="ui-body ui-empty-copy text-hypo-text-muted">{children}</div>
      ) : null}
      {action ? (
        <Button className="mt-2" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

function getLoadingLiveRegionProps(live: LoadingStateLiveMode) {
  if (live === "polite") {
    return {
      "aria-atomic": "true" as const,
      role: "status" as const,
    };
  }

  if (live === "assertive") {
    return {
      "aria-atomic": "true" as const,
      role: "alert" as const,
    };
  }

  return {};
}

export function LoadingState({
  busy = true,
  className,
  live = "off",
  title = "불러오는 중입니다.",
}: LoadingStateProps) {
  const liveRegionProps = getLoadingLiveRegionProps(live);

  return (
    <div
      aria-busy={busy || undefined}
      data-state-block="loading"
      className={cn(
        "ui-control-text flex min-h-14 items-center rounded-hypo-md border border-hypo-border bg-hypo-surface px-4 py-3 text-hypo-text-muted",
        className,
      )}
      {...liveRegionProps}
    >
      {title}
    </div>
  );
}

export function ErrorState({ children, className, title }: StateBlockProps) {
  return (
    <div
      data-state-block="error"
      className={cn(
        "rounded-hypo-md border border-hypo-danger/20 bg-hypo-danger-soft/70 px-4 py-4 text-hypo-danger",
        className,
      )}
    >
      <h3 className="ui-label">{title}</h3>
      {children ? <div className="ui-body mt-2 text-hypo-danger">{children}</div> : null}
    </div>
  );
}
