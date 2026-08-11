import { useQuery } from "@tanstack/react-query";

import {
  getSocialAuthCapabilities,
  type SocialAuthCapability,
} from "./api/socialAuthApi";
import {
  getSocialProviderDefinition,
  getVisibleWebSocialProviders,
} from "./model/providerRegistry";

export const socialAuthCapabilityQueryKeys = {
  list: ["social-auth-capabilities", "web"] as const,
} as const;

const visibleWebProviderCapabilities = getVisibleWebSocialProviders().map((provider) => {
  const definition = getSocialProviderDefinition(provider);

  return {
    disabledReason: null,
    enabled: true,
    provider,
    providerIdentifier: definition.authProvider,
    state: "available",
  } satisfies SocialAuthCapability;
});

export function useSocialAuthCapabilities() {
  return useQuery({
    queryFn: () => getSocialAuthCapabilities(),
    queryKey: socialAuthCapabilityQueryKeys.list,
    placeholderData: visibleWebProviderCapabilities,
    staleTime: 5 * 60_000,
  });
}
