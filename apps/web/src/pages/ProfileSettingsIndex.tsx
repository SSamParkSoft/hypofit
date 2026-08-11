import { ProfileSettingsIndexContent } from "../features/profiles/settings/ProfileSettingsIndexContent";
import type { AppUser } from "../shared/api/types";

interface ProfileSettingsIndexProps {
  appUser: AppUser | null;
}

export function ProfileSettingsIndex({ appUser }: ProfileSettingsIndexProps) {
  return <ProfileSettingsIndexContent appUser={appUser} />;
}
