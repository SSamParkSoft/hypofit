import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { SocialAuthSection } from "@/features/auth/social/SocialAuthSection";
import { useSocialAuth } from "@/features/auth/social/useSocialAuth";
import { getSafeReturnTo } from "@/shared/navigation/backNavigation";
import { AuthScreenFrame } from "./AuthScreenFrame";

export function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[]; toast?: string | string[] }>();
  const [visibleToast, setVisibleToast] = useState<"account_deleted" | null>(null);
  const socialAuth = useSocialAuth();
  const socialDescription =
    Platform.OS === "ios"
      ? "카카오, Apple, Google, 네이버 계정으로 간편하게 시작하세요."
      : "카카오, Google, 네이버 계정으로 간편하게 시작하세요.";

  useEffect(() => {
    if (params.toast !== "account_deleted") {
      return;
    }

    setVisibleToast("account_deleted");
    const timeout = setTimeout(() => {
      setVisibleToast(null);
      router.setParams({ toast: undefined });
    }, 2300);

    return () => clearTimeout(timeout);
  }, [params.toast, router]);

  return (
    <>
      <AuthScreenFrame
        eyebrow="검증 인터뷰 매칭"
        title="Hypofit"
        description=""
        cardTitle="소셜 계정으로 시작하세요"
        cardDescription={socialDescription}
      >
        <View className="gap-4">
          <SocialAuthSection
            busyProvider={socialAuth.busyProvider}
            errorCode={socialAuth.errorCode}
            errorMessage={socialAuth.errorMessage}
            isBusy={socialAuth.isBusy}
            providers={socialAuth.providers}
            showDivider={false}
            onPress={(provider) => void socialAuth.start(provider, getSafeReturnPath(params.returnTo))}
          />
          {!socialAuth.isLoadingProviders && !socialAuth.errorMessage && socialAuth.providers.length === 0 ? (
            <View className="rounded-[16px] border border-[#E2DFD6] bg-[#F8F6F0] px-4 py-4">
              <Text className="text-center text-[13px] leading-5 text-hypo-muted">
                지금 사용할 수 있는 로그인 방법을 준비하고 있어요.
              </Text>
            </View>
          ) : null}
          <View className="rounded-[16px] bg-hypo-brandSoft px-4 py-3">
            <Text className="text-[12px] leading-[18px] text-hypo-brand" style={{ fontFamily: "HypofitSansBold" }}>
              로그인 후 프로필과 역할, 약관 동의를 이어서 완료해요.
            </Text>
          </View>
        </View>
      </AuthScreenFrame>
      {visibleToast === "account_deleted" ? <LoginToast /> : null}
    </>
  );
}

function LoginToast() {
  return (
    <View pointerEvents="none" className="absolute inset-x-4 top-[42%] z-50 items-center">
      <View className="max-w-[300px] rounded-[18px] border border-hypo-border bg-white px-5 py-4 shadow-lg">
        <Text className="text-center text-[15px] font-black text-hypo-text">계정이 삭제됐어요</Text>
        <Text className="mt-1 text-center text-xs font-bold leading-[18px] text-hypo-muted">
          다시 이용하려면 새로 가입해 주세요.
        </Text>
      </View>
    </View>
  );
}

function getSafeReturnPath(returnTo?: string | string[]): Href {
  return getSafeReturnTo(returnTo) ?? "/(tabs)/home";
}
