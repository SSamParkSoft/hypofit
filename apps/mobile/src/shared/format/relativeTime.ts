export function formatHomeRegistrationTime(value?: string | null, now = Date.now()): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const days = Math.floor(Math.max(0, now - timestamp) / 86400000);
  if (days < 7) return formatRegistrationTime(value, now);
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

export function formatRegistrationTime(value?: string | null, now = Date.now()): string | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  const minutes = Math.floor(Math.max(0, now - timestamp) / 60000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const parts = new Map(new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(timestamp)).map((part) => [part.type, part.value]));
  return `${parts.get("year")}.${parts.get("month")}.${parts.get("day")} ${parts.get("hour")}:${parts.get("minute")}`;
}
