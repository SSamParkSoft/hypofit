import { useCallback, useEffect, useRef, useState } from "react";

import { AuthBootstrapGate } from "../features/auth/AuthBootstrapGate";
import { AuthScreen } from "../features/auth/AuthScreen";
import { buildRequestedPath } from "../features/auth/authEntryState";
import { useAuth } from "../features/auth/useAuth";
import {
  getAppDestinationPath,
  getAppRouteTitle,
  resolveAppRoute,
} from "../shared/navigation/appRoutes";
import { navigateTo, replacePath } from "../shared/navigation/appNavigation";
import type { AppDestination } from "../shared/ui/navigation/types";
import { RouteRenderer } from "./routing/RouteRenderer";
import { useNavigationCoordinator } from "./routing/useNavigationCoordinator";

function getCurrentPath() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

function getCurrentRequestedPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return buildRequestedPath({
    hash: window.location.hash,
    pathname: window.location.pathname,
    search: window.location.search,
  });
}

function getRequestsAccountChoice() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.location.pathname === "/app" &&
    new URLSearchParams(window.location.search).get("account") === "choose"
  );
}

function getIsOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

function getUsesDesktopProfileLayout() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(min-width: 1200px)").matches
  );
}

function getIsMobileWebViewport() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(max-width: 767px)").matches
  );
}

export function App() {
  const {
    accessToken,
    appUser,
    errorMessage,
    isLoading,
    user,
  } = useAuth();
  const [currentPath, setCurrentPath] = useState(getCurrentPath);
  const [isOnline, setIsOnline] = useState(getIsOnline);
  const [usesDesktopProfileLayout, setUsesDesktopProfileLayout] = useState(
    getUsesDesktopProfileLayout,
  );
  const [isMobileWebViewport, setIsMobileWebViewport] = useState(
    getIsMobileWebViewport,
  );
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const previousIsLoadingRef = useRef(isLoading);
  const requestedPath = getCurrentRequestedPath();
  const isAuthenticated = Boolean(user);
  const requestsAccountChoice = getRequestsAccountChoice();
  const route = resolveAppRoute(currentPath, { isAuthenticated });
  const routeAccess = route?.access ?? null;
  const blocksMobileWebProductAccess =
    isMobileWebViewport &&
    (routeAccess === "auth-entry" || routeAccess === "protected");

  useNavigationCoordinator({
    isAuthenticated,
    onPathChange: setCurrentPath,
  });

  useEffect(() => {
    document.title = getAppRouteTitle(currentPath, { isAuthenticated });
  }, [currentPath, isAuthenticated]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileWebViewport(event.matches);
    };

    setIsMobileWebViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (blocksMobileWebProductAccess) {
      replacePath("/", { intent: "replace", scroll: "top" });
    }
  }, [blocksMobileWebProductAccess]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1200px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setUsesDesktopProfileLayout(event.matches);
    };

    setUsesDesktopProfileLayout(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (user) {
      setBootstrapError(null);
    }
  }, [user]);

  useEffect(() => {
    if (previousIsLoadingRef.current && !isLoading) {
      setBootstrapError(user ? null : errorMessage);
    }

    previousIsLoadingRef.current = isLoading;
  }, [errorMessage, isLoading, user]);

  const navigateToDestination = useCallback((destination: AppDestination) => {
    navigateTo(getAppDestinationPath(destination), { intent: "tab" });
  }, []);

  if (blocksMobileWebProductAccess) {
    return null;
  }

  if (routeAccess === "public") {
    return (
      <RouteRenderer
        accessToken={accessToken}
        appUser={appUser}
        currentPath={currentPath}
        isAuthenticated={isAuthenticated}
        onNavigateDestination={navigateToDestination}
        usesDesktopProfileLayout={usesDesktopProfileLayout}
      />
    );
  }

  if (!user && (isLoading || !isOnline || Boolean(bootstrapError))) {
    return (
      <AuthBootstrapGate
        authErrorMessage={bootstrapError}
        isChecking={isLoading}
        isOnline={isOnline}
        onGoToLanding={() => {
          setBootstrapError(null);
          navigateTo("/", { intent: "auth" });
        }}
        onRetry={() => {
          window.location.assign(requestedPath);
        }}
      />
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (requestsAccountChoice) {
    return <AuthScreen />;
  }

  return (
    <RouteRenderer
      accessToken={accessToken}
      appUser={appUser}
      currentPath={currentPath}
      isAuthenticated={isAuthenticated}
      onNavigateDestination={navigateToDestination}
      usesDesktopProfileLayout={usesDesktopProfileLayout}
    />
  );
}
