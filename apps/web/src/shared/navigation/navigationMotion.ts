import type { NavigationChange, NavigationIntent } from "./appNavigation";

const ANIMATED_INTENTS = new Set<NavigationIntent>([
  "auth",
  "back",
  "forward",
  "public",
  "push",
  "tab",
]);

let activeTransition: ViewTransition | null = null;
let lastInputModality: "keyboard" | "pointer" = "pointer";

export function initializeNavigationInputModality() {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    lastInputModality = "keyboard";
  };
  const handlePointerDown = () => {
    lastInputModality = "pointer";
  };

  window.addEventListener("keydown", handleKeyDown, true);
  window.addEventListener("pointerdown", handlePointerDown, true);
  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
    window.removeEventListener("pointerdown", handlePointerDown, true);
  };
}

export function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export async function runNavigationTransition(change: NavigationChange, update: () => void) {
  const startViewTransition = document.startViewTransition?.bind(document);

  if (!ANIMATED_INTENTS.has(change.intent) || prefersReducedMotion() || !startViewTransition) {
    update();
    return;
  }

  activeTransition?.skipTransition?.();
  activeTransition = null;
  document.documentElement.dataset.navigationIntent = change.intent;
  let didUpdate = false;
  const updateOnce = () => {
    if (didUpdate) {
      return;
    }
    didUpdate = true;
    update();
  };

  let transition: ViewTransition | null = null;
  try {
    transition = startViewTransition(updateOnce);
    activeTransition = transition;
    await transition.finished;
  } catch {
    updateOnce();
  } finally {
    if (activeTransition === transition) {
      activeTransition = null;
      delete document.documentElement.dataset.navigationIntent;
    } else if (!transition && document.documentElement.dataset.navigationIntent === change.intent) {
      delete document.documentElement.dataset.navigationIntent;
    }
  }
}

export function applyNavigationScroll(change: NavigationChange) {
  if (change.scroll === "preserve") {
    return;
  }

  const left = change.scroll === "restore" ? (change.scrollX ?? 0) : 0;
  const top = change.scroll === "restore" ? (change.scrollY ?? 0) : 0;
  const hash = new URL(change.to, window.location.origin).hash;
  const isAnchorNavigation = change.scroll === "anchor";
  document.documentElement.dataset.navigationScrolling = "true";
  window.requestAnimationFrame(() => {
    const hashTarget =
      change.scroll === "top" || isAnchorNavigation ? getHashTarget(hash) : null;
    if (hashTarget) {
      hashTarget.scrollIntoView({
        behavior: isAnchorNavigation && !prefersReducedMotion() ? "smooth" : "auto",
        block: "start",
      });
    } else {
      window.scrollTo({ behavior: "auto", left, top });
    }
    window.requestAnimationFrame(() => {
      delete document.documentElement.dataset.navigationScrolling;
    });
  });
}

export function applyNavigationFocus(change: NavigationChange) {
  if (change.focus === "none") {
    return;
  }

  window.requestAnimationFrame(() => {
    const pageContainer =
      document.querySelector<HTMLElement>("#app-content") ??
      document.querySelector<HTMLElement>("main");
    const pageHeading =
      pageContainer?.querySelector<HTMLElement>("h1") ??
      document.querySelector<HTMLElement>("main h1");
    const target =
      lastInputModality === "keyboard"
        ? (pageHeading ?? pageContainer)
        : (pageContainer ?? pageHeading);
    if (!target) {
      return;
    }

    if (!target.hasAttribute("tabindex") && !isNaturallyFocusable(target)) {
      target.setAttribute("tabindex", "-1");
    }
    target.dataset.navigationFocusModality = lastInputModality;
    target.focus({ preventScroll: true });
  });
}

export function announceNavigation(title: string) {
  let announcer = document.getElementById("hypofit-navigation-announcer");
  if (!announcer) {
    announcer = document.createElement("p");
    announcer.id = "hypofit-navigation-announcer";
    announcer.className = "sr-only";
    announcer.setAttribute("aria-live", "polite");
    announcer.setAttribute("aria-atomic", "true");
    document.body.appendChild(announcer);
  }

  announcer.textContent = "";
  window.requestAnimationFrame(() => {
    if (announcer) {
      announcer.textContent = title.replace(/\s*\|\s*Hypofit$/, "");
    }
  });
}

function isNaturallyFocusable(element: HTMLElement) {
  return ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(element.tagName);
}

function getHashTarget(hash: string) {
  if (!hash) {
    return null;
  }

  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}
