import type { CreateApplicationInput } from "../../../shared/api/applications";

export interface ApplicationFormFields {
  availableTimes: string;
  experienceAnswer: string;
}

export interface ApplicationFormErrors {
  availableTimes?: string;
  experienceAnswer?: string;
}

export const applicationFormErrorMessages = {
  availableTimes: "참여 가능한 시간을 한 개 이상 입력하세요.",
  experienceAnswer: "이 인터뷰 조건과 맞는 관련 경험을 입력하세요.",
} as const;

export function createEmptyApplicationFormFields(): ApplicationFormFields {
  return {
    availableTimes: "",
    experienceAnswer: "",
  };
}

export function validateApplicationForm(
  fields: ApplicationFormFields,
): ApplicationFormErrors {
  const errors: ApplicationFormErrors = {};

  if (!fields.experienceAnswer.trim()) {
    errors.experienceAnswer = applicationFormErrorMessages.experienceAnswer;
  }

  if (!normalizeAvailableTimes(fields.availableTimes).length) {
    errors.availableTimes = applicationFormErrorMessages.availableTimes;
  }

  return errors;
}

export function hasApplicationFormErrors(errors: ApplicationFormErrors): boolean {
  return Boolean(errors.availableTimes || errors.experienceAnswer);
}

export function toCreateApplicationInput(
  interviewPostId: string,
  fields: ApplicationFormFields,
): CreateApplicationInput {
  return {
    interview_post_id: interviewPostId,
    answers: {
      relevant_experience: fields.experienceAnswer.trim(),
    },
    available_times: normalizeAvailableTimes(fields.availableTimes),
  };
}

function normalizeAvailableTimes(value: string): string[] {
  return value
    .split("\n")
    .map((time) => time.trim())
    .filter(Boolean);
}
