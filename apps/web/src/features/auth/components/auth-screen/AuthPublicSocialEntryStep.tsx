import type { AuthFeedback } from "../../authScreenModel";
import type {
  SocialProviderId,
  SocialProviderOption,
} from "../../social/model/providerRegistry";
import { SocialLoginButtons } from "../../social/ui/SocialLoginButtons";

interface AuthPublicSocialEntryStepProps {
  feedback: AuthFeedback;
  lastUsedSocialProviderId: SocialProviderId | null;
  pendingSocialProviderId: SocialProviderId | null;
  socialAuthProviders: SocialProviderOption[];
  onSocialStart: (providerId: SocialProviderId) => void;
}

export function AuthPublicSocialEntryStep({
  feedback,
  lastUsedSocialProviderId,
  pendingSocialProviderId,
  socialAuthProviders,
  onSocialStart,
}: AuthPublicSocialEntryStepProps) {
  return (
    <SocialLoginButtons
      feedback={feedback}
      intent="sign_in"
      lastUsedProviderId={lastUsedSocialProviderId}
      pendingProviderId={pendingSocialProviderId}
      providers={socialAuthProviders}
      showDivider={false}
      onStart={onSocialStart}
    />
  );
}
