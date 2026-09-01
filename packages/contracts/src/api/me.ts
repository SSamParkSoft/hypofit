import type { UserRole } from "../domain/roles";
import type { OrganizationType } from "./users";

export interface SyncMeInput {
  name: string;
  bio?: string | null;
  phone?: string | null;
  role: UserRole;
  profile_image_path?: string | null;
  profile_image_url?: string | null;
  organization_type?: OrganizationType | null;
  organization_name?: string | null;
}

export interface UpdateMeInput {
  name: string;
  bio?: string | null;
  phone?: string | null;
  role: UserRole;
  profile_image_path?: string | null;
  profile_image_url?: string | null;
  organization_type?: OrganizationType | null;
  organization_name?: string | null;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  bio: string | null;
  phone: string | null;
  role: UserRole;
  profile_image_path: string | null;
  profile_image_url: string | null;
  organization_type: OrganizationType | null;
  organization_name: string | null;
}
