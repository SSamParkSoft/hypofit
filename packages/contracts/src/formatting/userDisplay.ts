export interface UserDisplaySource {
  name?: string | null;
}

export function formatUserDisplayName(
  user: UserDisplaySource | null | undefined,
  fallback = "탈퇴한 사용자",
): string {
  return user?.name?.trim() || fallback;
}
