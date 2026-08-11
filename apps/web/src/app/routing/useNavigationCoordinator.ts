import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";

import { getAppRouteTitle, isInternalNavigationPath } from "../../shared/navigation/appRoutes";
import {
  initializeNavigationHistory,
  navigateTo,
  resolvePopNavigation,
  subscribeToNavigation,
  type NavigationChange,
} from "../../shared/navigation/appNavigation";
import {
  announceNavigation,
  applyNavigationFocus,
  applyNavigationScroll,
  initializeNavigationInputModality,
  runNavigationTransition,
} from "../../shared/navigation/navigationMotion";

interface UseNavigationCoordinatorOptions {
  isAuthenticated: boolean;
  onPathChange: (pathname: string) => void;
}

export function useNavigationCoordinator({
  isAuthenticated,
  onPathChange,
}: UseNavigationCoordinatorOptions) {
  const navigationSequenceRef = useRef(0);
  const isAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    const stopScrollTracking = initializeNavigationHistory();
    const stopInputModalityTracking = initializeNavigationInputModality();
    const commitNavigation = async (change: NavigationChange) => {
      navigationSequenceRef.current = change.sequence;
      await runNavigationTransition(change, () => {
        if (navigationSequenceRef.current !== change.sequence) {
          return;
        }

        flushSync(() => onPathChange(change.pathname));
      });

      if (navigationSequenceRef.current !== change.sequence) {
        return;
      }

      const title = getAppRouteTitle(change.pathname, {
        isAuthenticated: isAuthenticatedRef.current,
      });
      document.title = title;
      applyNavigationScroll(change);
      applyNavigationFocus(change);
      announceNavigation(title);
    };
    const unsubscribeNavigation = subscribeToNavigation((change) => {
      void commitNavigation(change);
    });
    const handlePopState = (event: PopStateEvent) => {
      void commitNavigation(resolvePopNavigation(event.state));
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      unsubscribeNavigation();
      stopScrollTracking();
      stopInputModalityTracking();
    };
  }, [onPathChange]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
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

      const target =
        event.target instanceof Element ? event.target.closest("a[href]") : null;

      if (
        !(target instanceof HTMLAnchorElement) ||
        target.target ||
        target.hasAttribute("download")
      ) {
        return;
      }

      const url = new URL(target.href);
      if (
        url.origin !== window.location.origin ||
        !isInternalNavigationPath(url.pathname)
      ) {
        return;
      }

      if (url.hash && url.pathname === window.location.pathname) {
        event.preventDefault();
        navigateTo(`${url.pathname}${url.search}${url.hash}`, {
          focus: "none",
          intent: "state",
          scroll: "anchor",
        });
        return;
      }

      event.preventDefault();
      navigateTo(`${url.pathname}${url.search}${url.hash}`);
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);
}
