import type { CreateInterviewPostInput } from "../../../shared/api/types";

export interface PostCreationFormValues {
  durationMinutes: string;
  interviewMode: CreateInterviewPostInput["interview_mode"];
  location: string;
  locationAddress: string;
  locationLatitude: number | null;
  locationLongitude: number | null;
  locationPlaceName: string;
  locationPrecision: NonNullable<CreateInterviewPostInput["location_precision"]>;
  locationSource: NonNullable<CreateInterviewPostInput["location_source"]> | null;
  rewardAmount: string;
  scheduleOptions: string;
  serviceSummary: string;
  status: NonNullable<CreateInterviewPostInput["status"]>;
  targetDescription: string;
  title: string;
}

export function validatePostCreation(values: PostCreationFormValues): string | null {
  const rewardAmount = Number(values.rewardAmount);
  const durationMinutes = Number(values.durationMinutes);

  if (!values.title.trim()) {
    return "모집글 제목을 입력하세요.";
  }

  if (!values.serviceSummary.trim()) {
    return "검증하려는 서비스와 문제 상황을 입력하세요.";
  }

  if (!values.targetDescription.trim()) {
    return "찾는 응답자 조건을 구체적으로 입력하세요.";
  }

  if (!Number.isFinite(rewardAmount) || rewardAmount < 0) {
    return "사례비는 0원 이상의 숫자로 입력하세요.";
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes < 5) {
    return "예상 소요 시간은 5분 이상으로 입력하세요.";
  }

  if (
    values.interviewMode !== "online" &&
    (!values.location.trim() ||
      values.locationLatitude === null ||
      values.locationLongitude === null ||
      !values.locationSource)
  ) {
    return "대면 인터뷰 장소를 선택하세요.";
  }

  return null;
}

export function toCreateInterviewPostInput(
  values: PostCreationFormValues,
): CreateInterviewPostInput {
  return {
    title: values.title.trim(),
    service_summary: values.serviceSummary.trim(),
    target_description: values.targetDescription.trim(),
    reward_amount: Number(values.rewardAmount),
    duration_minutes: Number(values.durationMinutes),
    interview_mode: values.interviewMode,
    location: values.location.trim() ? values.location.trim() : null,
    location_text: values.location.trim() ? values.location.trim() : null,
    location_address: values.locationAddress.trim() ? values.locationAddress.trim() : null,
    location_place_name: values.locationPlaceName.trim() ? values.locationPlaceName.trim() : null,
    location_latitude: values.locationLatitude,
    location_longitude: values.locationLongitude,
    location_precision: values.interviewMode === "online" ? null : values.locationPrecision,
    location_source: values.interviewMode === "online" ? null : values.locationSource,
    schedule_options: values.scheduleOptions
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean),
    status: values.status,
  };
}
