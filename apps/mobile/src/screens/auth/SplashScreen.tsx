import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/features/auth/AuthProvider";
import { addAppBreadcrumb, captureAppError, getAppDiagnostics } from "@/shared/diagnostics/sentry";

const minimumSplashMs = 1350;
const splashWatchdogMs = 10_000;

export function SplashScreen() {
  const auth = useAuth();
  const router = useRouter();
  const [canLeaveSplash, setCanLeaveSplash] = useState(false);
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
    if (auth.isLoading || auth.isSyncing || !canLeaveSplash) return;

    const nextRoute = auth.requiresRoleOnboarding
      ? "/(auth)/sign-up-role"
      : auth.appUser
        ? "/(tabs)/interviews"
        : "/(auth)/login";
    addAppBreadcrumb("splash_ready_to_leave", {
      has_app_user: Boolean(auth.appUser),
      has_session: Boolean(auth.session),
      nextRoute,
    });

    addAppBreadcrumb("splash_redirect", { nextRoute });
    router.replace(nextRoute);
  }, [
    auth.appUser,
    auth.isLoading,
    auth.isSyncing,
    auth.requiresRoleOnboarding,
    auth.session,
    canLeaveSplash,
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
          ? "/(tabs)/interviews"
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

  return (
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: "#58C96B" }}>
      <StatusBar style="dark" />
      <Text className="text-[38px] text-hypo-brand-strong" style={{ fontFamily: "HypofitSansBold" }}>
        Hypofit
      </Text>
    </View>
  );
}
