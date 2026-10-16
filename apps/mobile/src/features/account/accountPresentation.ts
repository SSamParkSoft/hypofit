import type { OrganizationType } from "@hypofit/contracts";

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

function getOrganizationTypeLabel(type: OrganizationType | null | undefined) {
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
