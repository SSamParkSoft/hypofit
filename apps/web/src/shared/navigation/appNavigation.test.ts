import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getCurrentNavigationIndex,
  initializeNavigationHistory,
  navigateBack,
  navigateTo,
  replacePath,
  resolvePopNavigation,
  resetNavigationForTests,
  subscribeToNavigation,
  type NavigationChange,
} from "./appNavigation";

type HypofitMetadata = {
  index: number;
  intent: string;
  key: string;
  originPath?: string;
  scrollX?: number;
  scrollY?: number;
};

type HistoryStateWithHypofit = Record<string, unknown> & {
  __hypofit?: HypofitMetadata;
};

let stopScrollTracking: (() => void) | null = null;

function setScrollPosition(x: number, y: number) {
  Object.defineProperty(window, "scrollX", {
    configurable: true,
    value: x,
  });
  Object.defineProperty(window, "scrollY", {
    configurable: true,
    value: y,
  });
}

function getMetadata() {
  return (window.history.state as HistoryStateWithHypofit).__hypofit;
}

function captureNavigationChanges() {
  const changes: NavigationChange[] = [];
  const unsubscribe = subscribeToNavigation((change) => {
    changes.push(change);
  });

  return { changes, unsubscribe };
}

beforeEach(() => {
  resetNavigationForTests();
  stopScrollTracking = null;
  window.history.replaceState(null, "", "/");
  setScrollPosition(0, 0);
  Object.defineProperty(window.history, "scrollRestoration", {
    configurable: true,
    writable: true,
    value: "auto",
  });
});

afterEach(() => {
  stopScrollTracking?.();
  stopScrollTracking = null;
  resetNavigationForTests();
  window.history.replaceState(null, "", "/");
  setScrollPosition(0, 0);
  vi.restoreAllMocks();
});

describe("appNavigation", () => {
  it("initializes history metadata without dropping existing history state", () => {
    setScrollPosition(18, 42);
    window.history.replaceState({ draftId: "draft-1" }, "", "/interviews?status=open");

    stopScrollTracking = initializeNavigationHistory();

    expect(window.history.scrollRestoration).toBe("manual");
    expect(window.history.state).toMatchObject({
      __hypofit: {
        index: 0,
        intent: "replace",
        key: expect.any(String),
        scrollX: 18,
        scrollY: 42,
      },
      draftId: "draft-1",
    });
    expect(getCurrentNavigationIndex()).toBe(0);

    stopScrollTracking?.();
    stopScrollTracking = null;

    expect(window.history.scrollRestoration).toBe("auto");
  });

  it("pushes navigation with an incremented index and push metadata", () => {
    window.history.replaceState(null, "", "/interviews");
    stopScrollTracking = initializeNavigationHistory();
    const { changes, unsubscribe } = captureNavigationChanges();

    navigateTo("/interviews/post-1?apply=1");

    expect(window.location.pathname).toBe("/interviews/post-1");
    expect(window.location.search).toBe("?apply=1");
    expect(getCurrentNavigationIndex()).toBe(1);
    expect(getMetadata()).toMatchObject({
      index: 1,
      intent: "push",
      key: expect.any(String),
      originPath: "/interviews",
      scrollX: 0,
      scrollY: 0,
    });
    expect(changes).toEqual([
      expect.objectContaining({
        focus: "page-heading",
        from: "/interviews",
        intent: "push",
        pathname: "/interviews/post-1",
        scroll: "top",
        sequence: 1,
        to: "/interviews/post-1?apply=1",
      }),
    ]);

    unsubscribe();
  });

  it("treats same-pathname pushes as state navigations with preserved scroll intent", () => {
    window.history.replaceState(null, "", "/chat?room=room-1");
    stopScrollTracking = initializeNavigationHistory();
    const { changes, unsubscribe } = captureNavigationChanges();

    navigateTo("/chat?room=room-2");

    expect(window.location.pathname).toBe("/chat");
    expect(window.location.search).toBe("?room=room-2");
    expect(getCurrentNavigationIndex()).toBe(1);
    expect(getMetadata()).toMatchObject({
      index: 1,
      intent: "state",
      key: expect.any(String),
      originPath: "/chat?room=room-1",
    });
    expect(changes).toEqual([
      expect.objectContaining({
        focus: "none",
        from: "/chat?room=room-1",
        intent: "state",
        pathname: "/chat",
        scroll: "preserve",
        sequence: 1,
        to: "/chat?room=room-2",
      }),
    ]);

    unsubscribe();
  });

  it("replays anchor scrolling when the current hash link is selected again", () => {
    window.history.replaceState(null, "", "/#workflow");
    stopScrollTracking = initializeNavigationHistory();
    const { changes, unsubscribe } = captureNavigationChanges();

    navigateTo("/#workflow", {
      focus: "none",
      intent: "state",
      scroll: "anchor",
    });

    expect(getCurrentNavigationIndex()).toBe(0);
    expect(changes).toEqual([
      expect.objectContaining({
        focus: "none",
        from: "/#workflow",
        intent: "state",
        pathname: "/",
        scroll: "anchor",
        to: "/#workflow",
      }),
    ]);

    unsubscribe();
  });

  it("preserves existing state and metadata on same-pathname replace updates", () => {
    window.history.replaceState(
      {
        draftId: "draft-42",
        filters: { unreadOnly: true },
      },
      "",
      "/chat?room=room-1",
    );
    stopScrollTracking = initializeNavigationHistory();
    const initialMetadata = getMetadata();
    const { changes, unsubscribe } = captureNavigationChanges();
    setScrollPosition(64, 128);

    replacePath("/chat?room=room-2");

    expect(window.location.pathname).toBe("/chat");
    expect(window.location.search).toBe("?room=room-2");
    expect(getCurrentNavigationIndex()).toBe(0);
    expect(window.history.state).toMatchObject({
      __hypofit: {
        index: initialMetadata?.index,
        intent: "state",
        key: initialMetadata?.key,
        originPath: "/chat?room=room-1",
        scrollX: 64,
        scrollY: 128,
      },
      draftId: "draft-42",
      filters: { unreadOnly: true },
    });
    expect(changes).toEqual([
      expect.objectContaining({
        focus: "none",
        from: "/chat?room=room-1",
        intent: "state",
        pathname: "/chat",
        scroll: "preserve",
        sequence: 1,
        to: "/chat?room=room-2",
      }),
    ]);

    unsubscribe();
  });

  it("emits replace intent without incrementing the history index", () => {
    window.history.replaceState(null, "", "/chat?room=room-1");
    stopScrollTracking = initializeNavigationHistory();
    const initialMetadata = getMetadata();
    const { changes, unsubscribe } = captureNavigationChanges();

    replacePath("/profile");

    expect(window.location.pathname).toBe("/profile");
    expect(getCurrentNavigationIndex()).toBe(0);
    expect(getMetadata()).toMatchObject({
      index: initialMetadata?.index,
      intent: "replace",
      key: initialMetadata?.key,
      originPath: "/chat?room=room-1",
      scrollX: 0,
      scrollY: 0,
    });
    expect(changes).toEqual([
      expect.objectContaining({
        focus: "page-heading",
        from: "/chat?room=room-1",
        intent: "replace",
        pathname: "/profile",
        scroll: "top",
        sequence: 1,
        to: "/profile",
      }),
    ]);

    unsubscribe();
  });

  it("falls back to replace navigation when there is no browser history to go back to", () => {
    window.history.replaceState(null, "", "/chat");
    stopScrollTracking = initializeNavigationHistory();
    const { changes, unsubscribe } = captureNavigationChanges();
    const historyBackSpy = vi.spyOn(window.history, "back");

    navigateBack("/app");

    expect(historyBackSpy).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/app");
    expect(getCurrentNavigationIndex()).toBe(0);
    expect(changes).toEqual([
      expect.objectContaining({
        focus: "page-heading",
        from: "/chat",
        intent: "replace",
        pathname: "/app",
        scroll: "top",
        sequence: 1,
        to: "/app",
      }),
    ]);

    unsubscribe();
  });

  it("resolves popstate direction and restored scroll metadata", () => {
    window.history.replaceState(null, "", "/interviews");
    setScrollPosition(24, 320);
    stopScrollTracking = initializeNavigationHistory();
    const listState = window.history.state;

    navigateTo("/interviews/post-1?apply=1");
    const detailState = window.history.state;

    window.history.replaceState(listState, "", "/interviews");
    const backChange = resolvePopNavigation(listState);

    expect(backChange).toEqual(
      expect.objectContaining({
        focus: "page-heading",
        from: "/interviews/post-1?apply=1",
        intent: "back",
        pathname: "/interviews",
        scroll: "restore",
        scrollX: 24,
        scrollY: 320,
        to: "/interviews",
      }),
    );

    window.history.replaceState(detailState, "", "/interviews/post-1?apply=1");
    const forwardChange = resolvePopNavigation(detailState);

    expect(forwardChange).toEqual(
      expect.objectContaining({
        focus: "page-heading",
        from: "/interviews",
        intent: "forward",
        pathname: "/interviews/post-1",
        scroll: "restore",
        scrollX: 0,
        scrollY: 0,
        to: "/interviews/post-1?apply=1",
      }),
    );
  });

  it("uses a direction-neutral replace fallback when popstate metadata is missing", () => {
    window.history.replaceState(null, "", "/interviews");
    stopScrollTracking = initializeNavigationHistory();
    navigateTo("/interviews/post-1");
    window.history.replaceState(null, "", "/interviews");

    const change = resolvePopNavigation(null);

    expect(change).toEqual(
      expect.objectContaining({
        from: "/interviews/post-1",
        intent: "replace",
        pathname: "/interviews",
        scroll: "restore",
        to: "/interviews",
      }),
    );
  });
});
