import type { UserRole } from "../domain/roles";

export interface UserSummary {
  id: string;
  name: string;
  bio: string | null;
  role: UserRole;
  profile_image_url: string | null;
}
