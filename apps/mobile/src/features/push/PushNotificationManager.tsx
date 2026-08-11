import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  clearInitialNotificationResponse,
  configureNotificationRuntime,
  getInitialNotificationResponse,
  getNotificationResponseFingerprint,
  handleNotificationResponse,
  requestInitialPushPermissionIfNeeded,
  subscribeNotificationResponses,
  syncPushRegistrationIfAlreadyAllowed,
  type PushNotificationResponse,
  type PushNotificationResponseSource,
} from "./pushNotifications";
import { addAppBreadcrumb, captureAppError } from "@/shared/diagnostics/sentry";

interface PendingPushResponse {
  response: PushNotificationResponse;
  userId: string;
}

export function PushNotificationManager() {
  const { accessToken, appUser, isLoading, isSyncing, user } = useAuth();
  const handledFingerprintsRef = useRef(new Set<string>());
  const pendingResponseRef = useRef<PendingPushResponse | null>(null);
  const pushRegistrationUserId = appUser?.id ?? null;
  const responseUserId = appUser?.id ?? user?.id ?? null;
  const canRouteProtectedNotification = Boolean(accessToken && appUser && !isLoading && !isSyncing);

  const processResponse = useCallback(
    (response: PushNotificationResponse, source: PushNotificationResponseSource) => {
      const fingerprint = getNotificationResponseFingerprint(response);

      if (handledFingerprintsRef.current.has(fingerprint)) {
        addAppBreadcrumb("push_notification_response_deduped", { fingerprint, source });
        return;
      }

      if (!canRouteProtectedNotification) {
        if (!responseUserId) {
          addAppBreadcrumb("push_notification_response_discarded_without_user", {
            fingerprint,
            source,
          });
          void clearInitialNotificationResponse();
          return;
        }

        pendingResponseRef.current = { response, userId: responseUserId };
        addAppBreadcrumb("push_notification_response_deferred", { fingerprint, source });
        return;
      }

      handledFingerprintsRef.current.add(fingerprint);

      try {
        handleNotificationResponse(response, source, accessToken);
        void clearInitialNotificationResponse();
      } catch (error) {
        captureAppError(error, { phase: "push_notification_response_route", source });
      }
    },
    [accessToken, canRouteProtectedNotification, responseUserId],
  );

  useEffect(() => {
    void configureNotificationRuntime();
    return subscribeNotificationResponses(processResponse);
  }, [processResponse]);

  useEffect(() => {
    let isMounted = true;

    void getInitialNotificationResponse()
      .then((response) => {
        if (!isMounted || !response) {
          return;
        }
        processResponse(response, "initial");
      })
      .catch((error) => {
        captureAppError(error, { phase: "push_initial_notification_response" });
      });

    return () => {
      isMounted = false;
    };
  }, [processResponse]);

  useEffect(() => {
    if (!canRouteProtectedNotification || !pendingResponseRef.current) {
      return;
    }

    const pendingResponse = pendingResponseRef.current;
    pendingResponseRef.current = null;
    if (pendingResponse.userId !== responseUserId) {
      addAppBreadcrumb("push_notification_response_discarded_user_changed", {
        expected_user_id: pendingResponse.userId,
        user_id: responseUserId,
      });
      return;
    }

    processResponse(pendingResponse.response, "pending");
  }, [canRouteProtectedNotification, processResponse, responseUserId]);

  useEffect(() => {
    if (accessToken && user?.id && !appUser) {
      addAppBreadcrumb("push_silent_registration_skipped_until_profile");
    }
    void syncPushRegistrationIfAlreadyAllowed(accessToken, pushRegistrationUserId);
  }, [accessToken, appUser, pushRegistrationUserId, user?.id]);

  useEffect(() => {
    if (accessToken && user?.id && !appUser) {
      addAppBreadcrumb("push_initial_prompt_skipped_until_profile");
    }
    void requestInitialPushPermissionIfNeeded(accessToken, pushRegistrationUserId);
  }, [accessToken, appUser, pushRegistrationUserId, user?.id]);

  return null;
}
