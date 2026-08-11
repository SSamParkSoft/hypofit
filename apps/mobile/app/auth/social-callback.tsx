import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";
import {
  completeSocialAuthFromCallback,
  getSocialAuthDiagnosticCode,
  getSocialAuthErrorMessage,
  getUnsupportedSocialNextStepMessage,
  resolveSocialAuthRoute,
} from "@/features/auth/social/socialAuthService";

export default function SocialAuthCallbackRoute() {
  const auth = useAuth();
  const authRef = useRef(auth);
  authRef.current = auth;
  const router = useRouter();
  const currentUrl = Linking.useURL();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function handleCallback() {
      try {
        const url = currentUrl ?? (await Linking.getInitialURL()) ?? undefined;
        const response = await completeSocialAuthFromCallback(url);
        const nextRoute = resolveSocialAuthRoute(response);

        if (!nextRoute) {
          await authRef.current.signOut();
          if (isMounted) {
            setErrorMessage(getUnsupportedSocialNextStepMessage(response));
            setErrorCode("social_email_missing");
          }
          return;
        }

        router.replace(nextRoute);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        setErrorMessage(getSocialAuthErrorMessage(error, "로그인을 마무리하지 못했어요. 다시 시도해 주세요."));
        setErrorCode(getSocialAuthDiagnosticCode(error));
      }
    }

    void handleCallback();

    return () => {
      isMounted = false;
    };
  }, [currentUrl, router]);

  return (
    <View className="flex-1 items-center justify-center bg-hypo-bg px-6">
      {errorMessage ? (
        <View className="w-full max-w-[340px] gap-4">
          <View className="items-center gap-2">
            <Text className="text-center text-[18px] font-bold leading-[25px] text-hypo-text">
              로그인을 마무리해 주세요
            </Text>
            <Text className="text-center text-[14px] leading-[22px] text-hypo-muted">
              {errorMessage}
            </Text>
            {errorCode ? (
              <Text className="text-center text-[11px] font-bold leading-4 text-hypo-danger/70">
                진단 코드: {errorCode}
              </Text>
            ) : null}
          </View>
          <PrimaryButton onPress={() => router.replace("/(auth)/login")}>로그인 화면으로</PrimaryButton>
        </View>
      ) : (
        <View className="items-center gap-4">
          <ActivityIndicator color="#176B5D" />
          <Text className="text-center text-[14px] leading-[22px] text-hypo-muted">
            로그인 정보를 확인하고 있어요.
          </Text>
        </View>
      )}
    </View>
  );
}
