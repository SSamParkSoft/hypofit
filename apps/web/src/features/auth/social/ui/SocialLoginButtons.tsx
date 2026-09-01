import { cn } from "../../../../shared/ui/cn";
import type { AuthFeedback } from "../../authScreenModel";
import type { SocialProviderId, SocialProviderOption } from "../model/providerRegistry";
import { SocialLoginButton } from "./SocialLoginButton";

interface SocialLoginButtonsProps {
  feedback: AuthFeedback;
  intent: "sign_in" | "sign_up";
  lastUsedProviderId?: SocialProviderId | null;
  pendingProviderId: SocialProviderId | null;
  providers: SocialProviderOption[];
  showDivider?: boolean;
  onStart: (providerId: SocialProviderId, intent: "sign_in" | "sign_up") => void;
}

export function SocialLoginButtons({
  feedback,
  intent,
  lastUsedProviderId = null,
  pendingProviderId,
  providers,
  showDivider = true,
  onStart,
}: SocialLoginButtonsProps) {
  if (providers.length === 0 && !feedback) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {showDivider ? (
        <div
          className="flex items-center gap-3 text-xs font-bold text-hypo-text-soft"
          aria-hidden="true"
        >
          <span className="h-px flex-1 bg-hypo-border" />
          또는
          <span className="h-px flex-1 bg-hypo-border" />
        </div>
      ) : null}

      <div className="grid gap-2">
        {providers.map((provider) => (
          <SocialLoginButton
            key={provider.provider}
            isLastUsed={lastUsedProviderId === provider.provider}
            isBusy={pendingProviderId === provider.provider}
            provider={provider.provider}
            onClick={() => onStart(provider.provider, intent)}
          />
        ))}
      </div>

      {feedback ? (
        <p
          className={cn(
            "rounded-hypo-md px-3 py-2 text-sm font-semibold",
            feedback.tone === "error"
              ? "bg-hypo-danger-soft text-hypo-danger"
              : "bg-hypo-brand-soft text-hypo-brand",
          )}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}
    </div>
  );
}
