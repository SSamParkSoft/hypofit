export function formatRecruitCount(count: null | number | undefined) {
  const normalizedCount = Number(count);

  if (!Number.isFinite(normalizedCount)) {
    return "0명";
  }

  return `${Math.max(0, normalizedCount)}명`;
}
