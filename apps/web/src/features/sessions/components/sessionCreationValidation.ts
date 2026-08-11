import type { CreateSessionInput } from "../../../shared/api/sessions";

export interface SessionCreationFormValues {
  applicationId: string;
  dateTime: string;
  meetingType: "offline" | "online";
  meetingUrl: string;
  place: string;
}

export function validateSessionCreation(values: SessionCreationFormValues): string | null {
  const scheduledAt = new Date(values.dateTime);

  if (!values.dateTime || Number.isNaN(scheduledAt.getTime())) {
    return "확정된 인터뷰 시간을 입력하세요.";
  }

  if (values.meetingType === "online" && values.meetingUrl.trim()) {
    try {
      new URL(values.meetingUrl.trim());
    } catch {
      return "화상 링크는 올바른 URL 형식으로 입력하세요.";
    }
  }

  return null;
}

export function toCreateSessionInput(values: SessionCreationFormValues): CreateSessionInput {
  const scheduledAt = new Date(values.dateTime);

  return {
    application_id: values.applicationId,
    scheduled_at: scheduledAt.toISOString(),
    meeting_type: values.meetingType,
    meeting_url:
      values.meetingType === "online" && values.meetingUrl.trim()
        ? values.meetingUrl.trim()
        : null,
    place: values.meetingType === "offline" && values.place.trim() ? values.place.trim() : null,
  };
}
