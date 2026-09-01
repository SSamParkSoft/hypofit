import { ArrowLeft, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "../../../shared/ui/badge";
import { cn } from "../../../shared/ui/cn";
import { PageHeader } from "../../../shared/ui/page";

export const profileSettingsSectionTitleClassName =
  "mb-2 px-1 text-[11px] font-semibold leading-5 tracking-[0.01em] text-hypo-text-soft";

export const profileSettingsSectionSurfaceClassName =
  "overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface";

export function ProfileSettingsHeader({
  action,
  description,
  onBack,
  title,
}: {
  action?: ReactNode;
  description: string;
  onBack?: () => void;
  title: string;
}) {
  return (
    <div className="grid gap-3.5">
      <div className="flex flex-wrap items-center gap-2">
        {onBack ? (
          <button
            aria-label="이전 화면"
            className="grid size-10 shrink-0 place-items-center rounded-hypo-md border border-hypo-border bg-hypo-surface text-hypo-text-muted transition-colors hover:bg-hypo-bg hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
            type="button"
            onClick={onBack}
          >
            <ArrowLeft size={17} />
          </button>
        ) : (
          <ProfileSettingsReturnLink />
        )}
      </div>
      <PageHeader action={action} description={description} title={title} />
    </div>
  );
}

export function ProfileSettingsSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section>
      <h2 className={profileSettingsSectionTitleClassName}>{title}</h2>
      <div className={profileSettingsSectionSurfaceClassName}>{children}</div>
    </section>
  );
}

export function ProfileSettingsInfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-[60px] flex-col justify-center gap-1.5 border-t border-hypo-border px-4 py-3.5 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-5">
      <span className="shrink-0 text-[13px] font-semibold leading-5 text-hypo-text-soft">
        {label}
      </span>
      <span className="min-w-0 text-sm font-semibold leading-6 text-hypo-text sm:max-w-[70%] sm:text-right">
        {value}
      </span>
    </div>
  );
}

export function ProfileSettingsStatusRow({
  enabled,
  helper,
  label,
}: {
  enabled: boolean;
  helper?: string;
  label: string;
}) {
  return (
    <div className="flex min-h-[64px] flex-col gap-2.5 border-t border-hypo-border px-4 py-3.5 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:px-5">
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-hypo-text">
          {label}
        </span>
        {helper ? (
          <span className="mt-0.5 block text-xs leading-5 text-hypo-text-muted">
            {helper}
          </span>
        ) : null}
      </span>
      <Badge intent={enabled ? "success" : "neutral"}>
        {enabled ? "사용 가능" : "꺼짐"}
      </Badge>
    </div>
  );
}

export function ProfileSettingsActionRow({
  helper,
  href,
  icon: Icon,
  label,
  onClick,
  tone = "default",
}: {
  helper?: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  tone?: "default" | "danger";
}) {
  const content = (
    <>
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center",
          tone === "danger" ? "text-hypo-danger" : "text-hypo-icon-muted",
        )}
      >
        <Icon size={16} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm font-semibold leading-5",
            tone === "danger" ? "text-hypo-danger" : "text-hypo-text",
          )}
        >
          {label}
        </span>
        {helper ? (
          <span className="mt-0.5 block text-xs leading-5 text-hypo-text-muted">
            {helper}
          </span>
        ) : null}
      </span>
      <ChevronRight size={16} className="shrink-0 text-hypo-text-soft" />
    </>
  );
  const className =
    "flex min-h-[64px] w-full items-start gap-3 border-t border-hypo-border px-4 py-3.5 text-left first:border-t-0 transition-colors hover:bg-hypo-surface-muted/55 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20 sm:px-5";

  if (href) {
    return (
      <a className={className} href={href}>
        {content}
      </a>
    );
  }

  return (
    <button className={className} type="button" onClick={onClick}>
      {content}
    </button>
  );
}

export function ProfileSettingsTextBlock({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <p
      className={cn(
        "border-t border-hypo-border px-4 py-3.5 text-sm leading-6 first:border-t-0 sm:px-5",
        tone === "danger" ? "text-hypo-danger" : "text-hypo-text-muted",
      )}
    >
      {children}
    </p>
  );
}

export function ProfileSettingsFormActionRow({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:justify-end">
      {children}
    </div>
  );
}

export function ProfileSettingsIndexRow({
  description,
  href,
  icon: Icon,
  label,
}: {
  description?: string;
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <a
      className="flex min-h-[76px] items-start gap-4 border-t border-hypo-border px-4 py-4 text-left first:border-t-0 transition-colors hover:bg-hypo-bg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20 sm:px-5"
      href={href}
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center text-hypo-icon-muted">
        <Icon aria-hidden="true" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-5 text-hypo-text">
          {label}
        </span>
        {description ? (
          <span className="mt-1 block text-xs leading-5 text-hypo-text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <ChevronRight
        aria-hidden="true"
        className="mt-0.5 shrink-0 text-hypo-text-soft"
        size={18}
      />
    </a>
  );
}

export function ProfileSettingsReturnLink({
  className,
}: {
  className?: string;
}) {
  return (
    <a
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-hypo-md border border-hypo-border bg-hypo-surface px-3 text-sm font-semibold text-hypo-text-muted transition-colors hover:bg-hypo-bg hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
        className,
      )}
      href="/profile"
    >
      <ArrowLeft aria-hidden="true" size={16} />
      설정으로
    </a>
  );
}
