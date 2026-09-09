import assert from "node:assert/strict";

import { findLatestImportantNotice } from "../src/features/notices/importantNoticeModel.ts";

const notices = [
  { id: "general", type: "GENERAL", title: "일반", body: "", published_at: "2026-09-03T01:00:00Z" },
  { id: "older", type: "IMPORTANT", title: "이전 중요", body: "", published_at: "2026-09-03T02:00:00Z" },
  { id: "latest", type: "IMPORTANT", title: "최신 중요", body: "", published_at: "2026-09-03T03:00:00Z" },
];

assert.equal(findLatestImportantNotice(notices)?.id, "latest");
assert.equal(findLatestImportantNotice(notices.filter((notice) => notice.type === "GENERAL")), null);
