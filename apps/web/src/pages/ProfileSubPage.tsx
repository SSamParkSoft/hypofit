import { ProfileSettingsSubPage as ProfileSettingsSubPageContent } from "../features/profiles/settings/ProfileSettingsSubPage";
import type { SettingsSubPageType } from "../features/profiles/settings/ProfileSettingsSubPage";
import type { AppUser } from "../shared/api/types";

export type ProfileSubPageType = SettingsSubPageType;

interface ProfileSubPageProps {
  appUser: AppUser | null;
  type: ProfileSubPageType;
}

export function ProfileSubPage({ appUser, type }: ProfileSubPageProps) {
  return <ProfileSettingsSubPageContent appUser={appUser} type={type} />;
}
