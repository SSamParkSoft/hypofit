import type { AppUser } from "../../../shared/api/types";
import { HelpCircle } from "lucide-react";

import {
  ProfileSettingsActionRow,
  ProfileSettingsSection,
  ProfileSettingsStatusRow,
  ProfileSettingsTextBlock,
} from "./settingsPrimitives";

export function ProfileRoleSettingsSubPage({ appUser }: { appUser: AppUser | null }) {
  return (
    <ProfileSettingsSection title="사용 가능한 기능">
      <ProfileSettingsTextBlock>
        현재 계정 상태에 따라 신청과 채팅은 바로 사용할 수 있고, 모집 기능은 역할에 따라 달라집니다.
      </ProfileSettingsTextBlock>
      <ProfileSettingsStatusRow enabled helper="조건에 맞는 인터뷰를 찾아 바로 신청할 수 있어요." label="인터뷰 신청" />
      <ProfileSettingsStatusRow enabled helper="선정 이후 일정과 세부 내용을 조율할 수 있어요." label="채팅 조율" />
      <ProfileSettingsStatusRow
        enabled={appUser?.role === "founder" || appUser?.role === "both"}
        helper="직접 모집글을 열고 지원자를 받을 수 있어요."
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
