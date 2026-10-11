type VisibilityListener = (visible: boolean) => void;

const listeners = new Set<VisibilityListener>();

export function emitTabBarVisibility(visible: boolean) {
  for (const listener of listeners) listener(visible);
}

export function subscribeTabBarVisibility(listener: VisibilityListener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function shouldHideTabBar(pathname: string, visible: boolean, screenReaderEnabled: boolean) {
  return (pathname === "/interviews" || pathname === "/chat" || pathname === "/profile")
    && !visible && !screenReaderEnabled;
}

export function createTabBarScrollTracker(initialOffset = 0) {
  let previousOffset = initialOffset;
  let direction = 0;
  let travel = 0;
  let visible = true;

  return (offset: number, maximumOffset: number): boolean | undefined => {
    // Clamp rubber-band scrolling so bouncing at either edge cannot toggle navigation.
    const currentOffset = Math.max(0, Math.min(offset, Math.max(0, maximumOffset)));
    const delta = currentOffset - previousOffset;
    previousOffset = currentOffset;

    if (currentOffset <= 8) {
      direction = 0;
      travel = 0;
      if (!visible) {
        visible = true;
        return true;
      }
      return;
    }

    if (delta === 0) return;
    const nextDirection = Math.sign(delta);
    travel = nextDirection === direction ? travel + Math.abs(delta) : Math.abs(delta);
    direction = nextDirection;

    if (visible && direction > 0 && travel >= 24) {
      visible = false;
      travel = 0;
      return false;
    }
    if (!visible && direction < 0 && travel >= 12) {
      visible = true;
      travel = 0;
      return true;
    }
  };
}
