import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Switch, Text, View } from "react-native";
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
} from "@/features/push/pushApi";
import { AppScreen } from "@/shared/ui/AppScreen";
import { colors } from "@/shared/theme/tokens";
import { useAppActive } from "@/shared/hooks/useAppActive";

type PreferenceKey =
  | "push_enabled"
  | "chat_push_enabled"
  | "application_push_enabled"
  | "session_push_enabled"
  | "support_push_enabled";

const switchColors = {
  off: "#DCE2DD",
  on: colors.brandStrong,
  thumb: colors.surface,
};

export function NotificationSettingsScreen() {
  const { accessToken, user } = useAuth();
  const isAppActive = useAppActive();
  const enableAfterSettingsRef = useRef(false);
  const [preference, setPreference] = useState<NotificationPreferenceRecord | null>(null);
  const [permission, setPermission] = useState<PushPermissionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(accessToken));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingKey, setUpdatingKey] = useState<PreferenceKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    setIsLoading(true);

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
  }, [accessToken]);

  useEffect(() => {
    enableAfterSettingsRef.current = false;
  }, [user?.id]);

  useEffect(() => {
    if (!isAppActive) return;
    let cancelled = false;
    void (async () => {
      if (enableAfterSettingsRef.current) {
        const current = await getPushPermissionSummary();
        if (cancelled) return;
        enableAfterSettingsRef.current = false;
        if (current.status === "granted") {
          setIsSubmitting(true);
          const result = await requestAndRegisterPush(accessToken);
          setIsSubmitting(false);
          if (cancelled) return;
          setMessage(result.message);
        }
      }
      if (!cancelled) await refreshState();
    })();
    return () => { cancelled = true; };
  }, [accessToken, isAppActive, refreshState]);

  const enablePush = async () => {
    setIsSubmitting(true);
    setMessage(null);
    const result = await requestAndRegisterPush(accessToken);
    await refreshState();
    setMessage(result.message);
    setIsSubmitting(false);
  };

  const disablePush = async () => {
    if (!accessToken || !preference) {
      return;
    }

    enableAfterSettingsRef.current = false;
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
      enableAfterSettingsRef.current = false;
      setMessage("기기 설정에서 Hypofit 알림을 켜 주세요.");
    }
  };

  const enableDevicePermission = async () => {
    if (!accessToken) {
      return;
    }

    if (permission?.status === "denied") {
      enableAfterSettingsRef.current = true;
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
  const preferenceRowsDisabled = !accessToken || !pushEnabled || isSubmitting || updatingKey !== null;

  return (
    <AppScreen backTo="/(tabs)/profile" title="알림 설정" glassHeaderControls>
      <View className="gap-3 pt-2">
        {isLoading ? (
          <View className="items-center py-6">
            <ActivityIndicator color={colors.brand} size="small" />
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
                <ActivityIndicator color={colors.brand} size="small" />
              ) : (
                <Switch
                  accessibilityLabel="알림 받기"
                  disabled={!accessToken || !preference || updatingKey !== null}
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

                    void enableDevicePermission();
                  }}
                  thumbColor={switchColors.thumb}
                  trackColor={{ false: switchColors.off, true: switchColors.on }}
                  value={pushEnabled}
                />
              )}
            </View>
            <Text className="mt-1 text-xs leading-[18px] text-hypo-muted">
              이 계정으로 로그인한 모든 기기에 적용돼요. 휴대폰의 알림 권한은 기기 설정에서 관리해요.
            </Text>
            {pushEnabled && !permissionGranted ? (
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting || updatingKey !== null}
                onPress={() => void enableDevicePermission()}
                className="min-h-[44px] justify-center self-start py-2 active:opacity-70"
              >
                <Text className="text-sm font-bold text-hypo-brand">기기 알림 허용하기</Text>
              </Pressable>
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
          label="참여 일정"
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
        <ActivityIndicator color={colors.brand} size="small" />
      ) : (
        <Switch
          accessibilityLabel={label}
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
  if (pushEnabled && permission?.status !== "granted") {
    return "계정 알림은 켜져 있지만, 이 기기에서는 알림 권한이 필요해요.";
  }

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
