import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import * as Location from "expo-location";
import { addAppBreadcrumb, captureAppError } from "@/shared/diagnostics/sentry";
import type { LocationState } from "./mapTypes";

const currentLocationTimeoutMs = 7_000;

export function useMapDeviceLocation(onLocationResolved: (location: Location.LocationObject) => void) {
  const [locationState, setLocationState] = useState<LocationState>("checking");
  const isMountedRef = useRef(true);
  const isLocationRequestInFlightRef = useRef(false);
  const shouldRetryLocationOnActiveRef = useRef(false);

  const applyDeviceLocation = useCallback((location: Location.LocationObject, source: "current" | "last_known") => {
    if (!isMountedRef.current) {
      return;
    }

    onLocationResolved(location);
    setLocationState("granted");
    shouldRetryLocationOnActiveRef.current = false;
    addAppBreadcrumb("map_location_resolved", {
      accuracy: typeof location.coords.accuracy === "number" ? Math.round(location.coords.accuracy) : null,
      phase: "map_location",
      platform: Platform.OS,
      source,
    });
  }, [onLocationResolved]);

  const readCurrentLocation = useCallback(async () => {
    addAppBreadcrumb("map_location_current_position_start", {
      phase: "map_location",
      platform: Platform.OS,
    });

    try {
      const current = await withLocationTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        currentLocationTimeoutMs,
      );
      applyDeviceLocation(current, "current");
      return;
    } catch (error) {
      addAppBreadcrumb("map_location_current_position_failed", {
        phase: "map_location",
        platform: Platform.OS,
        source: "current",
      });
      captureAppError(error, {
        code: "map_current_location_failed",
        phase: "map_location",
        platform: Platform.OS,
        source: "current",
      });
    }

    addAppBreadcrumb("map_location_last_known_start", {
      phase: "map_location",
      platform: Platform.OS,
    });

    try {
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        applyDeviceLocation(lastKnown, "last_known");
        return;
      }

      addAppBreadcrumb("map_location_last_known_empty", {
        phase: "map_location",
        platform: Platform.OS,
        source: "last_known",
      });
    } catch (error) {
      captureAppError(error, {
        code: "map_last_known_location_failed",
        phase: "map_location",
        platform: Platform.OS,
        source: "last_known",
      });
    }

    if (isMountedRef.current) {
      shouldRetryLocationOnActiveRef.current = true;
      setLocationState("unavailable");
      addAppBreadcrumb("map_location_unavailable", {
        phase: "map_location",
        platform: Platform.OS,
      });
    }
  }, [applyDeviceLocation]);

  const requestCurrentLocation = useCallback(async () => {
    if (isLocationRequestInFlightRef.current) {
      return;
    }

    isLocationRequestInFlightRef.current = true;
    setLocationState("checking");

    try {
      addAppBreadcrumb("map_location_permission_check_start", {
        phase: "map_location",
        platform: Platform.OS,
      });
      const existingPermission = await Location.getForegroundPermissionsAsync();
      if (!isMountedRef.current) {
        return;
      }

      if (existingPermission.status === Location.PermissionStatus.GRANTED) {
        addAppBreadcrumb("map_location_permission_granted", {
          can_ask_again: existingPermission.canAskAgain,
          permission_status: existingPermission.status,
          phase: "map_location",
          platform: Platform.OS,
        });
        await readCurrentLocation();
        return;
      }

      if (existingPermission.status === Location.PermissionStatus.DENIED && !existingPermission.canAskAgain) {
        addAppBreadcrumb("map_location_permission_denied", {
          can_ask_again: existingPermission.canAskAgain,
          permission_status: existingPermission.status,
          phase: "map_location",
          platform: Platform.OS,
        });
        setLocationState("denied");
        shouldRetryLocationOnActiveRef.current = false;
        return;
      }

      setLocationState("requesting");
      const requestedPermission = await Location.requestForegroundPermissionsAsync();
      if (!isMountedRef.current) {
        return;
      }

      if (requestedPermission.status !== Location.PermissionStatus.GRANTED) {
        addAppBreadcrumb("map_location_permission_denied", {
          can_ask_again: requestedPermission.canAskAgain,
          permission_status: requestedPermission.status,
          phase: "map_location",
          platform: Platform.OS,
        });
        setLocationState("denied");
        shouldRetryLocationOnActiveRef.current = false;
        return;
      }

      addAppBreadcrumb("map_location_permission_granted", {
        can_ask_again: requestedPermission.canAskAgain,
        permission_status: requestedPermission.status,
        phase: "map_location",
        platform: Platform.OS,
      });
      await readCurrentLocation();
    } catch (error) {
      captureAppError(error, {
        code: "map_location_permission_or_read_failed",
        phase: "map_location",
        platform: Platform.OS,
      });
      if (isMountedRef.current) {
        shouldRetryLocationOnActiveRef.current = true;
        setLocationState("unavailable");
      }
    } finally {
      isLocationRequestInFlightRef.current = false;
    }
  }, [readCurrentLocation]);

  useEffect(() => {
    isMountedRef.current = true;
    void requestCurrentLocation();

    return () => {
      isMountedRef.current = false;
    };
  }, [requestCurrentLocation]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        shouldRetryLocationOnActiveRef.current &&
        !isLocationRequestInFlightRef.current
      ) {
        shouldRetryLocationOnActiveRef.current = false;
        void requestCurrentLocation();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestCurrentLocation]);

  return { locationState, requestCurrentLocation };
}

function withLocationTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("map_location_timeout")), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}
