import { UserPlus } from "lucide-react";

import { Button } from "../../../../shared/ui/button";
import type { AuthFeedback } from "../../authScreenModel";
import { AuthFeedbackMessage } from "./AuthFeedbackMessage";

interface AuthRoleOnboardingStepProps {
  accountEmail: string;
  accountName: string;
  feedback: AuthFeedback;
  hasAcceptedTerms: boolean;
  isSubmitting: boolean;
  submitLabel: string;
  onAcceptedTermsChange: (value: boolean) => void;
}

export function AuthRoleOnboardingStep({
  accountEmail,
  accountName,
  feedback,
  hasAcceptedTerms,
  isSubmitting,
  submitLabel,
  onAcceptedTermsChange,
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
