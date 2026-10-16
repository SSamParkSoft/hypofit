import assert from "node:assert/strict";
import { formatHomeRegistrationTime, formatRegistrationTime } from "../src/shared/format/relativeTime.ts";

const now = Date.parse("2030-09-11T05:00:00Z");
assert.equal(formatRegistrationTime(null, now), null);
assert.equal(formatRegistrationTime("invalid", now), null);
for (const [minutes, expected] of [
  [0, "방금"], [1, "1분 전"], [13, "13분 전"], [59, "59분 전"],
  [60, "1시간 전"], [1439, "23시간 전"], [1440, "1일 전"],
  [10079, "6일 전"], [10080, "2030.09.04 14:00"],
]) {
  assert.equal(formatRegistrationTime(new Date(now - minutes * 60000).toISOString(), now), expected);
}
assert.equal(formatRegistrationTime("2030-08-31T15:00:00Z", now), "2030.09.01 00:00");
assert.equal(formatRegistrationTime("2030-09-01T07:19:58Z", now), "2030.09.01 16:19");
assert.equal(formatRegistrationTime(new Date(now + 1000).toISOString(), now), "방금");
assert.equal(formatHomeRegistrationTime(null, now), null);
assert.equal(formatHomeRegistrationTime("invalid", now), null);
for (const [days, expected] of [[2, "2일 전"], [7, "7일 전"], [20, "20일 전"], [30, "1개월 전"], [60, "2개월 전"], [365, "1년 전"]]) {
  assert.equal(formatHomeRegistrationTime(new Date(now - days * 86400000).toISOString(), now), expected);
}
assert.equal(formatHomeRegistrationTime(new Date(now - 13 * 60000).toISOString(), now), "13분 전");
assert.equal(formatHomeRegistrationTime(new Date(now + 1000).toISOString(), now), "방금");
console.log("Posting registration time fixtures passed.");
