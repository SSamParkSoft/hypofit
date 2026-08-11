import { describe, expect, it } from "vitest";

import {
  createEmptyApplicationFormFields,
  hasApplicationFormErrors,
  toCreateApplicationInput,
  validateApplicationForm,
} from "./applicationForm";

const validFields = {
  availableTimes: "평일 20시 이후\n\n 토요일 오전 ",
  experienceAnswer: " 최근 직접 장을 보고 남은 식재료를 버린 경험이 있습니다. ",
};

describe("applicationForm", () => {
  it("creates empty fields", () => {
    expect(createEmptyApplicationFormFields()).toEqual({
      availableTimes: "",
      experienceAnswer: "",
    });
  });

  it("returns a field error when relevant experience is missing", () => {
    expect(validateApplicationForm({ ...validFields, experienceAnswer: " " })).toEqual({
      experienceAnswer: "이 인터뷰 조건과 맞는 관련 경험을 입력하세요.",
    });
  });

  it("returns a field error when available times are missing", () => {
    expect(validateApplicationForm({ ...validFields, availableTimes: "\n " })).toEqual({
      availableTimes: "참여 가능한 시간을 한 개 이상 입력하세요.",
    });
  });

  it("reports whether any field errors exist", () => {
    expect(hasApplicationFormErrors({})).toBe(false);
    expect(hasApplicationFormErrors({ availableTimes: "참여 가능한 시간을 입력하세요." })).toBe(
      true,
    );
  });

  it("normalizes respondent application input", () => {
    expect(toCreateApplicationInput("post-1", validFields)).toEqual({
      interview_post_id: "post-1",
      answers: {
        relevant_experience: "최근 직접 장을 보고 남은 식재료를 버린 경험이 있습니다.",
      },
      available_times: ["평일 20시 이후", "토요일 오전"],
    });
  });
});
