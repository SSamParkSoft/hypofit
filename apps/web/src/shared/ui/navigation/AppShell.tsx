import { cn } from "../cn";
import type {
  AppDestination,
  AppShellActiveDestination,
  AppShellNavItem,
} from "./types";
import type { MouseEvent, ReactNode } from "react";

interface AppShellProps {
  accountMenu?: ReactNode;
  activeDestination?: AppShellActiveDestination;
  brandHref?: string;
  children: ReactNode;
  navItems: AppShellNavItem[];
  notificationButton?: ReactNode;
  onNavigate: (destination: AppDestination) => void;
}

export function AppShell({
  accountMenu,
  activeDestination,
  brandHref = "/app",
  children,
  navItems,
  notificationButton,
  onNavigate,
}: AppShellProps) {
  const managesOwnMobileViewport = activeDestination === "map";
  const managesOwnDesktopScroll =
    activeDestination === "chat" || activeDestination === "map";

  return (
    <div
      className="min-h-dvh bg-hypo-bg text-hypo-text min-[1200px]:grid min-[1200px]:grid-rows-[var(--app-desktop-header-height)_minmax(var(--app-shell-content-height),auto)]"
      data-app-destination={activeDestination ?? undefined}
    >
      <a
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-hypo-md bg-hypo-brand px-4 py-2 text-sm font-semibold text-white shadow-hypo-floating transition-transform focus:translate-y-0"
        href="#app-content"
      >
        본문으로 건너뛰기
      </a>
      <AppTopNav
        activeDestination={activeDestination}
        brandHref={brandHref}
        items={navItems}
        notificationButton={notificationButton}
        accountMenu={accountMenu}
        onNavigate={onNavigate}
      />
      <main
        id="app-content"
        tabIndex={-1}
        className={cn(
          "min-w-0 bg-hypo-bg outline-none [view-transition-name:page-content] md:pb-0",
          "min-[1200px]:row-start-2",
          managesOwnDesktopScroll
            ? "min-[1200px]:h-[var(--app-shell-content-height)] min-[1200px]:overflow-hidden"
            : "min-[1200px]:min-h-0",
          managesOwnMobileViewport
            ? "pb-0"
            : "pb-[var(--app-content-bottom-reserve)]",
        )}
        data-app-destination={activeDestination ?? undefined}
        data-app-shell-region="main"
      >
        {children}
      </main>
      <MobileBottomNav
        activeDestination={activeDestination}
        items={navItems}
        onNavigate={onNavigate}
      />
    </div>
  );
}

function AppTopNav({
  accountMenu,
  activeDestination,
  brandHref,
  items,
  notificationButton,
  onNavigate,
}: {
  accountMenu?: ReactNode;
  activeDestination?: AppShellActiveDestination;
  brandHref: string;
  items: AppShellNavItem[];
  notificationButton?: ReactNode;
  onNavigate: (destination: AppDestination) => void;
}) {
  return (
    <header
      className="sticky top-0 z-50 hidden h-[var(--app-medium-nav-height)] border-b border-hypo-border/60 bg-hypo-bg/94 backdrop-blur-xl supports-[backdrop-filter]:bg-hypo-bg/86 md:flex min-[1200px]:row-start-1 min-[1200px]:h-[var(--app-desktop-header-height)]"
      data-app-shell-region="top-navigation"
    >
      <div className="mx-auto flex w-full max-w-[1720px] items-center gap-8 px-[var(--app-page-x)]">
        <a
          className="flex shrink-0 items-center gap-2 rounded-hypo-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
          href={brandHref}
        >
          <img
            alt=""
            className="size-8 rounded-hypo-md min-[1200px]:size-9"
            src="/brand/hypofit-mark.svg"
          />
          <strong className="ui-display-brand font-brand text-hypo-text">
            Hypofit
          </strong>
        </a>
        <nav
          className="flex min-w-0 flex-1 items-stretch gap-1 self-stretch"
          aria-label="Hypofit primary navigation"
        >
          {items.map((item) => {
            const isActive = item.id === activeDestination;

            return (
              <a
                key={item.id}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "ui-control-text relative inline-flex min-h-10 min-w-0 shrink-0 self-center items-center justify-center px-3 text-hypo-text-muted transition-colors hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20 after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:scale-x-0 after:bg-hypo-brand after:transition-transform",
                  isActive && "font-semibold text-hypo-brand after:scale-x-100",
                )}
                href={item.href}
                onClick={(event) => handleNavClick(event, item.id, onNavigate)}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
        <div
          aria-label="전역 작업"
          className="relative flex shrink-0 items-center gap-1 overflow-visible"
          role="region"
        >
          {notificationButton}
          {accountMenu}
        </div>
      </div>
    </header>
  );
}

function MobileBottomNav({
  activeDestination,
  items,
  onNavigate,
}: {
  activeDestination?: AppShellActiveDestination;
  items: AppShellNavItem[];
  onNavigate: (destination: AppDestination) => void;
}) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hypo-border/90 bg-hypo-surface/96 px-2 pb-[var(--app-safe-bottom)] shadow-[0_-1px_16px_rgb(29_37_34_/_0.05)] backdrop-blur md:hidden"
      aria-label="Hypofit mobile navigation"
    >
      <div className="mx-auto grid h-[var(--app-mobile-nav-height)] max-w-md grid-cols-5 items-center gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeDestination;
          const label = item.mobileLabel ?? item.label;

          return (
            <a
              key={item.id}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group grid h-[56px] min-w-0 place-items-center content-center gap-0.5 rounded-hypo-md px-1 text-[11px] font-semibold leading-none text-hypo-text-muted transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
                isActive
                  ? "text-hypo-brand"
                  : "hover:bg-hypo-surface-muted hover:text-hypo-text",
              )}
              href={item.href}
              onClick={(event) => handleNavClick(event, item.id, onNavigate)}
            >
              <span
                className={cn(
                  "grid h-[28px] w-[36px] place-items-center rounded-hypo-md transition-colors",
                  isActive && "bg-hypo-brand-soft",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "transition-transform",
                    isActive && "scale-105",
                  )}
                  data-active={isActive ? "true" : undefined}
                  size={isActive ? 21 : 20}
                  strokeWidth={isActive ? 2.5 : 2.2}
                />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

function handleNavClick(
  event: MouseEvent<HTMLAnchorElement>,
  destination: AppDestination,
  onNavigate: (destination: AppDestination) => void,
) {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return;
  }

  event.preventDefault();
  onNavigate(destination);
}
