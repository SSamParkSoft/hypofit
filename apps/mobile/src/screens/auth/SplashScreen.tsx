import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/features/auth/AuthProvider";
import { addAppBreadcrumb, captureAppError, getAppDiagnostics } from "@/shared/diagnostics/sentry";

const minimumSplashMs = 1350;
const splashWatchdogMs = 10_000;

export function SplashScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [canLeaveSplash, setCanLeaveSplash] = useState(false);
  const progress = useRef(new Animated.Value(0.08)).current;
  const didReportWatchdogRef = useRef(false);
  const authStateRef = useRef(auth);

  useEffect(() => {
    authStateRef.current = auth;
  }, [auth]);

  useEffect(() => {
    addAppBreadcrumb("splash_mount");
    const timer = setTimeout(() => setCanLeaveSplash(true), minimumSplashMs);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          duration: 820,
          easing: Easing.out(Easing.cubic),
          toValue: 0.78,
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          duration: 520,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0.9,
          useNativeDriver: false,
        }),
      ]),
      { iterations: 1 },
    ).start();
  }, [progress]);

  useEffect(() => {
    if (auth.isLoading || auth.isSyncing || !canLeaveSplash) return;

    const nextRoute = auth.requiresRoleOnboarding
      ? "/(auth)/sign-up-role"
      : auth.appUser
        ? "/(tabs)/home"
        : "/(auth)/login";
    addAppBreadcrumb("splash_ready_to_leave", {
      has_app_user: Boolean(auth.appUser),
      has_session: Boolean(auth.session),
      nextRoute,
    });

    Animated.timing(progress, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: false,
    }).start();

    addAppBreadcrumb("splash_redirect", { nextRoute });
    router.replace(nextRoute);
  }, [
    auth.appUser,
    auth.isLoading,
    auth.isSyncing,
    auth.requiresRoleOnboarding,
    auth.session,
    canLeaveSplash,
    progress,
    router,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentAuth = authStateRef.current;
      if (didReportWatchdogRef.current || (!currentAuth.isLoading && !currentAuth.isSyncing)) {
        return;
      }

      didReportWatchdogRef.current = true;
      const candidateRoute = currentAuth.requiresRoleOnboarding
        ? "/(auth)/sign-up-role"
        : currentAuth.appUser
          ? "/(tabs)/home"
          : "/(auth)/login";
      const diagnostics = getAppDiagnostics();

      addAppBreadcrumb("splash_wait_timeout", {
        candidate_route: candidateRoute,
        has_app_user: Boolean(currentAuth.appUser),
        has_session: Boolean(currentAuth.session),
        is_configured: currentAuth.isConfigured,
        is_loading: currentAuth.isLoading,
        is_syncing: currentAuth.isSyncing,
        requires_role_onboarding: currentAuth.requiresRoleOnboarding,
        ...diagnostics,
      });
      captureAppError(new Error("splash_wait_timeout"), {
        candidate_route: candidateRoute,
        code: "splash_wait_timeout",
        has_app_user: Boolean(currentAuth.appUser),
        has_session: Boolean(currentAuth.session),
        is_configured: currentAuth.isConfigured,
        is_loading: currentAuth.isLoading,
        is_syncing: currentAuth.isSyncing,
        phase: "startup_splash",
        requires_role_onboarding: currentAuth.requiresRoleOnboarding,
        ...diagnostics,
      });
      void currentAuth.recoverStartupAuthTimeout("splash_watchdog").finally(() => {
        router.replace("/(auth)/login");
      });
    }, minimumSplashMs + splashWatchdogMs);

    return () => clearTimeout(timer);
  }, [router]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <View className="flex-1 items-center justify-center bg-hypo-brand px-6 py-8">
      <View className="w-full max-w-[320px] items-center">
        <Image
          accessibilityIgnoresInvertColors
          accessibilityLabel="Hypofit"
          className="h-44 w-44"
          resizeMode="contain"
          source={require("../../../assets/hypofit-mark-inverse.png")}
        />
        <Text className="mt-5 text-[38px] font-black leading-[46px] text-white">Hypofit</Text>
        <Text className="mt-2 text-center text-sm font-bold text-white/75">고객 검증을 더 빠르게</Text>
        <View className="mt-8 h-1.5 w-28 overflow-hidden rounded-full bg-white/20">
          <Animated.View
            className="h-full rounded-full bg-white"
            style={{ width: progressWidth }}
          />
        </View>
      </View>
    </View>
  );
}
