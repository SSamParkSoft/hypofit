import type { UserRole } from "../domain/roles";

export type OrganizationType = "team" | "company";

export interface UserSummary {
  id: string;
  name: string;
  bio: string | null;
  role: UserRole;
  profile_image_url: string | null;
  organization_type?: OrganizationType | null;
  organization_name?: string | null;
}
