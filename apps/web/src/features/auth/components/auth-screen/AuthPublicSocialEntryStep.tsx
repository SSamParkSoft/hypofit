import type { AuthFeedback } from "../../authScreenModel";
import type { SocialAuthCapability } from "../../social/api/socialAuthApi";
import type { SocialProviderId } from "../../social/model/providerRegistry";
import { SocialLoginButtons } from "../../social/ui/SocialLoginButtons";

interface AuthPublicSocialEntryStepProps {
  feedback: AuthFeedback;
  isLoadingSocialAuth: boolean;
  pendingSocialProviderId: SocialProviderId | null;
  socialAuthProviders: SocialAuthCapability[];
  onSocialStart: (providerId: SocialProviderId) => void;
}

export function AuthPublicSocialEntryStep({
  feedback,
  isLoadingSocialAuth,
  pendingSocialProviderId,
  socialAuthProviders,
  onSocialStart,
}: AuthPublicSocialEntryStepProps) {
  return (
    <div className="grid gap-4">
      <SocialLoginButtons
        feedback={feedback}
        intent="sign_in"
        isLoading={isLoadingSocialAuth}
        pendingProviderId={pendingSocialProviderId}
        providers={socialAuthProviders}
        showDivider={false}
        onStart={onSocialStart}
      />
      <p className="text-sm leading-6 text-hypo-text-muted">처음 로그인하면 역할을 고르고 이어집니다.</p>
    </div>
  );
}
