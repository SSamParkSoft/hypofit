import { Button } from "../../../../shared/ui/button";
import type { AuthFeedback } from "../../authScreenModel";

interface AuthSessionContinuationStepProps {
  accountEmail: string;
  accountImageUrl?: string | null;
  accountName: string;
  feedback: AuthFeedback;
  isSwitchingAccount: boolean;
  onContinue: () => void;
  onUseOtherAccount: () => void;
}

export function AuthSessionContinuationStep({
  accountEmail,
  accountImageUrl,
  accountName,
  feedback,
  isSwitchingAccount,
  onContinue,
  onUseOtherAccount,
}: AuthSessionContinuationStepProps) {
  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-3 rounded-hypo-lg border border-hypo-border bg-hypo-bg/70 px-4 py-3.5">
        {accountImageUrl ? (
          <img
            alt=""
            aria-hidden="true"
            className="size-11 shrink-0 rounded-full border border-hypo-border object-cover"
            src={accountImageUrl}
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-hypo-brand-soft text-sm font-black text-hypo-brand"
          >
            {accountName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="min-w-0">
          <strong className="block truncate text-sm font-bold text-hypo-text">{accountName}</strong>
          <span className="mt-0.5 block truncate text-xs text-hypo-text-muted">{accountEmail}</span>
        </span>
      </div>

      <div className="grid gap-2.5">
        <Button className="w-full" type="button" onClick={onContinue}>
          {accountName} 계정으로 계속
        </Button>
        <Button
          className="w-full"
          disabled={isSwitchingAccount}
          type="button"
          variant="secondary"
          onClick={onUseOtherAccount}
        >
          {isSwitchingAccount ? "로그아웃 중" : "다른 계정으로 로그인"}
        </Button>
      </div>

      {feedback ? (
        <p
          className="text-sm font-semibold leading-6 text-hypo-danger"
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
