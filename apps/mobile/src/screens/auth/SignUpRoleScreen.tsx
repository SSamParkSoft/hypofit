import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import type { UserRole } from "@hypofit/contracts";
import { getAuthDiagnosticCode, getAuthErrorMessage } from "@/features/auth/authErrors";
import { useAuth } from "@/features/auth/AuthProvider";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";
import { getSafeReturnTo } from "@/shared/navigation/backNavigation";
import { AuthScreenFrame } from "./AuthScreenFrame";

const roleOptions: Array<{ role: UserRole; title: string; description: string }> = [
  {
    role: "founder",
    title: "창업자",
    description: "고객 인터뷰를 모집하고 신청자를 선정해요.",
  },
  {
    role: "respondent",
    title: "인터뷰어",
    description: "내 경험에 맞는 인터뷰에 신청해요.",
  },
  {
    role: "both",
    title: "창업자 · 인터뷰어",
    description: "창업자와 인터뷰어 역할을 모두 사용할 수 있어요.",
  },
];

export function SignUpRoleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ returnTo?: string | string[] }>();
  const auth = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>("founder");
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
      await auth.completeOnboardingWithRole(selectedRole);
      router.replace(getSafeReturnTo(params.returnTo) ?? "/(tabs)/home?welcome=1");
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, "역할을 저장하지 못했어요. 다시 시도해 주세요."));
      setErrorCode(getAuthDiagnosticCode(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreenFrame
      eyebrow="검증 인터뷰 매칭"
      title="Hypofit"
      description=""
      cardTitle="어떤 역할로 시작할까요?"
      cardDescription="역할과 약관 동의를 마치면 바로 시작할 수 있어요."
      onBack={auth.session ? undefined : () => router.back()}
    >
      <View className="gap-4">
        <View className="gap-3">
          {roleOptions.map((option) => {
            const selected = option.role === selectedRole;

            return (
              <Pressable
                key={option.role}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                onPress={() => setSelectedRole(option.role)}
                className={`flex-row items-start gap-3 rounded-[18px] border px-4 py-4 ${
                  selected ? "border-hypo-brand bg-hypo-brandSoft" : "border-hypo-border bg-hypo-surface"
                }`}
              >
                <View
                  className={`mt-0.5 size-8 items-center justify-center rounded-full ${
                    selected ? "bg-hypo-brand" : "bg-hypo-bg"
                  }`}
                >
                  <Text className={`text-[14px] font-black ${selected ? "text-white" : "text-transparent"}`}>
                    ✓
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] font-black text-hypo-text">{option.title}</Text>
                  <Text className="mt-0.5 text-[13px] leading-[20px] text-hypo-text-muted">
                    {option.description}
                  </Text>
                </View>
                {selected ? (
                  <View className="rounded-full bg-hypo-surface px-2.5 py-1">
                    <Text className="text-[11px] font-black text-hypo-brand">선택됨</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
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
          {isSubmitting ? "저장하는 중" : "시작하기"}
        </PrimaryButton>
      </View>
    </AuthScreenFrame>
  );
}

function buildLegalHref(pathname: "/legal/terms" | "/legal/privacy"): Href {
  return `${pathname}?returnTo=${encodeURIComponent("/(auth)/sign-up-role")}` as Href;
}
