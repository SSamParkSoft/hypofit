export type NavigationIntent =
  | "public"
  | "auth"
  | "tab"
  | "push"
  | "back"
  | "forward"
  | "replace"
  | "state";

export type NavigationScrollPolicy = "anchor" | "preserve" | "restore" | "top";

export interface NavigationOptions {
  focus?: "none" | "page-heading";
  intent?: NavigationIntent;
  originPath?: string;
  scroll?: NavigationScrollPolicy;
}

export interface NavigationChange {
  focus: "none" | "page-heading";
  from: string;
  intent: NavigationIntent;
  pathname: string;
  scroll: NavigationScrollPolicy;
  scrollX?: number;
  scrollY?: number;
  sequence: number;
  to: string;
}

interface HypofitHistoryMetadata {
  index: number;
  intent: NavigationIntent;
  key: string;
  originPath?: string;
  scrollX?: number;
  scrollY?: number;
}

type HistoryStateWithHypofit = Record<string, unknown> & {
  __hypofit?: HypofitHistoryMetadata;
};

const NAVIGATION_EVENT = "hypofit:navigation";
const HISTORY_NAMESPACE = "__hypofit";

let currentIndex = 0;
let currentRequestedPath = "/";
let sequence = 0;
let isInitialized = false;

export function initializeNavigationHistory() {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const currentMetadata = readHistoryMetadata(window.history.state);
  if (currentMetadata) {
    currentIndex = currentMetadata.index;
  } else {
    const state = mergeHistoryState(window.history.state, {
      index: 0,
      intent: "replace",
      key: createHistoryKey(),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    });
    window.history.replaceState(state, "", getCurrentRequestedPath());
    currentIndex = 0;
  }
  currentRequestedPath = getCurrentRequestedPath();

  isInitialized = true;
  const previousScrollRestoration = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";
  let animationFrame: number | null = null;

  const saveScroll = () => {
    if (animationFrame !== null) {
      return;
    }

    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = null;
      saveCurrentScrollPosition();
    });
  };

  window.addEventListener("scroll", saveScroll, { passive: true });

  return () => {
    window.removeEventListener("scroll", saveScroll);
    if (animationFrame !== null) {
      window.cancelAnimationFrame(animationFrame);
    }
    window.history.scrollRestoration = previousScrollRestoration;
  };
}

export function subscribeToNavigation(listener: (change: NavigationChange) => void) {
  const handleNavigation = (event: Event) => {
    listener((event as CustomEvent<NavigationChange>).detail);
  };

  window.addEventListener(NAVIGATION_EVENT, handleNavigation);
  return () => window.removeEventListener(NAVIGATION_EVENT, handleNavigation);
}

export function navigateTo(path: string, options: NavigationOptions = {}) {
  ensureNavigationHistory();
  const from = getCurrentRequestedPath();
  const to = normalizeInternalPath(path);

  if (from === to) {
    if (options.scroll === "anchor") {
      dispatchNavigation({
        focus: options.focus ?? "none",
        from,
        intent: options.intent ?? "state",
        pathname: window.location.pathname,
        scroll: "anchor",
        to,
      });
    }
    return;
  }

  saveCurrentScrollPosition();
  const intent = options.intent ?? inferNavigationIntent(from, to);
  currentIndex += 1;
  const metadata: HypofitHistoryMetadata = {
    index: currentIndex,
    intent,
    key: createHistoryKey(),
    originPath: options.originPath ?? from,
    scrollX: 0,
    scrollY: 0,
  };
  window.history.pushState(mergeHistoryState(null, metadata), "", to);
  currentRequestedPath = to;
  dispatchNavigation({
    focus: options.focus ?? (intent === "state" ? "none" : "page-heading"),
    from,
    intent,
    pathname: window.location.pathname,
    scroll: options.scroll ?? (intent === "state" ? "preserve" : "top"),
    to,
  });
}

export function replacePath(path: string, options: NavigationOptions = {}) {
  ensureNavigationHistory();
  const from = getCurrentRequestedPath();
  const to = normalizeInternalPath(path);
  const previousMetadata = readHistoryMetadata(window.history.state);
  const intent = options.intent ?? (getPathname(from) === getPathname(to) ? "state" : "replace");
  const metadata: HypofitHistoryMetadata = {
    index: previousMetadata?.index ?? currentIndex,
    intent,
    key: previousMetadata?.key ?? createHistoryKey(),
    originPath: options.originPath ?? previousMetadata?.originPath ?? from,
    scrollX: intent === "state" ? window.scrollX : 0,
    scrollY: intent === "state" ? window.scrollY : 0,
  };
  window.history.replaceState(mergeHistoryState(window.history.state, metadata), "", to);
  currentRequestedPath = to;

  if (from !== to || getPathname(from) !== getPathname(to)) {
    dispatchNavigation({
      focus: options.focus ?? (intent === "state" ? "none" : "page-heading"),
      from,
      intent,
      pathname: window.location.pathname,
      scroll: options.scroll ?? (intent === "state" ? "preserve" : "top"),
      to,
    });
  }
}

export function navigateBack(fallbackPath = "/") {
  ensureNavigationHistory();
  if (currentIndex > 0) {
    saveCurrentScrollPosition();
    window.history.back();
    return;
  }

  replacePath(fallbackPath, { intent: "replace", scroll: "top" });
}

export function resolvePopNavigation(state: unknown): NavigationChange {
  ensureNavigationHistory();
  const from = currentRequestedPath;
  const metadata = readHistoryMetadata(state);
  const nextIndex = metadata?.index;
  let intent: NavigationIntent = metadata ? "back" : "replace";

  if (typeof nextIndex === "number") {
    if (nextIndex > currentIndex) {
      intent = "forward";
    } else if (nextIndex === currentIndex) {
      intent = "replace";
    }
    currentIndex = nextIndex;
  }

  const to = getCurrentRequestedPath();
  currentRequestedPath = to;

  return createNavigationChange({
    focus: "page-heading",
    from,
    intent,
    pathname: window.location.pathname,
    scroll: "restore",
    scrollX: metadata?.scrollX ?? 0,
    scrollY: metadata?.scrollY ?? 0,
    to,
  });
}

export function navigateToInterviewDetail(postId: string, options?: { apply?: boolean }) {
  navigateTo(`/interviews/${postId}${options?.apply ? "?apply=1" : ""}`, {
    intent: "push",
  });
}

export function inferNavigationIntent(from: string, to: string): NavigationIntent {
  const fromPath = getPathname(from);
  const toPath = getPathname(to);

  if (fromPath === toPath) {
    return "state";
  }

  if ((fromPath === "/" && toPath === "/app") || isAuthPath(fromPath) || isAuthPath(toPath)) {
    return "auth";
  }

  if (isTopLevelAppPath(fromPath) && isTopLevelAppPath(toPath)) {
    return "tab";
  }

  if (fromPath === "/" || isPublicDocumentPath(fromPath) || isPublicDocumentPath(toPath)) {
    return "public";
  }

  return "push";
}

export function getCurrentNavigationIndex() {
  ensureNavigationHistory();
  return currentIndex;
}

export function resetNavigationForTests() {
  currentIndex = 0;
  currentRequestedPath = "/";
  sequence = 0;
  isInitialized = false;
}

function dispatchNavigation(change: Omit<NavigationChange, "sequence">) {
  window.dispatchEvent(
    new CustomEvent<NavigationChange>(NAVIGATION_EVENT, {
      detail: createNavigationChange(change),
    }),
  );
}

function createNavigationChange(change: Omit<NavigationChange, "sequence">): NavigationChange {
  sequence += 1;
  return { ...change, sequence };
}

function ensureNavigationHistory() {
  if (!isInitialized && typeof window !== "undefined") {
    const metadata = readHistoryMetadata(window.history.state);
    if (metadata) {
      currentIndex = metadata.index;
      currentRequestedPath = getCurrentRequestedPath();
      isInitialized = true;
      return;
    }

    const state = mergeHistoryState(window.history.state, {
      index: 0,
      intent: "replace",
      key: createHistoryKey(),
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    });
    window.history.replaceState(state, "", getCurrentRequestedPath());
    currentIndex = 0;
    currentRequestedPath = getCurrentRequestedPath();
    isInitialized = true;
  }
}

function saveCurrentScrollPosition() {
  const metadata = readHistoryMetadata(window.history.state);
  if (!metadata) {
    return;
  }

  window.history.replaceState(
    mergeHistoryState(window.history.state, {
      ...metadata,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
    }),
    "",
    getCurrentRequestedPath(),
  );
}

function mergeHistoryState(state: unknown, metadata: HypofitHistoryMetadata): HistoryStateWithHypofit {
  const base = isRecord(state) ? state : {};
  return { ...base, [HISTORY_NAMESPACE]: metadata };
}

function readHistoryMetadata(state: unknown): HypofitHistoryMetadata | null {
  if (!isRecord(state) || !isRecord(state[HISTORY_NAMESPACE])) {
    return null;
  }

  const metadata = state[HISTORY_NAMESPACE];
  if (
    typeof metadata.index !== "number" ||
    typeof metadata.intent !== "string" ||
    typeof metadata.key !== "string"
  ) {
    return null;
  }

  return metadata as unknown as HypofitHistoryMetadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function createHistoryKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `hypofit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeInternalPath(path: string) {
  const url = new URL(path, window.location.origin);
  if (url.origin !== window.location.origin) {
    throw new Error("Hypofit internal navigation cannot target another origin.");
  }

  return `${url.pathname}${url.search}${url.hash}`;
}

function getCurrentRequestedPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getPathname(path: string) {
  return new URL(path, window.location.origin).pathname;
}

function isAuthPath(pathname: string) {
  return pathname === "/app" || pathname.startsWith("/auth/");
}

function isTopLevelAppPath(pathname: string) {
  return ["/app", "/interviews", "/map", "/chat", "/profile"].includes(pathname);
}

function isPublicDocumentPath(pathname: string) {
  return (
    pathname.startsWith("/legal/") ||
    pathname === "/support" ||
    pathname === "/account-deletion" ||
    pathname === "/install"
  );
}
