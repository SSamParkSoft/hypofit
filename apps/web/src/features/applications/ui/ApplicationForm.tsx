import type { FormEventHandler } from "react";

import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import { Field, TextareaInput } from "../../../shared/ui/field";
import type { ApplicationFormErrors } from "../model/applicationForm";

interface ApplicationFormProps {
  actionsClassName?: string;
  availableTimes: string;
  availableTimesPlaceholder: string;
  buttonSize?: "md" | "sm";
  cancelLabel: string;
  className?: string;
  errorMessage?: string | null;
  errors: ApplicationFormErrors;
  experienceAnswer: string;
  experiencePlaceholder: string;
  isApplying?: boolean;
  onAvailableTimesChange: (value: string) => void;
  onCancel: () => void;
  onExperienceAnswerChange: (value: string) => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitDisabled?: boolean;
  submitLabel: string;
}

export function ApplicationForm({
  actionsClassName,
  availableTimes,
  availableTimesPlaceholder,
  buttonSize = "md",
  cancelLabel,
  className,
  errorMessage,
  errors,
  experienceAnswer,
  experiencePlaceholder,
  isApplying,
  onAvailableTimesChange,
  onCancel,
  onExperienceAnswerChange,
  onSubmit,
  submitDisabled,
  submitLabel,
}: ApplicationFormProps) {
  return (
    <form noValidate className={cn("grid gap-4", className)} onSubmit={onSubmit}>
      <Field label="관련 경험" error={errors.experienceAnswer ?? null}>
        <TextareaInput
          required
          value={experienceAnswer}
          placeholder={experiencePlaceholder}
          onChange={(event) => onExperienceAnswerChange(event.target.value)}
        />
      </Field>
      <Field label="가능 시간" error={errors.availableTimes ?? null}>
        <TextareaInput
          required
          value={availableTimes}
          placeholder={availableTimesPlaceholder}
          onChange={(event) => onAvailableTimesChange(event.target.value)}
        />
      </Field>
      {errorMessage ? (
        <p className="text-sm font-bold text-hypo-danger" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <div className={cn("flex flex-wrap justify-end gap-2", actionsClassName)}>
        <Button size={buttonSize} variant="secondary" type="button" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button disabled={submitDisabled || isApplying} size={buttonSize} type="submit">
          {isApplying ? "신청 중" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
