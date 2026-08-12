import { useEffect, useState } from "react";

import type { UserRole } from "../../shared/api/types";
import { replacePath } from "../../shared/navigation/appNavigation";
import {
  AuthFooterLinks,
  AuthPublicSocialEntryStep,
  AuthRoleOnboardingStep,
} from "./AuthScreenSteps";
import {
  type AuthFeedback,
  getAuthFeedbackMessage,
  getPostAuthPath,
} from "./authScreenModel";
import { useSocialAuthEntry } from "./social/useSocialAuthEntry";
import { useAuth } from "./useAuth";

export function AuthScreen() {
  const { completeRoleOnboarding, requiresRoleOnboarding, session } = useAuth();
  const {
    feedback,
    hasAcceptedTerms,
    isSubmitting,
    role,
    setHasAcceptedTerms,
    setRole,
    submit,
  } = useRoleOnboardingController({
    completeRoleOnboarding,
    requiresRoleOnboarding,
    session,
  });
  const {
    feedback: socialAuthFeedback,
    pendingProviderId,
    providers: socialAuthProviders,
    startSocialAuth,
  } = useSocialAuthEntry();
  const isRoleOnboarding = requiresRoleOnboarding && Boolean(session?.user);
  const accountEmail = session?.user.email ?? "";
  const accountName =
    (typeof session?.user.user_metadata?.name === "string"
      ? session.user.user_metadata.name
      : "") ||
    accountEmail.split("@")[0] ||
    "Hypofit user";

  useEffect(() => {
    document.title = isRoleOnboarding ? "역할 선택 | Hypofit" : "로그인 | Hypofit";
  }, [isRoleOnboarding]);

  useEffect(() => {
    if (!isRoleOnboarding) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById("auth-role-founder")?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isRoleOnboarding]);

  return (
    <main className="min-h-dvh overflow-y-auto bg-hypo-bg text-hypo-text">
      <div className="mx-auto grid min-h-dvh w-full max-w-[480px] items-center px-4 pb-[calc(var(--app-safe-bottom)+1.5rem)] pt-[calc(var(--app-safe-top)+1.5rem)] sm:px-6 sm:py-10">
        <section className="mx-auto flex w-full max-w-[440px] flex-col">
          <a
            aria-label="Hypofit 처음으로"
            className="mb-6 inline-flex w-fit items-center gap-2.5 self-center rounded-hypo-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
            href="/"
          >
            <img
              alt=""
              aria-hidden="true"
              className="size-9 object-contain"
              src="/brand/hypofit-mark.svg"
            />
            <strong className="font-brand text-xl font-black text-hypo-text">Hypofit</strong>
          </a>

          <div className="sm:rounded-hypo-lg sm:border sm:border-hypo-border sm:bg-hypo-surface sm:p-7 sm:shadow-hypo-panel">
            <div className="auth-mode-panel grid gap-6">
              <div className="grid gap-2">
                <h1 className="text-[2rem] font-black leading-[1.2] text-hypo-text">
                  {isRoleOnboarding ? "역할을 골라 주세요" : "로그인"}
                </h1>
                <p className="text-sm leading-6 text-hypo-text-muted">
                  {isRoleOnboarding
                    ? "창업자와 인터뷰어 중 먼저 시작할 역할을 고르세요. 프로필에서 언제든 바꿀 수 있어요."
                    : "사용 중인 소셜 계정으로 바로 시작할 수 있어요."}
                </p>
              </div>

              {isRoleOnboarding ? (
                <form
                  className="grid gap-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void submit();
                  }}
                >
                  <AuthRoleOnboardingStep
                    accountEmail={accountEmail}
                    accountName={accountName}
                    feedback={feedback}
                    hasAcceptedTerms={hasAcceptedTerms}
                    isSubmitting={isSubmitting}
                    role={role}
                    submitLabel={isSubmitting ? "처리 중" : "시작하기"}
                    onAcceptedTermsChange={setHasAcceptedTerms}
                    onRoleChange={setRole}
                  />
                </form>
              ) : (
                <AuthPublicSocialEntryStep
                  feedback={socialAuthFeedback}
                  pendingSocialProviderId={pendingProviderId}
                  socialAuthProviders={socialAuthProviders}
                  onSocialStart={(providerId) => void startSocialAuth(providerId, "sign_in")}
                />
              )}
            </div>
          </div>

          {isRoleOnboarding ? null : <AuthFooterLinks />}
        </section>
      </div>
    </main>
  );
}

function useRoleOnboardingController({
  completeRoleOnboarding,
  requiresRoleOnboarding,
  session,
}: {
  completeRoleOnboarding: (input: { role: UserRole }) => Promise<unknown>;
  requiresRoleOnboarding: boolean;
  session:
    | {
        user?: {
          email?: string | null;
        };
      }
    | null;
}) {
  const [role, setRole] = useState<UserRole>("founder");
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback>(null);

  useEffect(() => {
    if (!requiresRoleOnboarding || !session?.user) {
      setRole("founder");
      setHasAcceptedTerms(false);
      setIsSubmitting(false);
      setFeedback(null);
    }
  }, [requiresRoleOnboarding, session?.user]);

  const submit = async () => {
    if (!hasAcceptedTerms) {
      setFeedback({
        tone: "error",
        message: "만 19세 이상이며 약관에 동의해야 가입할 수 있어요.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setFeedback(null);
      await completeRoleOnboarding({ role });
      replacePath(getPostAuthPath(), { intent: "auth" });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: getAuthFeedbackMessage(
          error,
          "로그인을 마무리하지 못했어요. 잠시 후 다시 시도해 주세요.",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    feedback,
    hasAcceptedTerms,
    isSubmitting,
    role,
    setHasAcceptedTerms: (value: boolean) => {
      setFeedback(null);
      setHasAcceptedTerms(value);
    },
    setRole: (value: UserRole) => {
      setFeedback(null);
      setRole(value);
    },
    submit,
  };
}
