import { describe, expect, it } from "vitest";

import {
  type SessionCreationFormValues,
  toCreateSessionInput,
  validateSessionCreation,
} from "./sessionCreationValidation";

const validValues: SessionCreationFormValues = {
  applicationId: "application-1",
  dateTime: "2026-05-20T10:30",
  meetingType: "online",
  meetingUrl: " https://meet.google.com/abc-defg-hij ",
  place: "서울 성수",
};

describe("session creation validation", () => {
  it("requires a valid scheduled time", () => {
    expect(validateSessionCreation({ ...validValues, dateTime: "" })).toBe(
      "확정된 인터뷰 시간을 입력하세요.",
    );
  });

  it("rejects invalid online meeting urls", () => {
    expect(validateSessionCreation({ ...validValues, meetingUrl: "not-a-url" })).toBe(
      "화상 링크는 올바른 URL 형식으로 입력하세요.",
    );
  });

  it("normalizes an online session into the API input contract", () => {
    expect(toCreateSessionInput(validValues)).toEqual({
      application_id: "application-1",
      scheduled_at: new Date("2026-05-20T10:30").toISOString(),
      meeting_type: "online",
      meeting_url: "https://meet.google.com/abc-defg-hij",
      place: null,
    });
  });

  it("normalizes an offline session into the API input contract", () => {
    expect(
      toCreateSessionInput({
        ...validValues,
        meetingType: "offline",
        meetingUrl: "https://meet.google.com/unused",
        place: " 서울 성수역 ",
      }),
    ).toEqual({
      application_id: "application-1",
      scheduled_at: new Date("2026-05-20T10:30").toISOString(),
      meeting_type: "offline",
      meeting_url: null,
      place: "서울 성수역",
    });
  });
});
