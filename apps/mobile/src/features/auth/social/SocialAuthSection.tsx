import { ActivityIndicator, Image, Platform, Pressable, Text, View } from "react-native";
import type { SocialAuthProvider } from "@hypofit/contracts";

interface SocialAuthSectionProps {
  busyProvider: SocialAuthProvider | null;
  errorCode: string | null;
  errorMessage: string | null;
  isBusy: boolean;
  showDivider?: boolean;
  providers: SocialAuthProvider[];
  onPress: (provider: SocialAuthProvider) => void;
}

const buttonStyles: Record<SocialAuthProvider, { text: string }> = {
  apple: {
    text: "#FFFFFF",
  },
  google: {
    text: "#1F1F1F",
  },
  kakao: {
    text: "#191600",
  },
  naver: {
    text: "#FFFFFF",
  },
};

const providerButtonClassNames: Record<SocialAuthProvider, string> = {
  apple: "h-[54px] items-center justify-center overflow-hidden rounded-[12px] border border-black bg-black px-14",
  google: "h-[54px] items-center justify-center rounded-[12px] border border-[#747775] bg-white px-14",
  kakao: "h-[54px] items-center justify-center rounded-[12px] border border-[#FEE500] bg-[#FEE500] px-14",
  naver: "h-[54px] items-center justify-center rounded-[12px] border border-[#03A94D] bg-[#03A94D] px-14",
};

const providerButtonLabels: Record<SocialAuthProvider, string> = {
  apple: "Apple로 로그인",
  google: "Google 로그인",
  kakao: "카카오 로그인",
  naver: "네이버 로그인",
};

const providerIconLayout: Record<
  Exclude<SocialAuthProvider, "naver">,
  { left: number; size: number; verticalOffset?: number }
> = {
  apple: { left: 4, size: 54, verticalOffset: 3 },
  google: { left: 20, size: 20 },
  // These official image canvases include their provider-colored background.
  // Size the canvas so the visible glyph remains comparable to the Google G.
  kakao: { left: 9, size: 42 },
};

const providerIconSources = {
  apple: require("../../../../assets/social-auth/apple-logo.png"),
  google: Platform.select({
    default: require("../../../../assets/social-auth/google.png"),
  }),
  kakao: require("../../../../assets/social-auth/kakao.png"),
} as const;

const naverLogoSource = require("../../../../assets/social-auth/naver-left-logo.png");

export function SocialAuthSection({
  busyProvider,
  errorCode,
  errorMessage,
  isBusy,
  showDivider = true,
  onPress,
  providers,
}: SocialAuthSectionProps) {
  if (!providers.length && !errorMessage) {
    return null;
  }

  return (
    <View className="gap-3">
      {showDivider ? (
        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-[#E7E3D9]" />
          <Text className="text-[12px] font-bold text-hypo-muted">또는</Text>
          <View className="h-px flex-1 bg-[#E7E3D9]" />
        </View>
      ) : null}
      {providers.length ? (
        <View className="gap-2.5">
          {providers.map((provider) => (
            <BrandButton
              key={provider}
              busy={busyProvider === provider}
              disabled={isBusy}
              provider={provider}
              onPress={() => onPress(provider)}
            />
          ))}
        </View>
      ) : null}
      {errorMessage ? (
        <View className="px-1 py-1">
          <Text className="text-[13px] leading-[19px] text-hypo-danger" style={{ fontFamily: "HypofitSansMedium" }}>
            {errorMessage}
          </Text>
          {errorCode ? (
            <Text className="mt-1 text-[11px] leading-4 text-hypo-danger/70" style={{ fontFamily: "HypofitSansMedium" }}>
              진단 코드: {errorCode}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function BrandButton({
  busy,
  disabled,
  onPress,
  provider,
}: {
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
  provider: SocialAuthProvider;
}) {
  const style = buttonStyles[provider];

  if (provider === "naver") {
    return (
      <Pressable
        accessibilityLabel={providerButtonLabels[provider]}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        className={providerButtonClassNames[provider]}
        style={({ pressed }) => ({
          opacity: disabled && !busy ? 0.48 : pressed ? 0.84 : 1,
        })}
      >
        {busy ? <LeadingSpinner color="#FFFFFF" left={20} /> : <NaverLogo />}
        <Text
          className="text-center text-[15px] leading-5 text-white"
          numberOfLines={1}
          style={{ fontFamily: Platform.select({ ios: "System", android: "sans-serif-medium" }), fontWeight: "600" }}
        >
          {providerButtonLabels[provider]}
        </Text>
      </Pressable>
    );
  }

  const icon = providerIconLayout[provider];

  return (
    <Pressable
      accessibilityLabel={providerButtonLabels[provider]}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={providerButtonClassNames[provider]}
      style={({ pressed }) => ({
        opacity: disabled && !busy ? 0.48 : pressed ? 0.84 : 1,
      })}
    >
      {busy ? <LeadingSpinner color={style.text} left={20} /> : <ProviderLogo icon={icon} provider={provider} />}
      <Text
        className="text-center text-[15px] leading-5"
        numberOfLines={1}
        style={{
          color: style.text,
          fontFamily: Platform.select({ ios: "System", android: "sans-serif-medium" }),
          fontWeight: "600",
        }}
      >
        {providerButtonLabels[provider]}
      </Text>
    </Pressable>
  );
}

function NaverLogo() {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={naverLogoSource}
      style={{ height: 54, left: 7, position: "absolute", width: 34 }}
    />
  );
}

function ProviderLogo({
  icon,
  provider,
}: {
  icon: { left: number; size: number; verticalOffset?: number };
  provider: Exclude<SocialAuthProvider, "naver">;
}) {
  return (
    <Image
      accessibilityIgnoresInvertColors
      resizeMode="contain"
      source={providerIconSources[provider]}
      style={{
        height: icon.size,
        left: icon.left,
        position: "absolute",
        ...(icon.verticalOffset ? { transform: [{ translateY: icon.verticalOffset }] } : {}),
        width: icon.size,
      }}
    />
  );
}

function LeadingSpinner({ color, left }: { color: string; left: number }) {
  return (
    <View pointerEvents="none" className="absolute inset-y-0 justify-center" style={{ left }}>
      <ActivityIndicator color={color} size="small" />
    </View>
  );
}
