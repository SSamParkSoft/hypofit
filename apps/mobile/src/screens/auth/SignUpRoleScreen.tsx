import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { getAuthDiagnosticCode, getAuthErrorMessage } from "@/features/auth/authErrors";
import { useAuth } from "@/features/auth/AuthProvider";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";
import { getSafeReturnTo } from "@/shared/navigation/backNavigation";
import { AuthScreenFrame } from "./AuthScreenFrame";

export function SignUpRoleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const auth = useAuth();
  const [hasConfirmedAge, setHasConfirmedAge] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const termsHref = buildLegalHref("/legal/terms");
  const privacyHref = buildLegalHref("/legal/privacy");

  async function handleSubmit() {
    if (!auth.isConfigured) {
      setErrorMessage("Supabase 설정이 필요해요.");
      setErrorCode("auth_supabase_unexpected");
      return;
    }

    if (!hasConfirmedAge) {
      setErrorMessage("만 19세 이상만 가입할 수 있어요.");
      setErrorCode("auth_validation_failed");
      return;
    }

    setErrorCode(null);
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await auth.completeOnboardingWithRole("both");
      router.replace(getSafeReturnTo(params.returnTo) ?? "/(tabs)/home?welcome=1");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, "동의 내용을 저장하지 못했어요. 다시 시도해 주세요."));
      setErrorCode(getAuthDiagnosticCode(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreenFrame
      eyebrow="참여자 모집과 연결"
      title="Hypofit"
      description=""
      cardTitle="약관을 확인하고 시작할까요?"
      cardDescription="동의를 마치면 모집과 참여를 모두 바로 사용할 수 있어요."
      onBack={auth.session ? undefined : () => router.back()}
    >
      <View className="gap-4">
        <View className="rounded-[18px] border border-hypo-border bg-hypo-surface px-4 py-4">
          <Text className="text-[15px] font-black text-hypo-text">한 계정으로 모집과 참여를 함께 사용할 수 있어요.</Text>
          <Text className="mt-1.5 text-[13px] leading-[20px] text-hypo-text-muted">
            역할을 따로 고르지 않고, 약관 동의만 마치면 바로 시작돼요.
          </Text>
        </View>
        <View className="flex-row items-start gap-3 rounded-[14px] border border-hypo-border bg-hypo-surface px-3.5 py-3">
          <Pressable
            accessibilityLabel="만 19세 이상 및 약관 동의"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: hasConfirmedAge }}
            hitSlop={10}
            onPress={() => {
              setHasConfirmedAge((current) => !current);
              setErrorCode(null);
              setErrorMessage(null);
            }}
          >
            <View
              className={`mt-0.5 size-5 items-center justify-center rounded-[6px] border ${
                hasConfirmedAge ? "border-hypo-brand bg-hypo-brand" : "border-hypo-border bg-hypo-bg"
              }`}
            >
              <Text className={`text-[12px] font-black leading-4 ${hasConfirmedAge ? "text-white" : "text-transparent"}`}>
                ✓
              </Text>
            </View>
          </Pressable>
          <Text
            className="min-w-0 flex-1 text-[12px] font-bold leading-[19px] text-hypo-text"
            onPress={() => {
              setHasConfirmedAge((current) => !current);
              setErrorCode(null);
              setErrorMessage(null);
            }}
          >
            만 19세 이상이며, Hypofit의{" "}
            <Text
              className="text-[12px] font-black leading-[19px] text-hypo-brand underline"
              onPress={() => router.push(termsHref)}
            >
              이용약관
            </Text>
            과{" "}
            <Text
              className="text-[12px] font-black leading-[19px] text-hypo-brand underline"
              onPress={() => router.push(privacyHref)}
            >
              개인정보처리방침
            </Text>
            을 확인하고 동의해요.
          </Text>
        </View>
        {errorMessage ? (
          <View className="rounded-[14px] bg-hypo-dangerSoft px-3 py-2.5">
            <Text className="text-[13px] font-bold leading-[19px] text-hypo-danger">
              {errorMessage}
            </Text>
            {errorCode ? (
              <Text className="mt-1 text-[11px] font-bold leading-4 text-hypo-danger/70">
                진단 코드: {errorCode}
              </Text>
            ) : null}
          </View>
        ) : null}
        <PrimaryButton disabled={isSubmitting || !hasConfirmedAge} onPress={handleSubmit}>
          {isSubmitting ? "확인하는 중" : "동의하고 시작하기"}
        </PrimaryButton>
      </View>
    </AuthScreenFrame>
  );
}

function buildLegalHref(pathname: "/legal/terms" | "/legal/privacy"): Href {
  return `${pathname}?returnTo=${encodeURIComponent("/(auth)/sign-up-role")}` as Href;
}
