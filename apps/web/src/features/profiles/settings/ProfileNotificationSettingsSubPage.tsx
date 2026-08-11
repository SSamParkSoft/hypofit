import type { NotificationPreferenceUpdate } from "@hypofit/contracts";

import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from "../../notifications";
import { getApiErrorMessage } from "../../../shared/api/errorPresentation";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { ErrorState, LoadingState } from "../../../shared/ui/state";
import { ProfileSettingsSection, ProfileSettingsTextBlock } from "./settingsPrimitives";

type PreferenceKey = keyof NotificationPreferenceUpdate;

const preferenceRows: Array<{
  helper: string;
  key: Exclude<PreferenceKey, "push_enabled" | "marketing_push_enabled">;
  label: string;
}> = [
  {
    helper: "새 메시지가 오면 알려드려요.",
    key: "chat_push_enabled",
    label: "채팅 메시지",
  },
  {
    helper: "새 신청과 선정, 반려 상태를 알려드려요.",
    key: "application_push_enabled",
    label: "신청 상태",
  },
  {
    helper: "일정 변경과 취소처럼 놓치면 안 되는 소식을 알려드려요.",
    key: "session_push_enabled",
    label: "인터뷰 일정",
  },
  {
    helper: "문의에 답변이 등록되면 알려드려요.",
    key: "support_push_enabled",
    label: "문의 답변",
  },
];

export function ProfileNotificationSettingsSubPage() {
  const preferencesQuery = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();

  if (preferencesQuery.isPending) {
    return <LoadingState live="polite" title="알림 설정을 불러오고 있어요." />;
  }

  if (preferencesQuery.isError || !preferencesQuery.data) {
    return (
      <div className="grid gap-3">
        <ErrorState title="알림 설정을 불러오지 못했어요.">
          {getApiErrorMessage(preferencesQuery.error, "잠시 후 다시 시도해 주세요.")}
        </ErrorState>
        <div>
          <Button size="sm" variant="secondary" onClick={() => void preferencesQuery.refetch()}>
            다시 불러오기
          </Button>
        </div>
      </div>
    );
  }

  const preference = preferencesQuery.data;
  const isUpdating = updatePreferences.isPending;
  const updatePreference = (key: PreferenceKey, value: boolean) => {
    updatePreferences.reset();
    updatePreferences.mutate({ [key]: value });
  };

  return (
    <ProfileSettingsSection title="앱 알림">
      <NotificationPreferenceRow
        disabled={isUpdating}
        helper="모바일 앱에서 받을 알림을 한 번에 켜거나 꺼요."
        label="Hypofit 앱 알림"
        value={preference.push_enabled}
        onChange={(value) => updatePreference("push_enabled", value)}
      />
      {preferenceRows.map((row) => (
        <NotificationPreferenceRow
          key={row.key}
          disabled={isUpdating || !preference.push_enabled}
          helper={row.helper}
          label={row.label}
          value={preference[row.key]}
          onChange={(value) => updatePreference(row.key, value)}
        />
      ))}
      <ProfileSettingsTextBlock>
        이 설정은 같은 계정으로 로그인한 Hypofit 앱에 적용돼요. 브라우저 알림 권한은 요청하지 않아요.
      </ProfileSettingsTextBlock>
      {updatePreferences.isError ? (
        <p className="border-t border-hypo-border px-4 py-3 text-xs font-semibold leading-5 text-hypo-danger">
          {getApiErrorMessage(updatePreferences.error, "알림 설정을 저장하지 못했어요.")}
        </p>
      ) : null}
    </ProfileSettingsSection>
  );
}

function NotificationPreferenceRow({
  disabled,
  helper,
  label,
  onChange,
  value,
}: {
  disabled: boolean;
  helper: string;
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}) {
  const slug = label.replace(/\s+/g, "-");
  const labelId = `${slug}-label`;
  const helperId = `${slug}-helper`;

  return (
    <div className="flex min-h-[66px] items-center gap-4 border-t border-hypo-border px-4 py-3 first:border-t-0">
      <span className="min-w-0 flex-1">
        <span
          id={labelId}
          className={cn("block text-sm font-semibold", disabled && !value ? "text-hypo-text-muted" : "text-hypo-text")}
        >
          {label}
        </span>
        <span id={helperId} className="mt-0.5 block text-xs leading-5 text-hypo-text-muted">
          {helper}
        </span>
      </span>
      <button
        aria-checked={value}
        aria-describedby={helperId}
        aria-labelledby={labelId}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border border-transparent transition-colors",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
          value ? "bg-hypo-brand" : "bg-[#DCE2DD]",
          disabled && "cursor-not-allowed opacity-55",
        )}
        disabled={disabled}
        role="switch"
        type="button"
        onClick={() => onChange(!value)}
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow-sm transition-transform",
            value && "translate-x-5",
          )}
        />
      </button>
    </div>
  );
}
