import { useEffect } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { focusManager } from "@tanstack/react-query";

function syncQueryFocus(state: AppStateStatus) {
  if (Platform.OS !== "web") {
    focusManager.setFocused(state === "active");
  }
}

export function useReactQueryAppFocus() {
  useEffect(() => {
    syncQueryFocus(AppState.currentState);

    const subscription = AppState.addEventListener("change", syncQueryFocus);

    return () => {
      subscription.remove();
    };
  }, []);
}
