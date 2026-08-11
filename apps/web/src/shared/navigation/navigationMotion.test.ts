import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { NavigationChange } from "./appNavigation";
import {
  applyNavigationFocus,
  applyNavigationScroll,
  initializeNavigationInputModality,
  runNavigationTransition,
} from "./navigationMotion";

function createNavigationChange(
  overrides: Partial<NavigationChange> = {},
): NavigationChange {
  return {
    focus: "page-heading",
    from: "/app",
    intent: "push",
    pathname: "/chat",
    scroll: "top",
    sequence: 1,
    to: "/chat",
    ...overrides,
  };
}

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

beforeEach(() => {
  setReducedMotion(false);
});

afterEach(() => {
  Reflect.deleteProperty(document, "startViewTransition");
  document.body.innerHTML = "";
  delete document.documentElement.dataset.navigationIntent;
  vi.restoreAllMocks();
});

describe("navigationMotion", () => {
  it("updates exactly once when View Transitions are unsupported", async () => {
    const update = vi.fn();

    await runNavigationTransition(createNavigationChange(), update);

    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.navigationIntent).toBeUndefined();
  });

  it("updates exactly once without starting a transition when reduced motion is enabled", async () => {
    const startViewTransition = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });
    setReducedMotion(true);
    const update = vi.fn();

    await runNavigationTransition(createNavigationChange(), update);

    expect(startViewTransition).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.navigationIntent).toBeUndefined();
  });

  it("runs a supported transition and clears the navigation intent marker after it finishes", async () => {
    let resolveFinished!: () => void;
    const finished = new Promise<void>((resolve) => {
      resolveFinished = resolve;
    });
    const startViewTransition = vi.fn((update: () => void) => {
      update();
      return {
        finished,
        skipTransition: vi.fn(),
      };
    });
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: startViewTransition,
    });
    const update = vi.fn(() => {
      expect(document.documentElement.dataset.navigationIntent).toBe("push");
    });

    const transitionPromise = runNavigationTransition(
      createNavigationChange(),
      update,
    );

    expect(startViewTransition).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.navigationIntent).toBe("push");

    resolveFinished();
    await transitionPromise;

    expect(document.documentElement.dataset.navigationIntent).toBeUndefined();
  });

  it("does not commit twice when a supported transition rejects after its update", async () => {
    const update = vi.fn();
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: vi.fn((callback: () => void) => {
        callback();
        return {
          finished: Promise.reject(new Error("transition failed")),
          skipTransition: vi.fn(),
        };
      }),
    });

    await runNavigationTransition(createNavigationChange(), update);

    expect(update).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.navigationIntent).toBeUndefined();
  });

  it("skips an active transition when a newer navigation starts", async () => {
    let resolveFirst!: () => void;
    const firstFinished = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const skipFirst = vi.fn();
    let callCount = 0;
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: vi.fn((callback: () => void) => {
        callback();
        callCount += 1;
        return callCount === 1
          ? { finished: firstFinished, skipTransition: skipFirst }
          : { finished: Promise.resolve(), skipTransition: vi.fn() };
      }),
    });
    const firstUpdate = vi.fn();
    const secondUpdate = vi.fn();

    const first = runNavigationTransition(createNavigationChange(), firstUpdate);
    const second = runNavigationTransition(
      createNavigationChange({ intent: "back", sequence: 2 }),
      secondUpdate,
    );
    await second;
    resolveFirst();
    await first;

    expect(skipFirst).toHaveBeenCalledTimes(1);
    expect(firstUpdate).toHaveBeenCalledTimes(1);
    expect(secondUpdate).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.navigationIntent).toBeUndefined();
  });

  it("applies restore and top scroll policies but leaves preserved scroll untouched", () => {
    const scrollTo = vi.fn();
    Object.defineProperty(window, "scrollTo", {
      configurable: true,
      value: scrollTo,
    });
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });

    applyNavigationScroll(
      createNavigationChange({
        scroll: "restore",
        scrollX: 12,
        scrollY: 88,
      }),
    );
    expect(scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      left: 12,
      top: 88,
    });

    scrollTo.mockClear();
    applyNavigationScroll(createNavigationChange({ scroll: "top" }));
    expect(scrollTo).toHaveBeenCalledWith({
      behavior: "auto",
      left: 0,
      top: 0,
    });

    scrollTo.mockClear();
    applyNavigationScroll(createNavigationChange({ scroll: "preserve" }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("scrolls a cross-route hash destination into view", () => {
    document.body.innerHTML = '<section id="privacy-rights">권리 안내</section>';
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const target = document.getElementById("privacy-rights") as HTMLElement;
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    applyNavigationScroll(
      createNavigationChange({
        scroll: "top",
        to: "/legal/privacy#privacy-rights",
      }),
    );

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });

  it("smoothly scrolls same-page anchor navigation unless reduced motion is enabled", () => {
    document.body.innerHTML = '<section id="workflow">이용 흐름</section>';
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const target = document.getElementById("workflow") as HTMLElement;
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    applyNavigationScroll(
      createNavigationChange({
        focus: "none",
        intent: "state",
        scroll: "anchor",
        to: "/#workflow",
      }),
    );
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "smooth",
      block: "start",
    });

    setReducedMotion(true);
    applyNavigationScroll(
      createNavigationChange({
        focus: "none",
        intent: "state",
        scroll: "anchor",
        to: "/#workflow",
      }),
    );
    expect(scrollIntoView).toHaveBeenLastCalledWith({
      behavior: "auto",
      block: "start",
    });
  });

  it("focuses the first app-content target without forcing scroll when page-heading focus is requested", () => {
    document.body.innerHTML = `
      <main id="app-content">
        <h1>채팅</h1>
      </main>
    `;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const stopTracking = initializeNavigationInputModality();
    window.dispatchEvent(new PointerEvent("pointerdown"));
    const appContent = document.getElementById("app-content") as HTMLElement;
    const focusSpy = vi.spyOn(appContent, "focus");

    applyNavigationFocus(createNavigationChange());

    expect(appContent.getAttribute("tabindex")).toBe("-1");
    expect(appContent.dataset.navigationFocusModality).toBe("pointer");
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    stopTracking();
  });

  it("moves keyboard navigation focus to the destination heading", () => {
    document.body.innerHTML = `
      <main id="app-content">
        <h1>인터뷰 상세</h1>
      </main>
    `;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    const stopTracking = initializeNavigationInputModality();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    const heading = document.querySelector("h1") as HTMLElement;
    const focusSpy = vi.spyOn(heading, "focus");

    applyNavigationFocus(createNavigationChange());

    expect(heading.getAttribute("tabindex")).toBe("-1");
    expect(heading.dataset.navigationFocusModality).toBe("keyboard");
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    stopTracking();
  });
});
