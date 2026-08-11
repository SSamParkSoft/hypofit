import type { AppUser } from "../../../shared/api/types";
import { HelpCircle } from "lucide-react";

import { ProfileSettingsActionRow, ProfileSettingsSection, ProfileSettingsStatusRow } from "./settingsPrimitives";

export function ProfileRoleSettingsSubPage({ appUser }: { appUser: AppUser | null }) {
  return (
    <ProfileSettingsSection title="사용 가능한 기능">
      <ProfileSettingsStatusRow enabled label="인터뷰 신청" />
      <ProfileSettingsStatusRow enabled label="채팅 조율" />
      <ProfileSettingsStatusRow
        enabled={appUser?.role === "founder" || appUser?.role === "both"}
        label="모집글 만들기"
      />
      <ProfileSettingsActionRow
        helper="창업자 기능이 필요하면 문의로 요청하세요."
        href="/support/inquiries"
        icon={HelpCircle}
        label="역할 변경 문의"
      />
    </ProfileSettingsSection>
  );
}
