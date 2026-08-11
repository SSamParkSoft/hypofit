import { useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

function isActiveState(state: AppStateStatus) {
  return state === "active";
}

export function useAppActive() {
  const [isActive, setIsActive] = useState(() => isActiveState(AppState.currentState));

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      setIsActive(isActiveState(state));
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return isActive;
}
