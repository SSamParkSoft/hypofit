import { isPostingDate } from "@/features/postings/postingCreationMethod";

export function isIsoDate(value: string) {
  return isPostingDate(value);
}

export function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateTime(date: Date) {
  const dateLabel = formatDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dateLabel} ${hours}:${minutes}`;
}
