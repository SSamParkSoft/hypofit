import type { ReactNode } from "react";

import { cn } from "./cn";

export type PageLayoutVariant =
  | "document"
  | "form"
  | "list-detail"
  | "settings-form"
  | "workspace";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
  variant?: PageLayoutVariant;
}

const layoutClasses: Record<Exclude<PageLayoutVariant, "form">, string> = {
  document: "max-w-[900px]",
  "list-detail": "max-w-[1480px]",
  "settings-form": "max-w-[1280px]",
  workspace: "max-w-none min-[1200px]:h-dvh",
};

interface PageHeaderProps {
  action?: ReactNode;
  eyebrow?: string;
  title: string;
  description?: string;
}

function normalizePageLayoutVariant(
  variant: PageLayoutVariant,
): Exclude<PageLayoutVariant, "form"> {
  return variant === "form" ? "settings-form" : variant;
}

export function PageLayout({ children, className, variant = "list-detail" }: PageLayoutProps) {
  const normalizedVariant = normalizePageLayoutVariant(variant);

  return (
    <div
      data-page-layout={normalizedVariant}
      className={cn(
        "mx-auto grid min-w-0 w-full gap-[var(--app-page-gap)] px-[var(--app-page-x)] py-[var(--app-page-y)]",
        layoutClasses[normalizedVariant],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <PageLayout className={className} variant="list-detail">
      {children}
    </PageLayout>
  );
}

export function PageHeader({ action, description, eyebrow, title }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? <p className="ui-metadata text-hypo-brand">{eyebrow}</p> : null}
        <h1
          className={cn(
            "ui-page-title text-hypo-text",
            eyebrow && "mt-2",
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="ui-body mt-2 max-w-3xl text-hypo-text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0 sm:pt-0.5">{action}</div> : null}
    </header>
  );
}

export function PageToolbar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-3 border-b border-hypo-border py-3.5 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      {children}
    </div>
  );
}
