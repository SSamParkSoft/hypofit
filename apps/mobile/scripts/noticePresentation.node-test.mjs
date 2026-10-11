import assert from "node:assert/strict";
import { test } from "node:test";
import { formatNoticeBody } from "../src/screens/notice/noticePresentation.ts";

test("maintenance notice times use readable Korean time without seconds or UTC syntax", () => {
  assert.equal(
    formatNoticeBody(
      "안정적인 서비스 제공을 위해 점검을 진행하고 있어요.\n\n점검 시작: 2026-09-03T07:03:06.941315278Z ~ 2026-09-03T08:03:02.720Z",
      "MAINTENANCE",
    ),
    "안정적인 서비스 제공을 위해 점검을 진행하고 있어요.\n\n점검 시작: 2026년 9월 3일\n오후 4:03 ~ 오후 5:03 (한국 시간)",
  );
});

test("scheduled maintenance preserves the date when the range crosses midnight", () => {
  assert.equal(
    formatNoticeBody(
      "점검 예정: 2026-09-03T23:30:00+09:00 ~ 2026-09-04T01:00:00+09:00",
      "MAINTENANCE",
    ),
    "점검 예정: 2026년 9월 3일\n오후 11:30\n~ 2026년 9월 4일 오전 1:00 (한국 시간)",
  );
});

test("ordinary notices and unrecognized maintenance text remain unchanged", () => {
  const body = "점검 시작: 일정은 추후 안내할게요.";
  assert.equal(formatNoticeBody(body, "GENERAL"), body);
  assert.equal(formatNoticeBody(body, "MAINTENANCE"), body);
});
