import { HelpCircle, ShieldAlert } from "lucide-react";

import { ProfileSettingsActionRow, ProfileSettingsSection, ProfileSettingsTextBlock } from "./settingsPrimitives";

export function ProfileDeleteAccountSettingsSubPage() {
  return (
    <ProfileSettingsSection title="삭제 전 확인">
      <ProfileSettingsTextBlock tone="danger">
        계정 삭제가 완료되면 계정 정보와 프로필 식별 정보가 삭제 또는 익명화됩니다. 같은 이메일로 다시 가입할 수 있지만
        이전 신청, 모집글, 채팅, 후기 기록은 복구되지 않습니다.
      </ProfileSettingsTextBlock>
      <ProfileSettingsActionRow
        helper="분쟁 대응에 필요한 최소 기록은 정책에 따라 분리 보관될 수 있습니다."
        href="/account-deletion"
        icon={HelpCircle}
        label="계정 삭제 접수하기"
        tone="danger"
      />
      <ProfileSettingsActionRow
        helper="앱을 다시 설치하지 않아도 요청할 수 있는 공개 페이지입니다."
        href="/account-deletion"
        icon={ShieldAlert}
        label="앱 밖에서 삭제 요청하기"
        tone="danger"
      />
    </ProfileSettingsSection>
  );
}
