import { Suspense, type ReactNode } from "react";

import type { AppUser } from "../../shared/api/types";
import { resolveAppRoute } from "../../shared/navigation/appRoutes";
import type { AppDestination, AppShellActiveDestination } from "../../shared/ui/navigation/types";
import { LoadingState } from "../../shared/ui/state";
import { ConnectedAppShell } from "../shell/ConnectedAppShell";
import {
  getAppRouteManifestEntry,
  isRouteManifestDestinationEntry,
  type AppRouteLoadingConfig,
} from "./routeManifest";

interface RouteRendererProps {
  accessToken: string | null;
  appUser: AppUser | null;
  currentPath: string;
  isAuthenticated: boolean;
  onNavigateDestination: (destination: AppDestination) => void;
  usesDesktopProfileLayout: boolean;
}

export function RouteRenderer({
  accessToken,
  appUser,
  currentPath,
  isAuthenticated,
  onNavigateDestination,
  usesDesktopProfileLayout,
}: RouteRendererProps) {
  const route = resolveAppRoute(currentPath, { isAuthenticated });
  const entry = getAppRouteManifestEntry(route, currentPath);

  if (!entry) {
    return null;
  }

  if (entry.layout === "none") {
    return null;
  }

  const manifestContext = {
    accessToken,
    appUser,
    currentPath,
    isAuthenticated,
    route,
    usesDesktopProfileLayout,
  };
  const Screen = entry.getScreen(manifestContext);

  if (!Screen) {
    return null;
  }

  const screen = <Screen {...entry.getProps(manifestContext)} />;
  const fallback = renderRouteLoading(entry.loading);

  if (entry.layout === "standalone") {
    return <Suspense fallback={fallback}>{screen}</Suspense>;
  }

  const activeDestination: AppShellActiveDestination = route
    ? route.shell?.activeDestination
    : isRouteManifestDestinationEntry(entry)
      ? entry.destination
      : null;

  return (
    <ShellRoute
      activeDestination={activeDestination}
      appUser={appUser}
      fallback={fallback}
      onNavigateDestination={onNavigateDestination}
    >
      {screen}
    </ShellRoute>
  );
}

function renderRouteLoading(loading: AppRouteLoadingConfig | null) {
  if (!loading) {
    return null;
  }

  switch (loading.kind) {
    case "landing":
      return <div className="min-h-dvh bg-hypo-bg" aria-label={loading.ariaLabel} />;
    case "shell":
      return (
        <ShellLoading
          maxWidthClassName={loading.maxWidthClassName}
          title={loading.title}
        />
      );
    case "standalone":
      return <StandaloneLoading title={loading.title} />;
    default:
      return null;
  }
}

function ShellRoute({
  activeDestination,
  appUser,
  children,
  fallback,
  onNavigateDestination,
}: {
  activeDestination: AppShellActiveDestination;
  appUser: AppUser | null;
  children: ReactNode;
  fallback: ReactNode;
  onNavigateDestination: (destination: AppDestination) => void;
}) {
  return (
    <ConnectedAppShell
      activeDestination={activeDestination}
      appUser={appUser}
      onNavigate={onNavigateDestination}
    >
      <Suspense fallback={fallback}>{children}</Suspense>
    </ConnectedAppShell>
  );
}

function ShellLoading({
  maxWidthClassName,
  title,
}: {
  maxWidthClassName: string;
  title: string;
}) {
  return (
    <div className={`mx-auto w-full ${maxWidthClassName} p-4 sm:p-5 lg:p-7`}>
      <LoadingState live="polite" title={title} />
    </div>
  );
}

function StandaloneLoading({ title }: { title: string }) {
  return (
    <div className="min-h-dvh bg-hypo-bg p-4">
      <LoadingState live="polite" title={title} />
    </div>
  );
}
