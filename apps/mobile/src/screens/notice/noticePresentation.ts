const offsetDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  day: "numeric",
  month: "long",
  timeZone: "Asia/Seoul",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "numeric",
  hour12: true,
  minute: "2-digit",
  timeZone: "Asia/Seoul",
});

export function formatNoticeBody(body: string, type: string | null | undefined): string {
  if (type !== "MAINTENANCE") return body;

  const lastLine = body.split("\n").at(-1) ?? "";
  const match = /^(점검 시작|점검 예정): (.+)$/.exec(lastLine);
  if (!match) return body;

  const timestamps = match[2].split(" ~ ");
  if (timestamps.length > 2) return body;

  const start = parseOffsetDateTime(timestamps[0]);
  const end = timestamps[1] ? parseOffsetDateTime(timestamps[1]) : null;
  if (!start || (timestamps[1] && !end)) return body;

  const startDate = dateFormatter.format(start);
  const endLabel = end
    ? dateFormatter.format(end) === startDate
      ? ` ~ ${timeFormatter.format(end)}`
      : `\n~ ${dateFormatter.format(end)} ${timeFormatter.format(end)}`
    : "";
  const formattedLine = `${match[1]}: ${startDate}\n${timeFormatter.format(start)}${endLabel} (한국 시간)`;
  return body.slice(0, -lastLine.length) + formattedLine;
}

function parseOffsetDateTime(value: string): Date | null {
  if (!offsetDateTime.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
