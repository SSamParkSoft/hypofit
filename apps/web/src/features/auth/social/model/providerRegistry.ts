export type SocialProviderId = "apple" | "google" | "kakao" | "naver";

export type SocialProviderIdentifier =
  | "apple"
  | "google"
  | "kakao"
  | "custom:naver";

export interface SocialProviderDefinition {
  actionLabel: string;
  authProvider: SocialProviderIdentifier;
  buttonClassName: string;
  iconClassName: string;
  iconPath: string;
  id: SocialProviderId;
  label: string;
}

export const SOCIAL_PROVIDER_ORDER = ["apple", "google", "kakao", "naver"] as const satisfies ReadonlyArray<
  SocialProviderId
>;

export const PUBLIC_WEB_SOCIAL_AUTH_PROVIDER_ORDER = [
  "kakao",
  "apple",
  "google",
  "naver",
] as const satisfies ReadonlyArray<SocialProviderId>;

export const SOCIAL_PROVIDER_REGISTRY: Record<SocialProviderId, SocialProviderDefinition> = {
  apple: {
    actionLabel: "Apple로 계속하기",
    authProvider: "apple",
    buttonClassName:
      "border-[#111111] bg-[#111111] text-white hover:bg-black focus-visible:ring-black/15",
    iconClassName: "left-1 size-11",
    iconPath: "/social-auth/apple.png",
    id: "apple",
    label: "Apple",
  },
  google: {
    actionLabel: "Google로 계속하기",
    authProvider: "google",
    buttonClassName:
      "border-[#747775] bg-white text-[#1F1F1F] hover:bg-[#F8F9FA] focus-visible:ring-[#4285F4]/15",
    iconClassName: "left-3 size-10",
    iconPath: "/social-auth/google.png",
    id: "google",
    label: "Google",
  },
  kakao: {
    actionLabel: "카카오 로그인",
    authProvider: "kakao",
    buttonClassName:
      "border-[#FEE500] bg-[#FEE500] text-black/85 hover:bg-[#F8DF00] focus-visible:ring-[#FEE500]/25",
    iconClassName: "left-0.5 size-[45px]",
    iconPath: "/social-auth/kakao.png",
    id: "kakao",
    label: "카카오",
  },
  naver: {
    actionLabel: "네이버로 로그인",
    authProvider: "custom:naver",
    buttonClassName:
      "border-[#03A94D] bg-[#03A94D] text-white hover:bg-[#029943] focus-visible:ring-[#03A94D]/20",
    iconClassName: "left-1 size-11",
    iconPath: "/social-auth/naver.png",
    id: "naver",
    label: "네이버",
  },
};

export function getSocialProviderDefinition(provider: SocialProviderId) {
  return SOCIAL_PROVIDER_REGISTRY[provider];
}

export function getVisibleWebSocialProviders() {
  return [...PUBLIC_WEB_SOCIAL_AUTH_PROVIDER_ORDER];
}

export function getSocialProviderIdFromIdentifier(
  identifier: string | null | undefined,
): SocialProviderId | null {
  if (identifier === "apple" || identifier === "google" || identifier === "kakao") {
    return identifier;
  }

  if (identifier === "custom:naver" || identifier === "naver") {
    return "naver";
  }

  return null;
}

export function normalizeSocialProviderIdentifier(
  identifier: string | null | undefined,
): SocialProviderIdentifier | null {
  if (identifier === "apple" || identifier === "google" || identifier === "kakao") {
    return identifier;
  }

  if (identifier === "custom:naver" || identifier === "naver") {
    return "custom:naver";
  }

  return null;
}

export function sortBySocialProviderOrder<T extends { provider: SocialProviderId }>(items: T[]) {
  return [...items].sort(
    (left, right) =>
      SOCIAL_PROVIDER_ORDER.indexOf(left.provider) - SOCIAL_PROVIDER_ORDER.indexOf(right.provider),
  );
}
