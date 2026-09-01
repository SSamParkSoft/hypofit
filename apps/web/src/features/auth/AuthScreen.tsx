import { useEffect, useState } from "react";

import { replacePath } from "../../shared/navigation/appNavigation";
import {
  AuthFooterLinks,
  AuthPublicSocialEntryStep,
  AuthRoleOnboardingStep,
  AuthSessionContinuationStep,
} from "./AuthScreenSteps";
import {
  type AuthFeedback,
  getAuthFeedbackMessage,
  getPostAuthPath,
} from "./authScreenModel";
import { useSocialAuthEntry } from "./social/useSocialAuthEntry";
import { useAuth } from "./useAuth";

export function AuthScreen() {
  const { appUser, completeRoleOnboarding, requiresRoleOnboarding, session, signOut } = useAuth();
  const [sessionChoiceFeedback, setSessionChoiceFeedback] = useState<AuthFeedback>(null);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const {
    feedback,
    hasAcceptedTerms,
    isSubmitting,
    setHasAcceptedTerms,
    submit,
  } = useRoleOnboardingController({
    completeRoleOnboarding,
    requiresRoleOnboarding,
    session,
  });
  const {
    feedback: socialAuthFeedback,
    lastUsedProviderId,
    pendingProviderId,
    providers: socialAuthProviders,
    startSocialAuth,
  } = useSocialAuthEntry();
  const isRoleOnboarding = requiresRoleOnboarding && Boolean(session?.user);
  const isSessionContinuation = Boolean(session?.user) && !requiresRoleOnboarding;
  const accountEmail = appUser?.email ?? session?.user.email ?? "";
  const accountName =
    appUser?.name ||
    (typeof session?.user.user_metadata?.name === "string"
      ? session.user.user_metadata.name
      : "") ||
    accountEmail.split("@")[0] ||
    "Hypofit user";

  useEffect(() => {
    document.title = isRoleOnboarding
      ? "가입 완료 | Hypofit"
      : isSessionContinuation
        ? "계정 선택 | Hypofit"
        : "로그인 | Hypofit";
  }, [isRoleOnboarding, isSessionContinuation]);

  const handleUseOtherAccount = async () => {
    try {
      setIsSwitchingAccount(true);
      setSessionChoiceFeedback(null);
      await signOut();
    } catch {
      setSessionChoiceFeedback({
        message: "다른 계정으로 전환하지 못했어요. 다시 시도해 주세요.",
        tone: "error",
      });
      setIsSwitchingAccount(false);
    }
  };

  useEffect(() => {
    if (!isRoleOnboarding) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      document.getElementById("auth-legal-consent")?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isRoleOnboarding]);

  return (
    <main className="min-h-dvh overflow-y-auto bg-hypo-bg text-hypo-text">
      <div className="mx-auto grid min-h-dvh w-full max-w-[480px] items-center px-4 pb-[calc(var(--app-safe-bottom)+1.5rem)] pt-[calc(var(--app-safe-top)+1.5rem)] sm:px-6 sm:py-10">
        <section className="mx-auto flex w-full max-w-[440px] flex-col">
          <a
            aria-label="Hypofit 처음으로"
            className="mb-7 inline-flex w-fit items-center gap-3 self-center rounded-hypo-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
            href="/"
          >
            <img
              alt=""
              aria-hidden="true"
              className="size-12 object-contain"
              src="/brand/hypofit-mark.svg"
            />
            <strong className="font-brand text-2xl font-black text-hypo-text">Hypofit</strong>
          </a>

          <div className="sm:rounded-hypo-lg sm:border sm:border-hypo-border sm:bg-hypo-surface sm:p-7 sm:shadow-hypo-panel">
            <div className="auth-mode-panel grid gap-6">
              <div className="grid gap-2">
                <h1 className="text-[2rem] font-black leading-[1.2] text-hypo-text">
                  {isRoleOnboarding
                    ? "가입을 완료해 주세요"
                    : isSessionContinuation
                      ? "계정을 선택해 주세요"
                      : "로그인"}
                </h1>
                <p className="text-sm leading-6 text-hypo-text-muted">
                  {isRoleOnboarding
                    ? "만 19세 이상 여부와 약관 동의를 확인하면 바로 시작할 수 있어요."
                    : isSessionContinuation
                      ? "이 계정으로 계속하거나 다른 계정으로 로그인할 수 있어요."
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
                    submitLabel={isSubmitting ? "처리 중" : "시작하기"}
                    onAcceptedTermsChange={setHasAcceptedTerms}
                  />
                </form>
              ) : isSessionContinuation ? (
                <AuthSessionContinuationStep
                  accountEmail={accountEmail}
                  accountImageUrl={appUser?.profile_image_url}
                  accountName={accountName}
                  feedback={sessionChoiceFeedback}
                  isSwitchingAccount={isSwitchingAccount}
                  onContinue={() => replacePath("/app", { intent: "auth" })}
                  onUseOtherAccount={() => void handleUseOtherAccount()}
                />
              ) : (
                <AuthPublicSocialEntryStep
                  feedback={socialAuthFeedback}
                  lastUsedSocialProviderId={lastUsedProviderId}
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
  completeRoleOnboarding: (input: { role: "both" }) => Promise<unknown>;
  requiresRoleOnboarding: boolean;
  session:
    | {
        user?: {
          email?: string | null;
        };
      }
    | null;
}) {
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AuthFeedback>(null);

  useEffect(() => {
    if (!requiresRoleOnboarding || !session?.user) {
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
      await completeRoleOnboarding({ role: "both" });
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
    setHasAcceptedTerms: (value: boolean) => {
      setFeedback(null);
      setHasAcceptedTerms(value);
    },
    submit,
  };
}
