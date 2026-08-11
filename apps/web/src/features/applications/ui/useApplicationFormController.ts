import type { FormEvent } from "react";
import { useState } from "react";

import type { CreateApplicationInput } from "../../../shared/api/applications";
import {
  createEmptyApplicationFormFields,
  hasApplicationFormErrors,
  toCreateApplicationInput,
  validateApplicationForm,
  type ApplicationFormErrors,
} from "../model/applicationForm";

interface UseApplicationFormControllerOptions {
  initialOpen?: boolean;
  interviewPostId: string;
  onApply: (input: CreateApplicationInput) => void;
}

export function useApplicationFormController({
  initialOpen = false,
  interviewPostId,
  onApply,
}: UseApplicationFormControllerOptions) {
  const [fields, setFields] = useState(createEmptyApplicationFormFields);
  const [errors, setErrors] = useState<ApplicationFormErrors>({});
  const [isOpen, setIsOpen] = useState(initialOpen);

  return {
    availableTimes: fields.availableTimes,
    close: () => {
      setErrors({});
      setIsOpen(false);
    },
    errors,
    experienceAnswer: fields.experienceAnswer,
    isOpen,
    open: () => setIsOpen(true),
    setAvailableTimes: (availableTimes: string) => {
      setFields((current) => ({ ...current, availableTimes }));
    },
    setExperienceAnswer: (experienceAnswer: string) => {
      setFields((current) => ({ ...current, experienceAnswer }));
    },
    submit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const nextErrors = validateApplicationForm(fields);
      if (hasApplicationFormErrors(nextErrors)) {
        setErrors(nextErrors);
        return;
      }

      setErrors({});
      onApply(toCreateApplicationInput(interviewPostId, fields));
    },
  };
}
