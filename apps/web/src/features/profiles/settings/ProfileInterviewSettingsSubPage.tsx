import { Check, MessageCircle } from "lucide-react";

import { navigateTo } from "../../../shared/navigation/appNavigation";
import { ProfileSettingsActionRow, ProfileSettingsSection } from "./settingsPrimitives";

export function ProfileInterviewSettingsSubPage() {
  return (
    <ProfileSettingsSection title="인터뷰 진행">
      <ProfileSettingsActionRow
        helper="신청 이후 창업자와 시간을 조율합니다."
        icon={MessageCircle}
        label="채팅 보기"
        onClick={() => navigateTo("/chat")}
      />
      <ProfileSettingsActionRow
        helper="신청한 인터뷰와 만든 모집글을 확인합니다."
        href="/my-interviews"
        icon={Check}
        label="내 인터뷰"
      />
    </ProfileSettingsSection>
  );
}
