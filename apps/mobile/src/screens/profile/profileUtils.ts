import type { OrganizationType, UserRole } from "@hypofit/contracts";
import { mobileEnv } from "@/shared/api/env";

export const supportEmail = mobileEnv.supportEmail;
export const appVersion = "1.0.1";
export const companyName = "contentruck";
export const compatibilityRole: UserRole = "both";

export function formatPhoneInput(value: string) {
  const rawDigits = value.replace(/\D/g, "");
  const digits = (rawDigits.startsWith("82") ? `0${rawDigits.slice(2)}` : rawDigits).slice(0, 11);

  if (digits.length <= 3) return digits;

  if (digits.startsWith("02")) {
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function roleDescription(_role: UserRole | null | undefined) {
  return "프로필을 정리해 두면 더 잘 맞는 공고와 대화에서 도움이 돼요.";
}

export function canEditOrganization(_role: UserRole | null | undefined) {
  return true;
}

export function getOrganizationTypeLabel(type: OrganizationType | null | undefined) {
  if (type === "team") return "팀";
  if (type === "company") return "회사";
  return null;
}

export function formatOrganizationDisplay(
  type: OrganizationType | null | undefined,
  name: string | null | undefined,
) {
  const trimmedName = name?.trim();

  if (!trimmedName) {
    return null;
  }

  const typeLabel = getOrganizationTypeLabel(type);
  return typeLabel ? `${typeLabel} · ${trimmedName}` : trimmedName;
}
