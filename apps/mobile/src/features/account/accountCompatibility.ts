import type { UserRole } from "@hypofit/contracts";

export const compatibilityRole: UserRole = "both";

export function canEditOrganization(_role: UserRole | null | undefined) {
  return true;
}
