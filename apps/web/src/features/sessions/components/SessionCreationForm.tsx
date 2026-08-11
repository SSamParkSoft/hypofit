import { type FormEvent, useState } from "react";

import type { CreateSessionInput } from "../../../shared/api/sessions";
import { Button } from "../../../shared/ui/button";
import { Field, SelectInput, TextInput } from "../../../shared/ui/field";
import {
  toCreateSessionInput,
  validateSessionCreation,
} from "./sessionCreationValidation";

interface SessionCreationFormProps {
  applicationId: string;
  disabled?: boolean;
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onSubmit: (input: CreateSessionInput) => void;
}

export function SessionCreationForm({
  applicationId,
  disabled,
  errorMessage,
  isSubmitting,
  onSubmit,
}: SessionCreationFormProps) {
  const [dateTime, setDateTime] = useState("");
  const [meetingType, setMeetingType] = useState<"offline" | "online">("online");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [place, setPlace] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const errorFor = (message: string) => (validationError === message ? message : null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = { applicationId, dateTime, meetingType, meetingUrl, place };
    const nextValidationError = validateSessionCreation(values);

    if (nextValidationError) {
      setValidationError(nextValidationError);
      return;
    }

    setValidationError(null);
    onSubmit(toCreateSessionInput(values));
  }

  return (
    <form
      className="mt-4 grid gap-3 rounded-hypo-lg border border-hypo-border bg-hypo-surface p-4"
      onSubmit={handleSubmit}
    >
      <div>
        <h5 className="text-sm font-black text-hypo-text">일정 확정</h5>
        <p className="mt-1 text-xs leading-5 text-hypo-text-muted">
          선정된 지원자와 합의한 시간을 입력해 인터뷰 세션을 만듭니다.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="확정 시간" error={errorFor("확정된 인터뷰 시간을 입력하세요.")}>
          <TextInput
            required
            disabled={disabled}
            type="datetime-local"
            value={dateTime}
            onChange={(event) => setDateTime(event.target.value)}
          />
        </Field>

        <Field label="진행 방식">
          <SelectInput
            disabled={disabled}
            value={meetingType}
            onChange={(event) => setMeetingType(event.target.value as "offline" | "online")}
          >
            <option value="online">화상</option>
            <option value="offline">대면</option>
          </SelectInput>
        </Field>
      </div>

      {meetingType === "online" ? (
        <Field label="화상 링크" error={errorFor("화상 링크는 올바른 URL 형식으로 입력하세요.")}>
          <TextInput
            disabled={disabled}
            type="url"
            value={meetingUrl}
            placeholder="https://meet.google.com/..."
            onChange={(event) => setMeetingUrl(event.target.value)}
          />
        </Field>
      ) : (
        <Field label="장소">
          <TextInput
            disabled={disabled}
            value={place}
            placeholder="예: 서울 성수역 인근 카페"
            onChange={(event) => setPlace(event.target.value)}
          />
        </Field>
      )}

      {errorMessage ? (
        <p className="text-sm font-bold text-hypo-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button disabled={disabled || isSubmitting || !dateTime} size="sm" type="submit">
          {isSubmitting ? "생성 중" : "일정 생성"}
        </Button>
      </div>
    </form>
  );
}
