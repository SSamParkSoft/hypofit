import type { UserRole } from "@hypofit/contracts";
import { mobileEnv } from "@/shared/api/env";

export const supportEmail = mobileEnv.supportEmail;
export const appVersion = "1.0.1";
export const companyName = "contentruck";

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

export function roleDescription(role: UserRole | null | undefined) {
  if (role === "founder") return "고객 인터뷰를 모집하고 신청자를 선정해요.";
  if (role === "both") return "창업자와 인터뷰어 역할을 모두 사용할 수 있어요.";
  return "내 경험에 맞는 인터뷰에 신청해요.";
}
