import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  getPushNavigationFingerprint,
  navigateToPushNotificationTarget,
  parsePushNotificationTarget,
} from "@/features/push/notificationRouting";
import type { RegisterPushDeviceInput } from "@/shared/api/push";
import { pushApi } from "@/shared/api/push";
import { notificationsApi } from "@/shared/api/notifications";
import { addAppBreadcrumb, captureAppError } from "@/shared/diagnostics/sentry";

const installationIdStorageKey = "hypofit.installation_id";
const registeredPushDeviceIdStorageKey = "hypofit.push.registered_device_id";
const initialPromptStoragePrefix = "hypofit.push.initial_prompt.";
const pushPreferenceStoragePrefix = "hypofit.push.preference.";
const androidChannelId = "hypofit-workflow";

export type PushRegistrationState =
  | "unsupported"
  | "not_requested"
  | "denied"
  | "registered"
  | "failed";

export interface PushRegistrationResult {
  state: PushRegistrationState;
  message: string;
}

export interface PushPermissionSummary {
  platformLabel: string;
  providerLabel: string;
  status: "granted" | "denied" | "not_requested" | "unknown";
  statusLabel: string;
  canRequest: boolean;
}

export type PushNotificationResponse = Notifications.NotificationResponse;
export type PushNotificationResponseSource = "listener" | "initial" | "pending";

export async function configureNotificationRuntime() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: true,
      shouldShowBanner: false,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(androidChannelId, {
      name: "Hypofit 알림",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 220, 120, 220],
      lightColor: "#0F7A4D",
      sound: "default",
    });
  }
}

export function subscribeNotificationResponses(
  onResponse: (response: PushNotificationResponse, source: PushNotificationResponseSource) => void,
) {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    onResponse(response, "listener");
  });

  return () => {
    subscription.remove();
  };
}

export async function getInitialNotificationResponse() {
  return Notifications.getLastNotificationResponseAsync();
}

export async function clearInitialNotificationResponse() {
  await Notifications.clearLastNotificationResponseAsync();
}

export function getNotificationResponseFingerprint(response: PushNotificationResponse) {
  return getPushNavigationFingerprint(getNotificationResponseData(response), response.notification.request.identifier);
}

export function handleNotificationResponse(
  response: PushNotificationResponse,
  source: PushNotificationResponseSource,
  accessToken?: string | null,
) {
  const data = getNotificationResponseData(response);
  const target = parsePushNotificationTarget(data);
  addAppBreadcrumb("push_notification_response", {
    notification_id: target.notificationId,
    source,
    target_id: target.id,
    target_type: target.kind,
    type: target.type,
  });
  void markTappedNotificationRead(target.notificationId, accessToken);
  navigateToPushNotificationTarget(target);
  return target;
}

export async function syncPushRegistrationIfAlreadyAllowed(
  accessToken: string | null,
  userId: string | null,
) {
  if (!accessToken || !userId) {
    return;
  }

  try {
    const pushEnabled = await resolvePushMasterPreference(accessToken, userId);
    if (pushEnabled === false) {
      addAppBreadcrumb("push_silent_registration_skipped_by_preference", { user_id: userId });
      return;
    }

    await configureNotificationRuntime();
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== "granted") {
      return;
    }
    await registerNativePushToken(accessToken, "granted");
  } catch (error) {
    captureAppError(error, { phase: "push_silent_registration" });
  }
}

export async function requestInitialPushPermissionIfNeeded(
  accessToken: string | null,
  userId: string | null,
) {
  if (!accessToken || !userId) {
    return;
  }

  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return;
  }

  try {
    const pushEnabled = await resolvePushMasterPreference(accessToken, userId);
    if (pushEnabled === false) {
      addAppBreadcrumb("push_initial_prompt_skipped_by_preference", { user_id: userId });
      return;
    }

    await configureNotificationRuntime();
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status === "granted") {
      await registerNativePushToken(accessToken, "granted");
      return;
    }

    const storageKey = `${initialPromptStoragePrefix}${userId}`;
    const alreadyPrompted = await AsyncStorage.getItem(storageKey);
    if (alreadyPrompted) {
      return;
    }

    await AsyncStorage.setItem(storageKey, new Date().toISOString());
    await requestAndRegisterPush(accessToken);
  } catch (error) {
    captureAppError(error, { phase: "push_initial_prompt" });
  }
}

export async function getPushPermissionSummary(): Promise<PushPermissionSummary> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return {
      platformLabel: "지원하지 않는 기기",
      providerLabel: "푸시 미지원",
      status: "unknown",
      statusLabel: "사용할 수 없음",
      canRequest: false,
    };
  }

  try {
    await configureNotificationRuntime();
    const permissions = await Notifications.getPermissionsAsync();
    const status = normalizePermissionStatus(permissions.status);
    return {
      platformLabel: Platform.OS === "ios" ? "iPhone 알림" : "Android 알림",
      providerLabel: Platform.OS === "ios" ? "APNs" : "FCM",
      status,
      statusLabel: getPermissionStatusLabel(status),
      canRequest: status !== "granted",
    };
  } catch (error) {
    captureAppError(error, { phase: "push_permission_summary" });
    return {
      platformLabel: Platform.OS === "ios" ? "iPhone 알림" : "Android 알림",
      providerLabel: Platform.OS === "ios" ? "APNs" : "FCM",
      status: "unknown",
      statusLabel: "확인 필요",
      canRequest: true,
    };
  }
}

export async function requestAndRegisterPush(accessToken: string | null): Promise<PushRegistrationResult> {
  if (!accessToken) {
    return { state: "failed", message: "로그인 후 알림을 켤 수 있어요." };
  }

  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return { state: "unsupported", message: "이 기기에서는 푸시 알림을 사용할 수 없어요." };
  }

  try {
    await configureNotificationRuntime();
    const current = await Notifications.getPermissionsAsync();
    const finalPermission =
      current.status === "granted" ? current : await Notifications.requestPermissionsAsync();

    if (finalPermission.status !== "granted") {
      return {
        state: "denied",
        message:
          Platform.OS === "ios"
            ? "알림은 iPhone 설정에서 다시 켤 수 있어요."
            : "알림은 Android 설정에서 다시 켤 수 있어요.",
      };
    }

    await registerNativePushToken(accessToken, "granted");
    const preference = await pushApi.updatePreferences({ push_enabled: true }, accessToken);
    await persistPushEnabledPreference(preference.user_id, preference.push_enabled);
    return { state: "registered", message: "선정 결과와 새 메시지를 바로 알려드릴게요." };
  } catch (error) {
    captureAppError(error, { phase: "push_request_registration" });
    return { state: "failed", message: "알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
}

export async function disableRegisteredPushDevice(accessToken: string | null) {
  if (!accessToken) {
    return;
  }

  try {
    const pushDeviceId = await AsyncStorage.getItem(registeredPushDeviceIdStorageKey);
    if (!pushDeviceId) {
      return;
    }

    await pushApi.disableDevice(pushDeviceId, accessToken);
    await AsyncStorage.removeItem(registeredPushDeviceIdStorageKey);
    addAppBreadcrumb("push_registered_device_disabled");
  } catch (error) {
    captureAppError(error, { phase: "push_disable_registered_device" });
  } finally {
    await syncStoredPushPreference(accessToken);
  }
}

async function markTappedNotificationRead(notificationId: string | null, accessToken?: string | null) {
  if (!notificationId || !accessToken) {
    return;
  }

  try {
    await notificationsApi.markRead(notificationId, accessToken);
    addAppBreadcrumb("push_notification_mark_read_success", { notification_id: notificationId });
  } catch (error) {
    captureAppError(error, { phase: "push_notification_mark_read" });
  }
}

async function registerNativePushToken(
  accessToken: string,
  permissionStatus: RegisterPushDeviceInput["permission_status"],
) {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  const provider = Platform.OS === "ios" ? "apns" : "fcm";
  addAppBreadcrumb("push_silent_registration_start", {
    permission_status: permissionStatus,
    platform,
    provider,
  });

  const deviceToken = await Notifications.getDevicePushTokenAsync();
  const token = deviceToken.data;
  if (!token) {
    throw new Error("Native push token was empty");
  }

  const input: RegisterPushDeviceInput = {
    platform,
    provider,
    environment: Platform.OS === "ios" && __DEV__ ? "development" : "production",
    token,
    installation_id: await getInstallationId(),
    app_version: Application.nativeApplicationVersion ?? null,
    build_number: Application.nativeBuildVersion ?? null,
    os_version: Platform.Version ? String(Platform.Version) : null,
    locale: getLocale(),
    timezone: getTimeZone(),
    permission_status: permissionStatus,
  };

  const pushDevice = await pushApi.registerDevice(input, accessToken);
  await AsyncStorage.setItem(registeredPushDeviceIdStorageKey, pushDevice.id);
  addAppBreadcrumb("push_silent_registration_done", {
    permission_status: permissionStatus,
    platform,
    provider,
  });
}

export async function persistPushEnabledPreference(userId: string, pushEnabled: boolean) {
  await AsyncStorage.setItem(buildPushPreferenceStorageKey(userId), pushEnabled ? "true" : "false");
}

async function resolvePushMasterPreference(accessToken: string, userId: string) {
  const storedPreference = await readStoredPushEnabledPreference(userId);
  if (storedPreference === false) {
    return false;
  }

  try {
    const preference = await pushApi.getPreferences(accessToken);
    await persistPushEnabledPreference(preference.user_id, preference.push_enabled);
    return preference.push_enabled;
  } catch (error) {
    captureAppError(error, { phase: "push_preference_sync" });
    return storedPreference;
  }
}

async function syncStoredPushPreference(accessToken: string) {
  try {
    const preference = await pushApi.getPreferences(accessToken);
    await persistPushEnabledPreference(preference.user_id, preference.push_enabled);
  } catch (error) {
    captureAppError(error, { phase: "push_preference_post_disable_sync" });
  }
}

async function readStoredPushEnabledPreference(userId: string) {
  const storedValue = await AsyncStorage.getItem(buildPushPreferenceStorageKey(userId));
  if (storedValue === null) {
    return null;
  }

  return storedValue === "true";
}

function buildPushPreferenceStorageKey(userId: string) {
  return `${pushPreferenceStoragePrefix}${userId}`;
}

async function getInstallationId() {
  const existing = await AsyncStorage.getItem(installationIdStorageKey);
  if (existing) {
    return existing;
  }

  const id = `inst_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
  await AsyncStorage.setItem(installationIdStorageKey, id);
  return id;
}

function getLocale() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale ?? null;
  } catch {
    return null;
  }
}

function getTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

function normalizePermissionStatus(status: Notifications.PermissionStatus): PushPermissionSummary["status"] {
  if (status === "granted") {
    return "granted";
  }
  if (status === "denied") {
    return "denied";
  }
  if (status === "undetermined") {
    return "not_requested";
  }
  return "unknown";
}

function getPermissionStatusLabel(status: PushPermissionSummary["status"]) {
  switch (status) {
    case "granted":
      return "허용됨";
    case "denied":
      return "꺼짐";
    case "not_requested":
      return "아직 선택하지 않음";
    default:
      return "확인 필요";
  }
}

function getNotificationResponseData(response: PushNotificationResponse): Record<string, unknown> {
  return response.notification.request.content.data;
}
