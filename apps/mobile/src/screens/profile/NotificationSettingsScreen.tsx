import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Switch, Text, View } from "react-native";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  disableRegisteredPushDevice,
  getPushPermissionSummary,
  requestAndRegisterPush,
  type PushPermissionSummary,
} from "@/features/push/pushNotifications";
import {
  pushApi,
  type NotificationPreferenceRecord,
  type UpdateNotificationPreferencesInput,
} from "@/shared/api/push";
import { AppScreen } from "@/shared/ui/AppScreen";

type PreferenceKey =
  | "push_enabled"
  | "chat_push_enabled"
  | "application_push_enabled"
  | "session_push_enabled"
  | "support_push_enabled";

const switchColors = {
  off: "#DCE2DD",
  on: "#176B5D",
  thumb: "#FFFFFF",
};

export function NotificationSettingsScreen() {
  const { accessToken } = useAuth();
  const [preference, setPreference] = useState<NotificationPreferenceRecord | null>(null);
  const [permission, setPermission] = useState<PushPermissionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(accessToken));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<PreferenceKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshState = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const [nextPermission, nextPreference] = await Promise.all([
        getPushPermissionSummary(),
        accessToken ? pushApi.getPreferences(accessToken) : Promise.resolve(null),
      ]);
      setPermission(nextPermission);
      setPreference(nextPreference);
    } catch {
      setMessage("알림 설정을 불러오지 못했어요.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const enablePush = async () => {
    setIsSubmitting(true);
    setMessage(null);
    const result = await requestAndRegisterPush(accessToken);
    setMessage(result.message);
    await refreshState();
    setIsSubmitting(false);
  };

  const disablePush = async () => {
    if (!accessToken || !preference) {
      return;
    }

    setUpdatingKey("push_enabled");
    setMessage(null);

    try {
      const nextPreference = await pushApi.updatePreferences({ push_enabled: false }, accessToken);
      setPreference(nextPreference);
      await disableRegisteredPushDevice(accessToken);
      setMessage("알림을 껐어요.");
    } catch {
      setMessage("알림 설정을 저장하지 못했어요.");
    } finally {
      setUpdatingKey(null);
    }
  };

  const openSystemSettings = async (nextMessage?: string) => {
    setMessage(nextMessage ?? null);

    try {
      await Linking.openSettings();
    } catch {
      setMessage("기기 설정에서 Hypofit 알림을 켜 주세요.");
    }
  };

  const handleSystemPermissionChange = async (value: boolean) => {
    if (!accessToken) {
      return;
    }

    if (!value) {
      await openSystemSettings("기기 알림은 시스템 설정에서 끌 수 있어요.");
      return;
    }

    if (permission?.status === "denied") {
      await openSystemSettings();
      return;
    }

    await enablePush();
  };

  const updatePreference = async (key: PreferenceKey, value: boolean) => {
    if (!accessToken || !preference) {
      return;
    }

    setUpdatingKey(key);
    setMessage(null);

    try {
      const input: UpdateNotificationPreferencesInput = { [key]: value };
      const nextPreference = await pushApi.updatePreferences(input, accessToken);
      setPreference(nextPreference);
    } catch {
      setMessage("알림 설정을 저장하지 못했어요.");
    } finally {
      setUpdatingKey(null);
    }
  };

  const pushEnabled = Boolean(preference?.push_enabled);
  const permissionGranted = permission?.status === "granted";
  const preferenceRowsDisabled = !accessToken || !pushEnabled || !permissionGranted || updatingKey !== null;

  return (
    <AppScreen backTo="/(tabs)/profile" title="알림 설정">
      <View className="gap-3 pt-2">
        {isLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator color="#176B5D" size="small" />
          </View>
        ) : (
          <View className="px-1">
            <View className="min-h-[58px] flex-row items-center justify-between gap-3">
              <View className="min-w-0 flex-1">
                <Text className="text-sm font-black text-hypo-text">알림 받기</Text>
                <Text className="mt-1 text-xs font-bold leading-[18px] text-hypo-muted">
                  {getNotificationMasterHelper(permission, pushEnabled)}
                </Text>
              </View>
              {isSubmitting || updatingKey === "push_enabled" ? (
                <ActivityIndicator color="#176B5D" size="small" />
              ) : (
                <Switch
                  disabled={!accessToken}
                  ios_backgroundColor={switchColors.off}
                  onValueChange={(value) => {
                    if (!value) {
                      void disablePush();
                      return;
                    }

                    if (permissionGranted) {
                      void enablePush();
                      return;
                    }

                    void handleSystemPermissionChange(true);
                  }}
                  thumbColor={switchColors.thumb}
                  trackColor={{ false: switchColors.off, true: switchColors.on }}
                  value={permissionGranted && pushEnabled}
                />
              )}
            </View>
            {!permissionGranted ? (
              <Text className="mt-1 text-[11px] font-bold leading-4 text-[#8A9387]">
                휴대폰 설정에서 알림을 허용하면 채팅과 신청 소식을 받을 수 있어요.
              </Text>
            ) : null}
          </View>
        )}
      </View>

      <View className="gap-1 border-t border-hypo-border pt-5">
        <SectionLabel>받을 소식</SectionLabel>
        <PreferenceRow
          disabled={preferenceRowsDisabled}
          helper="새 메시지가 오면 알려드려요."
          isUpdating={updatingKey === "chat_push_enabled"}
          label="채팅 메시지"
          value={Boolean(preference?.chat_push_enabled)}
          onChange={(value) => void updatePreference("chat_push_enabled", value)}
        />
        <PreferenceRow
          disabled={preferenceRowsDisabled}
          helper="새 신청, 선정, 반려 상태를 알려드려요."
          isUpdating={updatingKey === "application_push_enabled"}
          label="신청 상태"
          value={Boolean(preference?.application_push_enabled)}
          onChange={(value) => void updatePreference("application_push_enabled", value)}
        />
        <PreferenceRow
          disabled={preferenceRowsDisabled}
          helper="일정 변경과 취소처럼 놓치면 안 되는 상태를 알려드려요."
          isUpdating={updatingKey === "session_push_enabled"}
          label="인터뷰 일정"
          value={Boolean(preference?.session_push_enabled)}
          onChange={(value) => void updatePreference("session_push_enabled", value)}
        />
        <PreferenceRow
          disabled={preferenceRowsDisabled}
          helper="문의 답변이 등록되면 알려드려요."
          isUpdating={updatingKey === "support_push_enabled"}
          label="문의 답변"
          value={Boolean(preference?.support_push_enabled)}
          onChange={(value) => void updatePreference("support_push_enabled", value)}
        />
      </View>
      {message ? <Text className="px-1 text-xs font-bold leading-[19px] text-hypo-muted">{message}</Text> : null}
    </AppScreen>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text className="px-1 text-xs font-black text-[#8A9387]">{children}</Text>;
}

function PreferenceRow({
  disabled,
  helper,
  isUpdating,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  helper: string;
  isUpdating: boolean;
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  const textClassName = disabled ? "text-hypo-muted" : "text-hypo-text";
  const helperClassName = disabled ? "text-[#A0A99E]" : "text-hypo-muted";

  return (
    <View className="min-h-[64px] flex-row items-center gap-3 px-1 py-2.5">
      <View className="min-w-0 flex-1">
        <Text className={`text-sm font-black ${textClassName}`}>{label}</Text>
        <Text className={`mt-1 text-xs font-bold leading-[18px] ${helperClassName}`}>{helper}</Text>
      </View>
      {isUpdating ? (
        <ActivityIndicator color="#176B5D" size="small" />
      ) : (
        <Switch
          disabled={disabled}
          ios_backgroundColor={switchColors.off}
          onValueChange={onChange}
          thumbColor={switchColors.thumb}
          trackColor={{ false: switchColors.off, true: switchColors.on }}
          value={value}
        />
      )}
    </View>
  );
}

function getNotificationMasterHelper(permission: PushPermissionSummary | null, pushEnabled: boolean) {
  if (permission?.status === "denied") {
    return "휴대폰 설정에서 Hypofit 알림을 허용해야 해요.";
  }

  if (permission?.status !== "granted") {
    return "켜면 휴대폰 알림 권한을 요청할게요.";
  }

  if (!pushEnabled) {
    return "켜면 Hypofit에서 보내는 소식을 받을 수 있어요.";
  }

  return "채팅, 신청 결과, 일정 소식을 받을 수 있어요.";
}
