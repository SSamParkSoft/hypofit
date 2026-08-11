import { cn } from "../cn";
import { AppUtilityFooter } from "../app-utility-footer";
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
  const managesOwnMobileViewport =
    activeDestination === "home" || activeDestination === "map";
  const managesOwnDesktopScroll =
    activeDestination === "chat" || activeDestination === "map";
  const showsDesktopUtilityFooter =
    activeDestination !== "chat" && activeDestination !== "map";

  return (
    <div
      className="min-h-dvh bg-hypo-bg text-hypo-text min-[1200px]:grid min-[1200px]:h-dvh min-[1200px]:grid-cols-[var(--app-rail-width)_minmax(0,1fr)] min-[1200px]:grid-rows-[var(--app-desktop-header-height)_minmax(0,1fr)] min-[1200px]:overflow-hidden"
      data-app-destination={activeDestination ?? undefined}
    >
      <a
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-hypo-md bg-hypo-brand px-4 py-2 text-sm font-semibold text-white shadow-hypo-floating transition-transform focus:translate-y-0"
        href="#app-content"
      >
        본문으로 건너뛰기
      </a>
      <DesktopBrandHeader href={brandHref} />
      <DesktopUtilityBar>
        {notificationButton}
        {accountMenu}
      </DesktopUtilityBar>
      <DesktopRail
        activeDestination={activeDestination}
        items={navItems}
        onNavigate={onNavigate}
      />
      <MediumTopNav
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
          "min-[1200px]:col-start-2 min-[1200px]:row-start-2 min-[1200px]:h-full",
          managesOwnDesktopScroll
            ? "min-[1200px]:overflow-hidden"
            : "min-[1200px]:overflow-y-auto",
          managesOwnMobileViewport ? "pb-0" : "pb-[var(--app-content-bottom-reserve)]",
        )}
        data-app-destination={activeDestination ?? undefined}
        data-app-shell-region="main"
      >
        {children}
        {showsDesktopUtilityFooter ? <AppUtilityFooter /> : null}
      </main>
      <MobileBottomNav
        activeDestination={activeDestination}
        items={navItems}
        onNavigate={onNavigate}
      />
    </div>
  );
}

function DesktopBrandHeader({ href }: { href: string }) {
  return (
    <header
      className="hidden border-b border-r border-hypo-border bg-hypo-surface px-5 min-[1200px]:col-start-1 min-[1200px]:row-start-1 min-[1200px]:flex min-[1200px]:h-[var(--app-desktop-header-height)] min-[1200px]:items-center"
      data-app-shell-region="desktop-brand-header"
    >
      <a
        className="flex items-center gap-3 rounded-hypo-md px-1 py-1 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
        href={href}
      >
        <img
          alt=""
          className="size-9 shrink-0 rounded-hypo-md"
          src="/brand/hypofit-mark.svg"
        />
        <strong className="ui-display-brand font-brand text-hypo-text">
          Hypofit
        </strong>
      </a>
    </header>
  );
}

function DesktopUtilityBar({ children }: { children?: ReactNode }) {
  return (
    <div
      aria-label="전역 작업"
      className="relative z-50 hidden gap-1 overflow-visible border-b border-hypo-border bg-hypo-surface/95 px-[var(--app-page-x)] backdrop-blur min-[1200px]:col-start-2 min-[1200px]:row-start-1 min-[1200px]:flex min-[1200px]:h-[var(--app-desktop-header-height)] min-[1200px]:items-center min-[1200px]:justify-end"
      data-app-shell-region="desktop-utility-bar"
      role="region"
    >
      {children}
    </div>
  );
}

function DesktopRail({
  activeDestination,
  items,
  onNavigate,
}: {
  activeDestination?: AppShellActiveDestination;
  items: AppShellNavItem[];
  onNavigate: (destination: AppDestination) => void;
}) {
  return (
    <aside
      className="hidden h-full flex-col overflow-hidden border-r border-hypo-border bg-hypo-surface px-4 py-5 min-[1200px]:col-start-1 min-[1200px]:row-start-2 min-[1200px]:flex"
      data-app-shell-region="desktop-rail"
    >
      <nav className="grid content-start gap-1" aria-label="Hypofit primary navigation">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeDestination;

          return (
            <a
              key={item.id}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "ui-control-text relative flex min-h-10 items-center gap-3 rounded-hypo-md px-3 text-left text-hypo-text-muted transition-colors hover:bg-hypo-surface-muted hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
                isActive &&
                  "bg-hypo-brand-soft/80 text-hypo-brand before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-hypo-brand",
              )}
              href={item.href}
              onClick={(event) => handleNavClick(event, item.id, onNavigate)}
            >
              <Icon size={18} />
              {item.label}
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

function MediumTopNav({
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
    <header className="sticky top-0 z-40 hidden h-[var(--app-medium-nav-height)] items-center gap-4 border-b border-hypo-border bg-hypo-surface/95 px-[var(--app-page-x)] backdrop-blur md:flex min-[1200px]:hidden!">
      <a
        className="flex shrink-0 items-center gap-2 rounded-hypo-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
        href={brandHref}
      >
        <img
          alt=""
          className="size-8 rounded-hypo-md"
          src="/brand/hypofit-mark.svg"
        />
        <strong className="ui-display-brand font-brand text-hypo-text">
          Hypofit
        </strong>
      </a>
      <nav
        className="ml-2 flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        aria-label="Hypofit compact navigation"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === activeDestination;

          return (
            <a
              key={item.id}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "ui-control-text inline-flex min-h-10 shrink-0 items-center gap-2 rounded-hypo-md px-3 text-hypo-text-muted transition-colors hover:bg-hypo-surface-muted hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
                isActive && "bg-hypo-brand-soft/80 text-hypo-brand",
              )}
              href={item.href}
              onClick={(event) => handleNavClick(event, item.id, onNavigate)}
            >
              <Icon size={17} />
              {item.label}
            </a>
          );
        })}
      </nav>
      <div className="flex shrink-0 items-center gap-1">
        {notificationButton}
        {accountMenu}
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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hypo-border/90 bg-hypo-surface/96 px-2 pb-[var(--app-safe-bottom)] shadow-[0_-1px_16px_rgb(29_37_34_/_0.06)] backdrop-blur md:hidden"
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
                  "grid h-[28px] w-[40px] place-items-center rounded-hypo-pill transition-colors",
                  isActive && "bg-hypo-brand-soft",
                )}
              >
                <Icon
                  className={cn("transition-transform", isActive && "scale-105")}
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
