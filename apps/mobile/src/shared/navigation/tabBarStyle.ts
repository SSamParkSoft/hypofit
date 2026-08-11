export function getBottomTabBarStyle(bottomInset: number) {
  return {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderTopColor: "rgba(222, 219, 210, 0.9)",
    borderTopWidth: 1,
    elevation: 14,
    height: 70 + bottomInset,
    paddingBottom: Math.max(bottomInset, 7),
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 6,
    shadowColor: "#1D2522",
    shadowOffset: { height: -1, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  } as const;
}

export function getHiddenBottomTabBarStyle() {
  return {
    display: "none",
  } as const;
}

export function getBottomTabItemStyle() {
  return {
    borderRadius: 14,
    height: 58,
    justifyContent: "center",
    paddingVertical: 0,
  } as const;
}
