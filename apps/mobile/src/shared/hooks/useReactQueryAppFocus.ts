import { useEffect } from "react";
import { AppState, Platform, type AppStateStatus } from "react-native";
import { focusManager, onlineManager } from "@tanstack/react-query";
import NetInfo from "@react-native-community/netinfo";

function syncQueryFocus(state: AppStateStatus) {
  if (Platform.OS !== "web") {
    focusManager.setFocused(state === "active");
  }
}

export function useReactQueryAppFocus() {
  useEffect(() => {
    syncQueryFocus(AppState.currentState);

    const subscription = AppState.addEventListener("change", syncQueryFocus);
    onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => {
      setOnline(state.isConnected !== false && state.isInternetReachable !== false);
    }));

    return () => {
      subscription.remove();
      onlineManager.setEventListener(() => undefined);
    };
  }, []);
}
