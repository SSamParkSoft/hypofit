import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { AppUser, SyncMeInput, UpdateMeInput, UserRole } from "@hypofit/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/shared/api/client";
import { meApi } from "@/shared/api/me";
import {
  buildAuthFailure,
  captureAuthFailure,
  logAuthDiagnostic,
  normalizeAuthError,
  toUserFacingAuthError,
} from "@/features/auth/authErrors";
import { disableRegisteredPushDevice } from "@/features/push/pushNotifications";
import { clearPendingSocialAuthAttempt } from "@/features/auth/social/socialAuthService";
import { addAppBreadcrumb, captureAppError } from "@/shared/diagnostics/sentry";
import { getSupabaseClient, isSupabaseConfigured } from "@/shared/api/supabase";
import { clearAuthScopedQueries, resolveAuthUserId } from "@/shared/query/authQuery";

interface AuthContextValue {
  isConfigured: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  errorMessage: string | null;
  session: Session | null;
  user: User | null;
  appUser: AppUser | null;
  accessToken: string | null;
  requiresRoleOnboarding: boolean;
  completeOnboardingWithRole: (role: UserRole) => Promise<AppUser>;
  syncCurrentUser: (input: SyncMeInput) => Promise<AppUser>;
  updateCurrentUser: (input: UpdateMeInput) => Promise<AppUser>;
  signOut: () => Promise<void>;
  recoverStartupAuthTimeout: (reason: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const sessionRestoreTimeoutMs = 8_000;
const profileBootstrapTimeoutMs = 12_000;
const localSignOutTimeoutMs = 3_000;

class StartupTimeoutError extends Error {
  readonly phase: "session_restore" | "profile_bootstrap";

  constructor(phase: StartupTimeoutError["phase"], timeoutMs: number) {
    super(`${phase} timed out after ${timeoutMs}ms`);
    this.name = "StartupTimeoutError";
    this.phase = phase;
  }
}

interface StartupTimeoutInput {
  phase: StartupTimeoutError["phase"];
  timeoutMs: number;
}

function withStartupTimeout<T>(
  promise: Promise<T>,
  { phase, timeoutMs }: StartupTimeoutInput,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new StartupTimeoutError(phase, timeoutMs)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

function withLocalAuthCleanupTimeout<T>(promise: Promise<T>, timeoutMs = localSignOutTimeoutMs): Promise<T | null> {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<null>((resolve) => {
    timeout = setTimeout(() => resolve(null), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

function buildDefaultSyncInput(user: User): SyncMeInput {
  const metadata = user.user_metadata;
  const name =
    typeof metadata.name === "string" && metadata.name.trim()
      ? metadata.name.trim()
      : user.email?.split("@")[0] || "Hypofit user";

  const role = metadata.role === "founder" || metadata.role === "both" ? metadata.role : "respondent";
  const bio = typeof metadata.bio === "string" ? metadata.bio : null;
  const phone = typeof metadata.phone === "string" ? metadata.phone : null;

  return { name, bio, phone, role };
}

function hasUserMetadataRole(user: User | null | undefined) {
  const role = user?.user_metadata?.role;
  return role === "founder" || role === "respondent" || role === "both";
}

function isAccountInactiveError(error: unknown) {
  if (!(error instanceof ApiError)) {
    return false;
  }

  return (
    error.code === "account_inactive" ||
    error.code === "account_deleted" ||
    error.code === "account_deactivated" ||
    error.userMessage === "Account is inactive" ||
    error.debugMessage === "Account is inactive"
  );
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const configured = isSupabaseConfigured();
  const [isLoading, setIsLoading] = useState(configured);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [requiresRoleOnboarding, setRequiresRoleOnboarding] = useState(false);
  const previousAuthUserIdRef = useRef<string | null>(null);

  function resetAuthRuntimeState(message?: string | null) {
    setSession(null);
    setAppUser(null);
    setRequiresRoleOnboarding(false);
    setIsLoading(false);
    setIsSyncing(false);
    if (message !== undefined) {
      setErrorMessage(message);
    }
    void clearAuthScopedQueries(queryClient);
  }

  async function signOutLocalBestEffort(phase: string) {
    try {
      const result = await withLocalAuthCleanupTimeout(
        getSupabaseClient().auth.signOut({ scope: "local" }),
      );

      if (result === null) {
        addAppBreadcrumb("auth_local_signout_timeout", { phase });
        captureAppError(new Error("auth_local_signout_timeout"), {
          code: "auth_local_session_clear_failed",
          phase,
        });
        return;
      }

      if (result.error) {
        addAppBreadcrumb("auth_local_signout_error", { phase });
        captureAppError(result.error, {
          code: "auth_local_logout_failed",
          phase,
        });
      }
    } catch (signOutError) {
      addAppBreadcrumb("auth_local_signout_error", { phase });
      captureAppError(signOutError, {
        code: "auth_local_logout_failed",
        phase,
      });
    }
  }

  async function clearLocalAuthSession(
    phase: string,
    options: {
      accessToken?: string | null;
      message?: string | null;
      code?: string;
    } = {},
  ) {
    addAppBreadcrumb("auth_local_session_clear_start", {
      code: options.code ?? null,
      phase,
    });

    if (options.accessToken) {
      try {
        await disableRegisteredPushDevice(options.accessToken);
      } catch (pushError) {
        captureAppError(pushError, {
          code: "push_device_disable_failed",
          phase: `${phase}_disable_push_device`,
        });
      }
    }

    await clearPendingSocialAuthAttempt();
    await signOutLocalBestEffort(phase);
    resetAuthRuntimeState(options.message ?? null);

    addAppBreadcrumb("auth_local_session_clear_done", {
      code: options.code ?? null,
      phase,
    });
  }

  async function clearInactiveAccountSession(phase: string, accessToken?: string | null) {
    addAppBreadcrumb("auth_account_inactive_session_clear", { phase });
    await clearLocalAuthSession(`auth_account_inactive_${phase}`, {
      accessToken,
      code: "auth_account_inactive",
      message: "삭제되었거나 비활성화된 계정이에요. 다시 이용하려면 회원가입을 진행해 주세요.",
    });
  }

  async function clearStartupSessionAfterProfileFailure(
    phase: "profile_bootstrap" | "signin",
    error: unknown,
    accessToken?: string | null,
  ) {
    const normalized = normalizeAuthError(error, phase);
    const shouldSignOut =
      normalized.code === "auth_token_expired" ||
      normalized.code === "auth_invalid_token" ||
      (error instanceof ApiError && error.status === 401);

    if (shouldSignOut) {
      addAppBreadcrumb("auth_session_revoked", {
        code: normalized.code,
        phase,
        provider_status: normalized.providerStatus,
      });
    }

    if (error instanceof ApiError && error.status === 401) {
      captureAppError(error, {
        code: "profile_bootstrap_auth_rejected",
        phase,
        status: error.status,
      });
    }

    addAppBreadcrumb("auth_profile_bootstrap_safe_fallback", {
      code: normalized.code,
      phase,
      provider_status: normalized.providerStatus,
      sign_out: shouldSignOut,
    });
    captureAuthFailure(normalized);

    if (shouldSignOut) {
      await clearLocalAuthSession(`auth_profile_bootstrap_safe_fallback_${phase}`, {
        accessToken,
        code: normalized.code,
        message: normalized.userMessage,
      });
      return;
    }

    resetAuthRuntimeState(normalized.userMessage);
  }

  useEffect(() => {
    addAppBreadcrumb("auth_provider_session_effect_start", { configured });

    if (!configured) {
      addAppBreadcrumb("auth_provider_supabase_not_configured");
      setIsLoading(false);
      return;
    }

    let supabase: ReturnType<typeof getSupabaseClient>;

    try {
      supabase = getSupabaseClient();
    } catch (error) {
      captureAppError(error, { phase: "auth_provider_create_supabase_client" });
      setErrorMessage(error instanceof Error ? error.message : "로그인 설정을 확인하지 못했습니다.");
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    addAppBreadcrumb("auth_provider_get_session_start");

    withStartupTimeout(supabase.auth.getSession(), {
      phase: "session_restore",
      timeoutMs: sessionRestoreTimeoutMs,
    })
      .then(({ data }) => {
        if (isMounted) {
          addAppBreadcrumb("auth_provider_get_session_done", { hasSession: Boolean(data.session) });
          setSession(data.session);
        }
      })
      .catch(async (error) => {
        if (error instanceof StartupTimeoutError) {
          addAppBreadcrumb("auth_provider_get_session_timeout");
          captureAppError(error, {
            code: "auth_session_restore_timeout",
            phase: "session_restore",
          });
          if (isMounted) {
            await clearLocalAuthSession("auth_provider_get_session_timeout", {
              code: "auth_session_restore_timeout",
              message: "로그인 정보를 다시 확인해 주세요.",
            });
          }
          return;
        }

        addAppBreadcrumb("auth_provider_get_session_error");
        captureAppError(error, {
          code: "auth_session_restore_failed",
          phase: "auth_provider_get_session",
        });
        if (isMounted) {
          await clearLocalAuthSession("auth_provider_get_session_error", {
            code: "auth_session_restore_failed",
            message: "로그인 정보를 다시 확인해 주세요.",
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          addAppBreadcrumb("auth_provider_loading_done");
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      addAppBreadcrumb("auth_provider_auth_state_change", {
        event: _event,
        hasSession: Boolean(nextSession),
      });
      setSession(nextSession);
      setAppUser((current) => {
        if (!nextSession) {
          return null;
        }

        return current?.id === nextSession.user.id ? current : null;
      });
      if (!nextSession) {
        setAppUser(null);
        setRequiresRoleOnboarding(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    const currentAuthUserId = resolveAuthUserId(appUser?.id, session?.user.id);
    const previousAuthUserId = previousAuthUserIdRef.current;

    if (previousAuthUserId && previousAuthUserId !== currentAuthUserId) {
      void clearAuthScopedQueries(queryClient);
    } else if (!currentAuthUserId && previousAuthUserId) {
      void clearAuthScopedQueries(queryClient);
    }

    previousAuthUserIdRef.current = currentAuthUserId;
  }, [appUser?.id, queryClient, session?.user.id]);

  useEffect(() => {
    if (!configured || !session?.user || appUser?.id === session.user.id || requiresRoleOnboarding) {
      return;
    }

    let isMounted = true;
    const token = session.access_token;
    const user = session.user;

    setIsSyncing(true);
    setErrorMessage(null);
    addAppBreadcrumb("auth_provider_app_user_sync_start");

    const bootstrapProfile = meApi
      .get(token)
      .catch(async (error) => {
        if (error instanceof ApiError && error.status === 403) {
          if (
            error.code === "account_inactive" ||
            error.code === "account_deleted" ||
            error.code === "account_deactivated"
          ) {
            throw error;
          }

          if (error.code === "role_onboarding_required" || !hasUserMetadataRole(user)) {
            addAppBreadcrumb("auth_provider_app_user_needs_role_onboarding");
            if (isMounted) {
              setIsSyncing(false);
              setRequiresRoleOnboarding(true);
            }
            return null;
          }

          addAppBreadcrumb("auth_provider_app_user_sync_create");
          return meApi.sync(buildDefaultSyncInput(user), token);
        }

        throw error;
      });

    void withStartupTimeout(bootstrapProfile, {
      phase: "profile_bootstrap",
      timeoutMs: profileBootstrapTimeoutMs,
    })
      .then((loadedUser) => {
        if (isMounted) {
          if (loadedUser) {
            addAppBreadcrumb("auth_provider_app_user_sync_done");
            setAppUser(loadedUser);
            setRequiresRoleOnboarding(false);
          }
        }
      })
      .catch(async (error) => {
        if (isAccountInactiveError(error)) {
          void clearInactiveAccountSession("auth_provider_app_user_sync", token);
          return;
        }

        if (error instanceof StartupTimeoutError) {
          addAppBreadcrumb("auth_provider_app_user_sync_timeout");
          captureAppError(error, {
            code: "auth_profile_sync_failed",
            has_session: Boolean(session),
            phase: "profile_bootstrap",
          });
          if (isMounted) {
            await clearLocalAuthSession("auth_provider_app_user_sync_timeout", {
              accessToken: token,
              code: "auth_profile_bootstrap_timeout",
              message: "로그인 정보를 다시 확인해 주세요.",
            });
          }
          return;
        }

        await clearStartupSessionAfterProfileFailure("profile_bootstrap", error, token);
        captureAppError(error, {
          code: normalizeAuthError(error, "profile_bootstrap").code,
          phase: "auth_provider_app_user_sync",
          status: error instanceof ApiError ? error.status : null,
        });
        if (isMounted) {
          setSession(null);
          setAppUser(null);
          setRequiresRoleOnboarding(false);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsSyncing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [appUser?.id, configured, requiresRoleOnboarding, session?.access_token, session?.user]);

  async function syncOnboardingProfile(input: SyncMeInput, accessToken: string) {
    addAppBreadcrumb("auth_onboarding_api_sync_start");
    logAuthDiagnostic("auth_onboarding_api_sync_start");

    try {
      return await meApi.sync(input, accessToken);
    } catch (error) {
      const normalized = normalizeAuthError(error, "onboarding_profile_sync");

      if (normalized.code === "auth_account_inactive") {
        await clearInactiveAccountSession("onboarding_profile_sync", accessToken);
      }

      captureAppError(error, {
        api_code: error instanceof ApiError ? error.code : null,
        code: normalized.code,
        phase: "onboarding_profile_sync",
        request_id: error instanceof ApiError ? error.requestId : null,
        status: error instanceof ApiError ? error.status : null,
      });
      addAppBreadcrumb("auth_onboarding_api_sync_error", {
        code: normalized.code,
        status: error instanceof ApiError ? error.status : null,
      });
      logAuthDiagnostic("auth_onboarding_api_sync_error", {
        code: normalized.code,
        status: error instanceof ApiError ? error.status : null,
      });
      throw toUserFacingAuthError(normalized);
    }
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: configured,
      isLoading,
      isSyncing,
      errorMessage,
      session,
      user: session?.user ?? null,
      appUser,
      accessToken: session?.access_token ?? null,
      requiresRoleOnboarding,
      async completeOnboardingWithRole(role) {
        const token = session?.access_token;
        const user = session?.user;

        if (!token || !user) {
          throw toUserFacingAuthError(
            buildAuthFailure({
              code: "auth_session_restore_failed",
              phase: "onboarding",
              providerName: "local_onboarding_session",
              supportMessage: "missing_onboarding_session",
              userMessage: "로그인을 먼저 완료해 주세요.",
            }),
          );
        }

        const defaultInput = buildDefaultSyncInput(user);
        const syncedUser = await syncOnboardingProfile(
          {
            ...defaultInput,
            role,
          },
          token,
        );

        setAppUser(syncedUser);
        setRequiresRoleOnboarding(false);

        return syncedUser;
      },
      async signOut() {
        const token = session?.access_token ?? null;
        addAppBreadcrumb("auth_local_logout_start");
        await clearLocalAuthSession("auth_user_logout", {
          accessToken: token,
          code: "auth_local_logout",
          message: null,
        });
        addAppBreadcrumb("auth_local_logout_done");
      },
      async recoverStartupAuthTimeout(reason) {
        addAppBreadcrumb("auth_startup_timeout_recovery_start", { reason });
        captureAppError(new Error("startup_auth_wait_timeout"), {
          code: "startup_auth_wait_timeout",
          phase: "startup_auth",
          reason,
        });
        await clearLocalAuthSession("auth_startup_timeout_recovery", {
          code: "startup_auth_wait_timeout",
          message: "로그인 정보를 다시 확인해 주세요.",
        });
      },
      async syncCurrentUser(input) {
        const token = session?.access_token;
        if (!token) {
          throw new Error("로그인이 필요합니다.");
        }

        setIsSyncing(true);
        setErrorMessage(null);

        try {
          const syncedUser = await meApi.sync(input, token);
          setAppUser(syncedUser);
          return syncedUser;
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "사용자 동기화에 실패했습니다.");
          throw error;
        } finally {
          setIsSyncing(false);
        }
      },
      async updateCurrentUser(input) {
        const token = session?.access_token;
        if (!token) {
          throw new Error("로그인이 필요합니다.");
        }

        setIsSyncing(true);
        setErrorMessage(null);

        try {
          const updatedUser = await meApi.update(input, token);
          setAppUser(updatedUser);
          return updatedUser;
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : "계정 정보를 저장하지 못했습니다.");
          throw error;
        } finally {
          setIsSyncing(false);
        }
      },
    }),
    [
      appUser,
      configured,
      errorMessage,
      isLoading,
      isSyncing,
      requiresRoleOnboarding,
      session,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return value;
}
