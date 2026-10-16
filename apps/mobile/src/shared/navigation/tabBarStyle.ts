export const floatingTabBar = {
  height: 58,
  minimumBottomOffset: 8,
  horizontalInset: 16,
  radius: 29,
} as const;

export function getFloatingTabBarMaterial({
  platform,
  reduceTransparency,
  liquidGlassAvailable,
}: {
  platform: string;
  reduceTransparency: boolean;
  liquidGlassAvailable: boolean;
}) {
  if (platform !== "ios" || reduceTransparency) return "solid";
  return liquidGlassAvailable ? "liquidGlass" : "blur";
}

export function getBottomTabBarHeight(bottomInset: number) {
  // Includes the empty space below the floating bar for content and map sheets.
  return floatingTabBar.height + Math.max(bottomInset, floatingTabBar.minimumBottomOffset);
}

export function getBottomTabBarHideDistance(bottomInset: number) {
  // Move the bar and its material shadow completely below the viewport.
  return getBottomTabBarHeight(bottomInset) + 16;
}

export function getBottomTabBarStyle(bottomInset: number) {
  return {
    backgroundColor: "transparent",
    borderTopWidth: 0,
    bottom: Math.max(bottomInset, floatingTabBar.minimumBottomOffset),
    elevation: 0,
    height: floatingTabBar.height,
    // Match React Navigation's logical edges; left/right don't override start/end.
    start: floatingTabBar.horizontalInset,
    end: floatingTabBar.horizontalInset,
    paddingBottom: 5,
    paddingHorizontal: 8,
    paddingTop: 5,
    position: "absolute",
    zIndex: 1,
    borderRadius: floatingTabBar.radius,
  } as const;
}

export function getHiddenBottomTabBarStyle() {
  return {
    display: "none",
  } as const;
}

export function getBottomTabItemStyle() {
  return {
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    paddingVertical: 0,
  } as const;
}
