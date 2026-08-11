import * as AppleAuthentication from "expo-apple-authentication";
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

const buttonStyles: Record<Exclude<SocialAuthProvider, "apple">, { background: string; border: string; text: string }> = {
  google: {
    background: "#FFFFFF",
    border: "#747775",
    text: "#1F1F1F",
  },
  kakao: {
    background: "#FEE500",
    border: "#FEE500",
    text: "#191600",
  },
  naver: {
    background: "#03A94D",
    border: "#03A94D",
    text: "#FFFFFF",
  },
};

const providerButtonLabels: Record<Exclude<SocialAuthProvider, "apple">, string> = {
  google: "Google로 계속하기",
  kakao: "카카오로 계속하기",
  naver: "네이버로 로그인",
};

const providerIconSources = {
  google: Platform.select({
    ios: require("../../../../assets/social-auth/google-ios.png"),
    default: require("../../../../assets/social-auth/google-android.png"),
  }),
  kakao: require("../../../../assets/social-auth/kakao.png"),
  naver: require("../../../../assets/social-auth/naver.png"),
} as const;

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
    <View className="gap-3 pt-1">
      {showDivider ? (
        <View className="flex-row items-center gap-3">
          <View className="h-px flex-1 bg-[#E7E3D9]" />
          <Text className="text-[12px] font-bold text-hypo-muted">또는</Text>
          <View className="h-px flex-1 bg-[#E7E3D9]" />
        </View>
      ) : null}
      {providers.length ? (
        <View className="gap-2">
          {providers.map((provider) =>
            provider === "apple" ? (
              <AppleButton
                key={provider}
                busy={busyProvider === provider}
                disabled={isBusy}
                onPress={() => onPress(provider)}
              />
            ) : (
              <BrandButton
                key={provider}
                busy={busyProvider === provider}
                disabled={isBusy}
                provider={provider}
                onPress={() => onPress(provider)}
              />
            ),
          )}
        </View>
      ) : null}
      {errorMessage ? (
        <View className="rounded-[14px] bg-hypo-dangerSoft px-3 py-2.5">
          <Text className="text-[13px] font-bold leading-[19px] text-hypo-danger">{errorMessage}</Text>
          {errorCode ? (
            <Text className="mt-1 text-[11px] font-bold leading-4 text-hypo-danger/70">
              진단 코드: {errorCode}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function AppleButton({
  busy,
  disabled,
  onPress,
}: {
  busy: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View className="relative h-[52px] overflow-hidden rounded-[12px]" style={{ opacity: disabled && !busy ? 0.48 : 1 }}>
      <AppleAuthentication.AppleAuthenticationButton
        accessibilityLabel="Apple로 계속하기"
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        cornerRadius={12}
        onPress={onPress}
        style={{ height: 52, width: "100%" }}
      />
      {busy ? (
        <View className="absolute inset-0 flex-row items-center justify-center gap-2 bg-black/25">
          <ActivityIndicator color="#FFFFFF" />
          <Text className="text-[13px] font-bold text-white">확인하는 중</Text>
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
  provider: Exclude<SocialAuthProvider, "apple">;
}) {
  const style = buttonStyles[provider];
  const iconSize = provider === "google" ? 40 : provider === "kakao" ? 45 : 44;
  const iconLeft = provider === "google" ? (Platform.OS === "ios" ? 16 : 12) : provider === "kakao" ? 2 : 4;

  return (
    <Pressable
      accessibilityLabel={providerButtonLabels[provider]}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className="h-[52px] items-center justify-center rounded-[12px] border px-14"
      style={({ pressed }) => ({
        backgroundColor: style.background,
        borderColor: style.border,
        opacity: disabled ? 0.48 : pressed ? 0.84 : 1,
      })}
    >
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={providerIconSources[provider]}
        style={{
          height: iconSize,
          left: iconLeft,
          position: "absolute",
          width: iconSize,
        }}
      />
      <Text
        className="text-center text-[14px] leading-5"
        numberOfLines={1}
        style={{
          color: style.text,
          fontFamily: Platform.select({ ios: "System", android: "sans-serif-medium" }),
          fontWeight: "600",
        }}
      >
        {busy ? "확인하는 중" : providerButtonLabels[provider]}
      </Text>
    </Pressable>
  );
}
