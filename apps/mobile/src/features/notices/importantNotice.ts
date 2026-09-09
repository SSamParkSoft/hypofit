import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet } from "@/shared/api/client";
import { findLatestImportantNotice, type PublishedNotice } from "./importantNoticeModel";

export { findLatestImportantNotice, type PublishedNotice } from "./importantNoticeModel";

function buildSeenNoticeStorageKey(memberId: string) {
  return `hypofit:important-notice:last-seen:${memberId}`;
}

export async function fetchPublishedNotices() {
  return apiGet<PublishedNotice[]>("/api/v1/notices");
}

export async function findUnseenImportantNotice(memberId: string) {
  const [notices, lastSeenNoticeId] = await Promise.all([
    fetchPublishedNotices(),
    AsyncStorage.getItem(buildSeenNoticeStorageKey(memberId)),
  ]);
  const latest = findLatestImportantNotice(notices);

  return latest?.id === lastSeenNoticeId ? null : latest;
}

export async function markImportantNoticeSeen(memberId: string, noticeId: string) {
  await AsyncStorage.setItem(buildSeenNoticeStorageKey(memberId), noticeId);
}
