import type { FormEvent, ReactNode, RefObject } from "react";
import { ArrowRight, RotateCcw } from "lucide-react";

import { supportEmail } from "../../../shared/config/support";
import { Button } from "../../../shared/ui/button";
import { Field, TextInput } from "../../../shared/ui/field";
import {
  EMAIL_INPUT_ID,
  getResendButtonLabel,
  OTP_INPUT_ID,
  type Feedback,
} from "../model/accountDeletionFlow";
import {
  AccountDeletionDevVerificationCode,
  AccountDeletionInlineFeedback,
} from "./AccountDeletionState";

interface AccountDeletionRequestStepProps {
  email: string;
  feedback: Feedback;
  isSubmitting: boolean;
  onEmailChange: (nextEmail: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
}

export function AccountDeletionRequestStep({
  email,
  feedback,
  isSubmitting,
  onEmailChange,
  onSubmit,
}: AccountDeletionRequestStepProps) {
  return (
    <AccountDeletionStepCard
      description="Hypofit에 가입한 이메일로 인증번호 6자리를 보내요."
      title="삭제 확인 시작하기"
    >
      <AccountDeletionInlineFeedback feedback={feedback} />

      <form className="mt-6 grid gap-5" onSubmit={(event) => void onSubmit(event)}>
        <Field hint="가입할 때 사용한 이메일을 입력해 주세요." label="가입 이메일">
          <TextInput
            id={EMAIL_INPUT_ID}
            autoComplete="email"
            className="min-h-12"
            inputMode="email"
            placeholder="name@example.com"
            required
            type="email"
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
          />
        </Field>

        <Button
          className="w-full sm:w-auto"
          disabled={isSubmitting}
          size="lg"
          type="submit"
          variant="danger"
        >
          {isSubmitting ? "인증번호 보내는 중" : "인증번호 받기"}
        </Button>
      </form>

      <p className="mt-4 text-xs font-semibold leading-5 text-hypo-text-soft">
        인증번호 확인 뒤 마지막 삭제 버튼을 눌러야 계정 삭제가 진행돼요.
      </p>
      <div className="mt-6 border-t border-hypo-border pt-5 text-sm font-semibold leading-6 text-hypo-text-muted">
        인증 메일을 받을 수 없다면{" "}
        <a
          className="font-black text-hypo-brand underline-offset-4 hover:underline"
          href={`mailto:${supportEmail}`}
        >
          고객지원에 문의해 주세요
        </a>
        .
      </div>
    </AccountDeletionStepCard>
  );
}

interface AccountDeletionOtpStepProps {
  devVerificationCode: string | null;
  email: string;
  feedback: Feedback;
  isResending: boolean;
  isSubmitting: boolean;
  otp: string;
  resendCooldown: number;
  onOtpChange: (nextOtp: string) => void;
  onResendCode: () => Promise<void> | void;
  onResetRequestFlow: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;
}

export function AccountDeletionOtpStep({
  devVerificationCode,
  email,
  feedback,
  isResending,
  isSubmitting,
  otp,
  resendCooldown,
  onOtpChange,
  onResendCode,
  onResetRequestFlow,
  onSubmit,
}: AccountDeletionOtpStepProps) {
  const resendDisabled = isResending || resendCooldown > 0;

  return (
    <AccountDeletionStepCard
      description="메일로 받은 숫자 6자리를 확인해 주세요."
      title="인증번호 입력"
    >
      <div className="mt-5 grid gap-1 rounded-hypo-lg bg-hypo-brand-soft/45 px-4 py-3">
        <span className="text-xs font-bold text-hypo-text-soft">인증번호를 보낸 이메일</span>
        <strong className="break-all text-sm font-black text-hypo-text">{email}</strong>
      </div>

      <AccountDeletionInlineFeedback feedback={feedback} />

      <form className="mt-6 grid gap-5" onSubmit={(event) => void onSubmit(event)}>
        <Field label="인증번호" hint="메일로 받은 숫자 6자리를 입력해 주세요.">
          <TextInput
            id={OTP_INPUT_ID}
            aria-label="인증번호"
            autoComplete="one-time-code"
            className="min-h-12 text-center text-lg font-black"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]{6}"
            required
            value={otp}
            onChange={(event) => onOtpChange(event.target.value)}
          />
        </Field>

        <AccountDeletionDevVerificationCode code={devVerificationCode} />

        <div className="flex flex-wrap gap-3">
          <Button
            className="w-full sm:w-auto"
            disabled={isSubmitting}
            size="lg"
            type="submit"
            variant="danger"
          >
            {isSubmitting ? "인증 확인 중" : "인증번호 확인하기"}
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={resendDisabled}
            size="lg"
            type="button"
            variant="secondary"
            onClick={() => void onResendCode()}
          >
            {getResendButtonLabel({ isResending, resendCooldown })}
          </Button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          className="font-bold text-hypo-text-muted underline-offset-4 hover:text-hypo-text hover:underline focus:outline-none focus:ring-[3px] focus:ring-hypo-brand/15"
          type="button"
          onClick={onResetRequestFlow}
        >
          다른 이메일 사용
        </button>
        <a
          className="font-bold text-hypo-brand underline-offset-4 hover:underline focus:outline-none focus:ring-[3px] focus:ring-hypo-brand/15"
          href={`mailto:${supportEmail}`}
        >
          메일이 오지 않으면 고객지원 문의
        </a>
      </div>
    </AccountDeletionStepCard>
  );
}

interface AccountDeletionConfirmStepProps {
  confirmButtonRef: RefObject<HTMLButtonElement>;
  email: string;
  feedback: Feedback;
  isConfirming: boolean;
  isResending: boolean;
  resendCooldown: number;
  onConfirmDeletion: () => Promise<void> | void;
  onResendCode: () => Promise<void> | void;
  onReturnToOtp: () => void;
}

export function AccountDeletionConfirmStep({
  confirmButtonRef,
  email,
  feedback,
  isConfirming,
  isResending,
  resendCooldown,
  onConfirmDeletion,
  onResendCode,
  onReturnToOtp,
}: AccountDeletionConfirmStepProps) {
  const resendDisabled = isResending || resendCooldown > 0;

  return (
    <AccountDeletionStepCard
      description="삭제 버튼을 누르면 계정과 직접 식별 정보 삭제가 바로 시작돼요."
      title="마지막으로 삭제를 확인해 주세요"
    >
      <div className="mt-5 grid gap-1 rounded-hypo-lg bg-hypo-brand-soft/45 px-4 py-3">
        <span className="text-xs font-bold text-hypo-text-soft">확인된 가입 이메일</span>
        <strong className="break-all text-sm font-black text-hypo-text">{email}</strong>
      </div>

      <AccountDeletionInlineFeedback feedback={feedback} />

      <div className="mt-5 rounded-hypo-lg border border-hypo-danger/15 bg-hypo-danger-soft px-4 py-4 text-sm font-semibold leading-6 text-hypo-text">
        이전 신청, 모집글, 채팅, 후기와 서비스 활동은 삭제 뒤 새 계정으로 복구되지 않아요.
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          ref={confirmButtonRef}
          className="w-full sm:w-auto"
          disabled={isConfirming}
          size="lg"
          type="button"
          variant="danger"
          onClick={() => void onConfirmDeletion()}
        >
          {isConfirming ? "삭제 처리 중" : "계정을 삭제할게요"}
        </Button>
        <Button
          className="w-full sm:w-auto"
          disabled={resendDisabled}
          size="lg"
          type="button"
          variant="secondary"
          onClick={() => void onResendCode()}
        >
          {getResendButtonLabel({ isResending, resendCooldown })}
        </Button>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm">
        <button
          className="inline-flex items-center gap-1 font-black text-hypo-brand hover:underline focus:outline-none focus:ring-[3px] focus:ring-hypo-brand/15"
          type="button"
          onClick={onReturnToOtp}
        >
          인증번호 다시 입력하기
          <RotateCcw aria-hidden="true" size={15} />
        </button>
        <a
          className="inline-flex items-center gap-1 font-black text-hypo-brand hover:underline"
          href="/support"
        >
          고객지원으로 이동
          <ArrowRight aria-hidden="true" size={15} />
        </a>
      </div>

      <p className="mt-4 text-xs font-semibold leading-5 text-hypo-text-soft">
        이 마지막 확인은 잠시 후 만료될 수 있어요. 진행이 멈추면 인증번호를 다시 받아 주세요.
      </p>
    </AccountDeletionStepCard>
  );
}

function AccountDeletionStepCard({
  children,
  description,
  title,
}: {
  children: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-hypo-lg border border-hypo-border bg-hypo-surface p-5 shadow-hypo-panel sm:p-7">
      <h2 className="text-xl font-black text-hypo-text">{title}</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-hypo-text-muted">{description}</p>
      {children}
    </div>
  );
}
