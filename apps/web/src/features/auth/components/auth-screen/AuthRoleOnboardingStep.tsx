import { Check, UserPlus } from "lucide-react";

import { Button } from "../../../../shared/ui/button";
import { cn } from "../../../../shared/ui/cn";
import { roleOptions, type AuthFeedback } from "../../authScreenModel";
import { AuthFeedbackMessage } from "./AuthFeedbackMessage";

interface AuthRoleOnboardingStepProps {
  accountEmail: string;
  accountName: string;
  feedback: AuthFeedback;
  hasAcceptedTerms: boolean;
  isSubmitting: boolean;
  role: (typeof roleOptions)[number]["value"];
  submitLabel: string;
  onAcceptedTermsChange: (value: boolean) => void;
  onRoleChange: (value: (typeof roleOptions)[number]["value"]) => void;
}

export function AuthRoleOnboardingStep({
  accountEmail,
  accountName,
  feedback,
  hasAcceptedTerms,
  isSubmitting,
  role,
  submitLabel,
  onAcceptedTermsChange,
  onRoleChange,
}: AuthRoleOnboardingStepProps) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4">
        <div className="grid gap-2 rounded-hypo-lg border border-hypo-border bg-hypo-surface/70 px-4 py-3">
          <span className="text-xs font-bold text-hypo-text-soft">계정 정보</span>
          <div className="grid gap-1">
            <strong className="text-sm font-black text-hypo-text">{accountName}</strong>
            <span className="text-sm text-hypo-text-muted">{accountEmail}</span>
          </div>
        </div>

        <fieldset className="grid gap-2.5">
          <legend className="sr-only">역할 선택</legend>
          {roleOptions.map((option) => (
            <RoleOption
              id={`auth-role-${option.value}`}
              key={option.value}
              description={option.description}
              isSelected={role === option.value}
              label={option.label}
              onSelect={() => onRoleChange(option.value)}
            />
          ))}
        </fieldset>
      </div>

      <AuthFeedbackMessage feedback={feedback} />

      <div className="flex items-start gap-3 rounded-hypo-lg border border-hypo-border px-3.5 py-3 text-xs font-bold leading-5 text-hypo-text">
        <input
          checked={hasAcceptedTerms}
          className="mt-0.5 size-5 shrink-0 accent-hypo-brand"
          id="auth-legal-consent"
          type="checkbox"
          onChange={(event) => onAcceptedTermsChange(event.target.checked)}
        />
        <span>
          <label className="cursor-pointer" htmlFor="auth-legal-consent">
            만 19세 이상이며, Hypofit의{" "}
          </label>
          <a
            className="font-black text-hypo-brand underline underline-offset-4"
            href="/legal/terms"
          >
            이용약관
          </a>
          <label className="cursor-pointer" htmlFor="auth-legal-consent">
            과{" "}
          </label>
          <a
            className="font-black text-hypo-brand underline underline-offset-4"
            href="/legal/privacy"
          >
            개인정보처리방침
          </a>
          <label className="cursor-pointer" htmlFor="auth-legal-consent">
            을 확인하고 동의해요.
          </label>
        </span>
      </div>

      <Button className="min-h-12 w-full text-base" disabled={isSubmitting} type="submit">
        <UserPlus size={17} />
        {submitLabel}
      </Button>
    </div>
  );
}

interface RoleOptionProps {
  description: string;
  id: string;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
}

function RoleOption({ description, id, isSelected, label, onSelect }: RoleOptionProps) {
  return (
    <label
      className={cn(
        "flex min-h-[72px] cursor-pointer items-center gap-3 rounded-hypo-lg border px-4 py-3 text-left transition-colors focus-within:ring-[3px] focus-within:ring-hypo-brand/15",
        isSelected
          ? "border-hypo-brand bg-hypo-brand-soft/55"
          : "border-hypo-border bg-hypo-surface hover:border-hypo-brand/40",
      )}
    >
      <input
        checked={isSelected}
        className="sr-only"
        id={id}
        name="auth-role"
        type="radio"
        onChange={onSelect}
      />
      <span
        className={cn(
          "grid size-8 shrink-0 place-items-center rounded-full",
          isSelected ? "bg-hypo-brand text-white" : "bg-hypo-surface-muted text-transparent",
        )}
      >
        <Check aria-hidden="true" size={16} strokeWidth={3} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm font-black text-hypo-text">{label}</strong>
        <span className="mt-1 block text-xs leading-5 text-hypo-text-muted">{description}</span>
      </span>
    </label>
  );
}
