import type { ReactNode } from "react";
import { CircleX, ShieldCheck, Trash2 } from "lucide-react";

import {
  deletionSteps,
  getCurrentStepNumber,
  type FlowStep,
} from "../model/accountDeletionFlow";

export function AccountDeletionIntroduction() {
  return (
    <header className="max-w-[760px]">
      <p className="text-sm font-black text-hypo-brand">계정 관리</p>
      <h1 className="mt-3 text-[32px] font-black leading-[1.25] sm:text-[38px] lg:text-[40px]">
        Hypofit 계정 삭제
      </h1>
      <p className="mt-4 max-w-[650px] text-[15px] font-semibold leading-7 text-hypo-text-muted sm:text-base">
        앱에 로그인할 수 없어도 가입 이메일 인증 뒤 마지막 확인 단계에서 계정 삭제를 진행할
        수 있어요.
      </p>
    </header>
  );
}

export function AccountDeletionPageHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-hypo-border/80 bg-hypo-bg/95 pt-[var(--app-safe-top)] backdrop-blur supports-[backdrop-filter]:bg-hypo-bg/85">
      <div className="mx-auto flex min-h-16 w-full max-w-[1120px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          aria-label="Hypofit 홈"
          className="inline-flex min-h-11 items-center gap-2.5 rounded-hypo-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
          href="/"
        >
          <img
            alt=""
            aria-hidden="true"
            className="size-8 shrink-0 rounded-hypo-md"
            src="/brand/hypofit-mark.svg"
          />
          <strong className="font-brand text-lg font-black text-hypo-text">Hypofit</strong>
        </a>
        <a
          className="inline-flex min-h-10 items-center justify-center rounded-hypo-lg px-3 text-sm font-black text-hypo-brand transition-colors hover:bg-hypo-brand-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
          href="/support"
        >
          고객지원
        </a>
      </div>
    </header>
  );
}

export function AccountDeletionStepList({ step }: { step: FlowStep }) {
  const currentStepNumber = getCurrentStepNumber(step);

  return (
    <ol className="mt-8 grid border-y border-hypo-border sm:grid-cols-3" aria-label="계정 삭제 절차">
      {deletionSteps.map((item, index) => {
        const stepNumber = index + 1;
        const isComplete = step === "complete" ? stepNumber <= currentStepNumber : stepNumber < currentStepNumber;
        const isCurrent = step !== "complete" && stepNumber === currentStepNumber;
        const isActive = isComplete || isCurrent;

        return (
          <li
            key={item.number}
            className={`flex min-h-16 items-center gap-3 py-3 sm:px-4 ${
              index > 0 ? "border-t border-hypo-border sm:border-l sm:border-t-0" : ""
            }`}
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-hypo-pill text-xs font-black ${
                isActive ? "bg-hypo-brand text-white" : "bg-hypo-brand-soft text-hypo-brand"
              }`}
            >
              {item.number}
            </span>
            <span className={`text-sm font-black ${isActive ? "text-hypo-text" : "text-hypo-text-muted"}`}>
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function AccountDeletionInformation() {
  return (
    <aside className="border-y border-hypo-border lg:sticky lg:top-24" aria-labelledby="deletion-information-title">
      <div className="py-5">
        <h2 id="deletion-information-title" className="text-lg font-black text-hypo-text">
          삭제 전 확인해 주세요
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-hypo-text-muted">
          삭제가 완료되면 같은 이메일로 다시 가입할 수 있지만 이전 기록은 복구되지 않아요.
        </p>
      </div>

      <InformationBlock icon={<Trash2 aria-hidden="true" size={18} />} title="삭제되는 정보">
        계정 정보, 프로필, 프로필 사진과 로그인에 필요한 인증 정보가 삭제돼요.
      </InformationBlock>
      <InformationBlock icon={<CircleX aria-hidden="true" size={18} />} title="복구되지 않는 기록">
        이전 신청, 모집글, 채팅, 후기와 서비스 활동은 새 계정으로 복구되지 않아요.
      </InformationBlock>
      <InformationBlock
        icon={<ShieldCheck aria-hidden="true" size={18} />}
        title="일부 기록은 보관될 수 있어요"
      >
        분쟁 확인과 부정 이용 방지에 필요한 최소 기록은 일정 기간 분리 보관되거나 익명화될 수
        있어요.{" "}
        <a className="font-black text-hypo-brand underline-offset-4 hover:underline" href="/legal/privacy">
          개인정보처리방침에서 자세히 보기
        </a>
      </InformationBlock>
    </aside>
  );
}

function InformationBlock({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <section className="border-t border-hypo-border py-5">
      <div className="flex items-center gap-2 text-hypo-brand">
        {icon}
        <h3 className="text-sm font-black text-hypo-text">{title}</h3>
      </div>
      <p className="mt-2 text-sm font-semibold leading-6 text-hypo-text-muted">{children}</p>
    </section>
  );
}
