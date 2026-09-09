export type NoticeType = "GENERAL" | "IMPORTANT" | "MAINTENANCE";

export interface PublishedNotice {
  body: string;
  id: string;
  published_at: string | null;
  title: string;
  type: NoticeType;
}

export function findLatestImportantNotice(notices: PublishedNotice[]) {
  return notices
    .filter((notice) => notice.type === "IMPORTANT")
    .sort((left, right) => toTimestamp(right.published_at) - toTimestamp(left.published_at))[0] ?? null;
}

function toTimestamp(value: string | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
