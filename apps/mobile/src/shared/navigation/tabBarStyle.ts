import { colors } from "@/shared/theme/tokens";

export function getBottomTabBarHeight(bottomInset: number) {
  return 56 + bottomInset;
}

export function getBottomTabBarStyle(bottomInset: number) {
  return {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    bottom: 0,
    elevation: 0,
    height: getBottomTabBarHeight(bottomInset),
    left: 0,
    paddingBottom: bottomInset,
    paddingHorizontal: 6,
    paddingTop: 4,
    position: "absolute",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    right: 0,
  } as const;
}

export function getHiddenBottomTabBarStyle() {
  return {
    display: "none",
  } as const;
}

export function getBottomTabItemStyle() {
  return {
    height: 52,
    justifyContent: "center",
    paddingVertical: 0,
  } as const;
}
