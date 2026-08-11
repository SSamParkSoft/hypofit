import type { ReactNode, RefObject } from "react";
import { ArrowRight } from "lucide-react";

import type { Feedback } from "../model/accountDeletionFlow";

export function AccountDeletionInlineFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) {
    return null;
  }

  const isError = feedback.tone === "error";
  return (
    <div
      className={`mt-5 rounded-hypo-md border px-4 py-3 text-sm font-bold leading-6 ${
        isError
          ? "border-hypo-danger/20 bg-hypo-danger-soft text-hypo-danger"
          : "border-hypo-brand/15 bg-hypo-brand-soft/45 text-hypo-text"
      }`}
      role={isError ? "alert" : "status"}
    >
      {feedback.message}
    </div>
  );
}

export function AccountDeletionDevVerificationCode({ code }: { code: string | null }) {
  if (!code) {
    return null;
  }

  return (
    <div className="rounded-hypo-lg border border-dashed border-hypo-brand/30 bg-hypo-brand-soft/35 px-4 py-3">
      <p className="text-xs font-bold text-hypo-text-soft">DEV 확인용 인증번호</p>
      <strong className="mt-1 block text-lg font-black text-hypo-text">{code}</strong>
    </div>
  );
}

export function AccountDeletionStatePanel({
  children,
  icon,
  title,
  titleRef,
  tone = "brand",
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
  titleRef?: RefObject<HTMLHeadingElement>;
  tone?: "brand" | "danger";
}) {
  return (
    <section
      className={`mt-10 max-w-[760px] rounded-hypo-lg border p-5 sm:p-7 ${
        tone === "danger"
          ? "border-hypo-danger/20 bg-hypo-danger-soft"
          : "border-hypo-brand/15 bg-hypo-surface"
      }`}
    >
      <span
        className={`grid size-12 place-items-center rounded-hypo-lg ${
          tone === "danger" ? "bg-white/75 text-hypo-danger" : "bg-hypo-brand-soft text-hypo-brand"
        }`}
      >
        {icon}
      </span>
      <h2
        ref={titleRef}
        className="mt-5 text-xl font-black text-hypo-text sm:text-2xl"
        tabIndex={titleRef ? -1 : undefined}
      >
        {title}
      </h2>
      <div className="mt-2 text-sm font-semibold leading-7 text-hypo-text-muted">{children}</div>
    </section>
  );
}

export function AccountDeletionStateLinks({ showRestart = false }: { showRestart?: boolean }) {
  return (
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
      {showRestart ? (
        <a className="inline-flex items-center gap-1 text-sm font-black text-hypo-brand hover:underline" href="/account-deletion">
          새 삭제 요청 시작하기
          <ArrowRight aria-hidden="true" size={15} />
        </a>
      ) : null}
      <a className="inline-flex items-center gap-1 text-sm font-black text-hypo-brand hover:underline" href="/support">
        고객지원으로 이동
        <ArrowRight aria-hidden="true" size={15} />
      </a>
    </div>
  );
}
