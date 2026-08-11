export type UserRole = "founder" | "respondent" | "both";

export function canUseFounderTools(role: UserRole | null | undefined) {
  return role === "founder" || role === "both";
}

export function getRoleLabel(role: UserRole) {
  if (role === "both") {
    return "창업자 · 인터뷰어";
  }

  if (role === "founder") {
    return "창업자";
  }

  return "인터뷰어";
}
