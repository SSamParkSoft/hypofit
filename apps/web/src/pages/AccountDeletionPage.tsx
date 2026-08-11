import { CircleCheckBig, CircleX, LoaderCircle } from "lucide-react";
import { publicWebBaseUrl } from "@hypofit/contracts";

import { useAccountDeletionPageController } from "../features/account-deletion/model/useAccountDeletionPageController";
import {
  AccountDeletionInformation,
  AccountDeletionIntroduction,
  AccountDeletionPageHeader,
  AccountDeletionStepList,
} from "../features/account-deletion/ui/AccountDeletionShell";
import {
  AccountDeletionStateLinks,
  AccountDeletionStatePanel,
} from "../features/account-deletion/ui/AccountDeletionState";
import {
  AccountDeletionConfirmStep,
  AccountDeletionOtpStep,
  AccountDeletionRequestStep,
} from "../features/account-deletion/ui/AccountDeletionWorkflowSteps";
import { useRouteMetadata } from "../shared/navigation/useRouteMetadata";

export function AccountDeletionPage() {
  const controller = useAccountDeletionPageController();

  useRouteMetadata({
    canonical: `${publicWebBaseUrl}/account-deletion`,
    description: "Hypofit 계정과 연결된 개인정보 삭제를 요청할 수 있습니다.",
    robots: "noindex,follow",
  });

  const isInteractiveStep =
    controller.step === "request" ||
    controller.step === "otp" ||
    controller.step === "confirm";

  return (
    <main className="min-h-dvh bg-hypo-bg text-hypo-text">
      <AccountDeletionPageHeader />

      <div className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(var(--app-safe-bottom)+3rem)] pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:pb-24 lg:pt-16">
        <AccountDeletionIntroduction />
        <AccountDeletionStepList step={controller.step} />

        {controller.step === "verifying-link" ? (
          <AccountDeletionStatePanel
            icon={<LoaderCircle aria-hidden="true" className="animate-spin" size={28} />}
            title="삭제 링크를 확인하고 있어요"
            titleRef={controller.stateTitleRef}
          >
            잠시만 기다려 주세요. 확인이 끝나면 마지막 삭제 단계로 안내할게요.
          </AccountDeletionStatePanel>
        ) : null}

        {controller.step === "link-error" ? (
          <AccountDeletionStatePanel
            icon={<CircleX aria-hidden="true" size={28} />}
            title="인증 링크를 확인하지 못했어요"
            titleRef={controller.stateTitleRef}
            tone="danger"
          >
            {controller.feedback?.message ?? "링크가 만료됐거나 이미 처리됐을 수 있어요."}
            <AccountDeletionStateLinks showRestart />
          </AccountDeletionStatePanel>
        ) : null}

        {controller.step === "complete" ? (
          <AccountDeletionStatePanel
            icon={<CircleCheckBig aria-hidden="true" size={28} />}
            title={controller.completionTitle}
            titleRef={controller.stateTitleRef}
          >
            {controller.completionDescription}
            <AccountDeletionStateLinks />
          </AccountDeletionStatePanel>
        ) : null}

        {isInteractiveStep ? (
          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,680px)_minmax(280px,320px)] lg:items-start lg:justify-between lg:gap-16">
            <section className="min-w-0">
              {controller.step === "request" ? (
                <AccountDeletionRequestStep
                  email={controller.email}
                  feedback={controller.feedback}
                  isSubmitting={controller.requestState === "submitting"}
                  onEmailChange={controller.setEmail}
                  onSubmit={controller.handleRequestSubmit}
                />
              ) : null}

              {controller.step === "otp" ? (
                <AccountDeletionOtpStep
                  devVerificationCode={controller.devVerificationCode}
                  email={controller.email}
                  feedback={controller.feedback}
                  isResending={controller.isResending}
                  isSubmitting={controller.verifyState === "submitting"}
                  otp={controller.otp}
                  resendCooldown={controller.resendCooldown}
                  onOtpChange={controller.setOtp}
                  onResendCode={controller.handleResendCode}
                  onResetRequestFlow={controller.resetRequestFlow}
                  onSubmit={controller.handleVerifySubmit}
                />
              ) : null}

              {controller.step === "confirm" ? (
                <AccountDeletionConfirmStep
                  confirmButtonRef={controller.confirmButtonRef}
                  email={controller.email}
                  feedback={controller.feedback}
                  isConfirming={controller.confirmState === "submitting"}
                  isResending={controller.isResending}
                  resendCooldown={controller.resendCooldown}
                  onConfirmDeletion={controller.handleConfirmDeletion}
                  onResendCode={controller.handleResendCode}
                  onReturnToOtp={controller.returnToOtpStep}
                />
              ) : null}
            </section>

            <AccountDeletionInformation />
          </div>
        ) : null}
      </div>
    </main>
  );
}
