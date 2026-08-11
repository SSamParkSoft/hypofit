import { describe, expect, it } from "vitest";

import {
  type PostCreationFormValues,
  toCreateInterviewPostInput,
  validatePostCreation,
} from "./postCreationValidation";

const validValues: PostCreationFormValues = {
  durationMinutes: "45",
  interviewMode: "both",
  location: " 서울 성수 ",
  locationAddress: "서울 성동구",
  locationLatitude: 37.54458,
  locationLongitude: 127.05596,
  locationPlaceName: "성수역",
  locationPrecision: "nearby",
  locationSource: "kakao_place",
  rewardAmount: "20000",
  scheduleOptions: "평일 저녁\n\n 주말 오전 ",
  serviceSummary: " 장보기 문제 검증 ",
  status: "open",
  targetDescription: " 최근 장보기 경험자 ",
  title: " 1인 가구 인터뷰 ",
};

describe("post creation validation", () => {
  it("accepts a complete post creation form", () => {
    expect(validatePostCreation(validValues)).toBeNull();
  });

  it("rejects invalid reward and duration values", () => {
    expect(validatePostCreation({ ...validValues, rewardAmount: "-1" })).toBe(
      "사례비는 0원 이상의 숫자로 입력하세요.",
    );
    expect(validatePostCreation({ ...validValues, durationMinutes: "4" })).toBe(
      "예상 소요 시간은 5분 이상으로 입력하세요.",
    );
  });

  it("normalizes a form into the API input contract", () => {
    expect(toCreateInterviewPostInput(validValues)).toEqual({
      duration_minutes: 45,
      interview_mode: "both",
      location: "서울 성수",
      location_address: "서울 성동구",
      location_latitude: 37.54458,
      location_longitude: 127.05596,
      location_place_name: "성수역",
      location_precision: "nearby",
      location_source: "kakao_place",
      location_text: "서울 성수",
      reward_amount: 20000,
      schedule_options: ["평일 저녁", "주말 오전"],
      service_summary: "장보기 문제 검증",
      status: "open",
      target_description: "최근 장보기 경험자",
      title: "1인 가구 인터뷰",
    });
  });
});
