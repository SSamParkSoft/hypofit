// Mirrors the API UserProfileInputNormalizer; phone remains optional.
export function getPhoneValidationError(value: string | null | undefined): string | null {
  const stripped = value?.trim() ?? "";
  if (!stripped) return null;
  if (stripped.length > 40) return "전화번호는 40자 이하로 입력해 주세요.";

  const rawDigits = stripped.replace(/\D/g, "");
  const digits = rawDigits.startsWith("82") ? `0${rawDigits.slice(2)}` : rawDigits;
  if (!digits.startsWith("0")) return "전화번호는 0으로 시작하는 국내 번호를 입력하세요.";
  if (digits.length !== 10 && digits.length !== 11) {
    return "전화번호는 10~11자리 국내 번호로 입력하세요.";
  }
  return null;
}
