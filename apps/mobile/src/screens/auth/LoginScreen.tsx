import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { SocialAuthSection } from "@/features/auth/social/SocialAuthSection";
import { useSocialAuth } from "@/features/auth/social/useSocialAuth";
import { getSafeReturnTo } from "@/shared/navigation/backNavigation";

export function LoginScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
  const params = useLocalSearchParams<{ returnTo?: string | string[]; toast?: string | string[] }>();
  const [visibleToast, setVisibleToast] = useState<"account_deleted" | null>(null);
  const socialAuth = useSocialAuth();
  const isCompactHeight = height < 700;

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
      <SafeAreaView className="flex-1 bg-hypo-bg">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <ScrollView
            alwaysBounceVertical={false}
            contentContainerClassName="flex-grow px-6 pb-6"
            contentContainerStyle={{ paddingTop: isCompactHeight ? 32 : 72 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="mx-auto w-full max-w-[420px]">
              <View className="items-center">
                <View className="size-[90px] items-center justify-center">
                  <BrandMark />
                </View>
                <Text
                  className="mt-[14px] text-center text-[32px] leading-[39px] text-[#0F7A4D]"
                  style={{ fontFamily: "HypofitSansBold" }}
                >
                  Hypofit
                </Text>
                <Text
                  className="mt-[18px] text-center text-[15px] leading-[22px] text-hypo-muted"
                  style={{ fontFamily: "HypofitSansMedium" }}
                >
                  모집도 참여도, 더 간단하게
                </Text>
              </View>

              <View className={isCompactHeight ? "mt-8" : "mt-12"}>
                <SocialAuthSection
                  busyProvider={socialAuth.busyProvider}
                  errorCode={socialAuth.errorCode}
                  errorMessage={socialAuth.errorMessage}
                  isBusy={socialAuth.isBusy}
                  providers={socialAuth.providers}
                  showDivider={false}
                  onPress={(provider) => void socialAuth.start(provider, getSafeReturnPath(params.returnTo))}
                />
              </View>

              <View className="mt-6 items-center px-2">
                <View className="flex-row items-center justify-center">
                  <LegalLink label="이용약관" onPress={() => router.push(buildLegalHref("/legal/terms"))} />
                  <Text className="px-1.5 text-[12px] text-hypo-muted">·</Text>
                  <LegalLink label="개인정보처리방침" onPress={() => router.push(buildLegalHref("/legal/privacy"))} />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      {visibleToast === "account_deleted" ? <LoginToast /> : null}
    </>
  );
}

function BrandMark() {
  return (
    <Image
      accessibilityElementsHidden
      accessibilityIgnoresInvertColors
      importantForAccessibility="no-hide-descendants"
      className="size-[90px]"
      resizeMode="contain"
      source={require("../../../assets/hypofit-mark.png")}
    />
  );
}

function LegalLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="link" hitSlop={10} onPress={onPress}>
      <Text className="text-[12px] text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>
        {label}
      </Text>
    </Pressable>
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

function buildLegalHref(pathname: "/legal/terms" | "/legal/privacy"): Href {
  return `${pathname}?returnTo=${encodeURIComponent("/(auth)/login")}` as Href;
}
