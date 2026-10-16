import assert from "node:assert/strict";
import { test } from "node:test";
import { buildScheduledAt, formatScheduleDate, formatScheduleTime, getAllowedMeetingTypes } from "../src/screens/chat/scheduleSessionValidation.ts";

test("valid local date and time retain their components when serialized", () => {
  const result = buildScheduledAt("2026-10-12", "19:30");
  const date = new Date(result);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 9);
  assert.equal(date.getDate(), 12);
  assert.equal(date.getHours(), 19);
  assert.equal(date.getMinutes(), 30);
  assert.ok(result.endsWith("Z"));
});

test("a real leap day is accepted", () => {
  assert.notEqual(buildScheduledAt("2028-02-29", "12:00"), null);
});

test("a non-leap February 29 is rejected instead of becoming March 1", () => {
  assert.equal(buildScheduledAt("2026-02-29", "19:00"), null);
});

test("dates beyond the last day of a month are rejected instead of rolling over", () => {
  for (const date of ["2026-02-30", "2026-04-31", "2026-06-31", "2026-09-31"]) {
    assert.equal(buildScheduledAt(date, "19:00"), null, date);
  }
});

test("24:00 is rejected instead of becoming the next day", () => {
  assert.equal(buildScheduledAt("2026-10-12", "24:00"), null);
});

test("invalid months, days, hours, and minutes are rejected", () => {
  for (const [date, time] of [
    ["2026-00-12", "19:00"], ["2026-13-12", "19:00"],
    ["2026-10-00", "19:00"], ["2026-10-32", "19:00"],
    ["2026-10-12", "25:00"], ["2026-10-12", "19:60"],
  ]) {
    assert.equal(buildScheduledAt(date, time), null, `${date} ${time}`);
  }
});

test("incomplete or differently formatted input is rejected", () => {
  for (const [date, time] of [
    ["", ""], ["2026-1-2", "19:00"], ["2026/10/12", "19:00"],
    ["2026-10-12", "9:00"], ["2026-10-12", "19:00:00"],
  ]) {
    assert.equal(buildScheduledAt(date, time), null);
  }
});

test("valid boundary times stay on the chosen date", () => {
  for (const time of ["00:00", "23:59"]) {
    const date = new Date(buildScheduledAt("2026-10-12", time));
    assert.equal(date.getDate(), 12);
    assert.equal(`${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`, time);
  }
});

test("only posting-permitted meeting types are offered", () => {
  assert.deepEqual(getAllowedMeetingTypes("online"), ["online"]);
  assert.deepEqual(getAllowedMeetingTypes("offline"), ["offline"]);
  assert.deepEqual(getAllowedMeetingTypes("both"), ["online", "offline"]);
  for (const value of [null, undefined, "unknown"]) assert.deepEqual(getAllowedMeetingTypes(value), []);
});

test("picker formatting preserves local calendar and clock values", () => {
  const date = new Date(2028, 1, 29, 9, 5);
  assert.equal(formatScheduleDate(date), "2028-02-29");
  assert.equal(formatScheduleTime(date), "09:05");
  assert.equal(new Date(buildScheduledAt(formatScheduleDate(date), formatScheduleTime(date))).getTime(), date.getTime());
});
