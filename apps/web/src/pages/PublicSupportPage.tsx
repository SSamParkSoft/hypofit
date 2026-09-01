import {
  ArrowRight,
  LifeBuoy,
  LockKeyhole,
  Mail,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { publicWebBaseUrl } from "@hypofit/contracts";

import { supportEmail } from "../shared/config/support";
import { useRouteMetadata } from "../shared/navigation/useRouteMetadata";

const supportSurfaceClassName =
  "rounded-hypo-lg border border-hypo-border bg-hypo-surface";
const supportMailHref = `mailto:${supportEmail}?subject=${encodeURIComponent("[Hypofit 계정 도움] 로그인이 어려워요")}`;
const safetyReportBody = [
  "신고 대상:",
  "발생한 상황:",
  "관련 모집글 또는 채팅:",
  "",
  "소셜 계정 비밀번호, 인증번호, 로그인 토큰은 적지 마세요.",
].join("\n");
const safetyReportMailHref = `mailto:${supportEmail}?subject=${encodeURIComponent("[Hypofit 신고] 안전 문제를 알려주세요")}&body=${encodeURIComponent(safetyReportBody)}`;

const publicActions = [
  {
    description: "부적절한 사용자나 모집글, 인터뷰 중 안전 문제가 있었다면 알려주세요.",
    href: safetyReportMailHref,
    icon: ShieldAlert,
    label: "신고 및 안전",
  },
  {
    description: "계정 삭제 방법과 삭제 후 보관되는 정보를 확인할 수 있어요.",
    href: "/account-deletion",
    icon: Trash2,
    label: "계정 삭제",
  },
] as const;

const faqItems = [
  {
    answer:
      "계정 삭제를 진행 중이라면 스팸함을 먼저 확인해 주세요. 잠시 기다린 뒤 인증번호를 다시 요청해도 오지 않으면 운영 이메일로 삭제 요청 주소를 알려주세요. 인증번호 자체는 보내지 마세요.",
    question: "계정 삭제 인증번호가 오지 않아요.",
  },
  {
    answer:
      "최근에 사용한 Kakao, Apple, Google, Naver 계정부터 다시 시도해 주세요. 어떤 계정으로 가입했는지 기억나지 않으면 운영 이메일로 사용했을 수 있는 주소를 알려주세요.",
    question: "어떤 소셜 계정으로 로그인했는지 모르겠어요.",
  },
  {
    answer:
      "사용 중인 소셜 계정에서 인증이 취소되었거나 브라우저 쿠키가 막힌 경우 다시 시작하면 해결될 수 있어요. 계속 로그인할 수 없다면 운영 이메일로 사용한 소셜 계정과 상황을 알려주세요.",
    question: "로그인했는데 계정 상태를 확인할 수 없어요.",
  },
  {
    answer:
      "로그인 후 내 문의에서 유형을 선택해 남길 수 있어요. 부적절한 사용자, 모집글, 채팅은 해당 화면의 신고하기를 이용해 주세요.",
    question: "인터뷰 신청이나 모집글 문제는 어디에서 문의하나요?",
  },
  {
    answer:
      "계정 삭제 안내에서 삭제되는 정보와 분리 보관될 수 있는 기록을 확인한 뒤 직접 요청할 수 있어요.",
    question: "계정을 삭제하고 싶어요.",
  },
] as const;

export function PublicSupportPage() {
  useRouteMetadata({
    canonical: `${publicWebBaseUrl}/support`,
    description: "Hypofit 로그인, 계정, 인터뷰 이용 문제에 대한 도움과 문의 방법을 확인하세요.",
    robots: "index,follow",
  });

  return (
    <main className="min-h-dvh bg-hypo-bg text-hypo-text">
      <header className="sticky top-0 z-20 border-b border-hypo-border/80 bg-hypo-bg/95 pt-[var(--app-safe-top)] backdrop-blur supports-[backdrop-filter]:bg-hypo-bg/85">
        <div className="mx-auto flex min-h-16 w-full max-w-[1120px] items-center justify-between px-4 sm:px-5 lg:px-8">
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
            className="hidden min-h-10 items-center justify-center rounded-hypo-lg px-3 text-sm font-black text-hypo-brand transition-colors hover:bg-hypo-brand-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20 md:inline-flex"
            href="/app"
          >
            로그인
          </a>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1120px] px-4 pb-[calc(var(--app-safe-bottom)+3rem)] pt-10 sm:px-5 sm:pb-[calc(var(--app-safe-bottom)+4rem)] sm:pt-14 lg:px-8 lg:pt-16">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <div className="max-w-[650px]">
              <p className="text-sm font-black text-hypo-brand">Hypofit 도움말</p>
              <h1 className="mt-3 text-[32px] font-black leading-[1.25] sm:text-[38px] lg:text-[40px]">
                무엇을 도와드릴까요?
              </h1>
              <p className="mt-4 max-w-[600px] text-[15px] font-semibold leading-7 text-hypo-text-muted sm:text-base">
                로그인하지 못하는 상황에서도 필요한 도움을 받을 수 있어요.
              </p>
            </div>

            <div className={["mt-8 overflow-hidden", supportSurfaceClassName].join(" ")}>
              {publicActions.map(({ description, href, icon: Icon, label }, index) => (
                <a
                  key={label}
                  className={`group grid min-h-20 grid-cols-[40px_minmax(0,1fr)_24px] items-center gap-3 px-5 py-4 transition-colors hover:bg-hypo-surface-muted/70 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20 sm:px-6 ${index > 0 ? "border-t border-hypo-border/70" : ""}`}
                  href={href}
                >
                  <span className="grid size-10 place-items-center rounded-hypo-lg bg-hypo-brand-soft text-hypo-brand">
                    <Icon aria-hidden="true" size={19} />
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-[15px] font-black text-hypo-text sm:text-base">{label}</strong>
                    <span className="mt-1 block text-sm font-semibold leading-6 text-hypo-text-muted">
                      {description}
                    </span>
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="text-hypo-text-soft transition-transform group-hover:translate-x-0.5 group-hover:text-hypo-brand"
                    size={18}
                  />
                </a>
              ))}
            </div>
          </div>

          <aside className={`${supportSurfaceClassName} p-5 sm:p-6`}>
            <span className="grid size-10 place-items-center rounded-hypo-lg bg-hypo-brand-soft text-hypo-brand">
              <LifeBuoy aria-hidden="true" size={20} />
            </span>
            <h2 className="mt-5 text-xl font-black">로그인이 어려우신가요?</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-hypo-text-muted">
              사용한 소셜 계정을 모르겠거나 인증에 문제가 있다면 이메일로 알려주세요. 계정 정보를 확인한 뒤 가능한 방법을 안내해 드릴게요.
            </p>
            <a
              className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-hypo-lg bg-hypo-brand px-4 text-sm font-black text-white transition-colors hover:bg-hypo-brand-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/25 focus-visible:ring-offset-2 focus-visible:ring-offset-hypo-surface"
              href={supportMailHref}
            >
              <Mail aria-hidden="true" className="shrink-0" size={17} />
              이메일로 도움받기
            </a>
            <p className="mt-2 break-all text-xs font-bold text-hypo-text-soft">{supportEmail}</p>
            <div className="mt-5 border-t border-hypo-border/70 pt-4">
              <p className="flex gap-2 text-xs font-semibold leading-5 text-hypo-text-muted">
                <LockKeyhole aria-hidden="true" className="mt-0.5 shrink-0" size={15} />
                <span>
                  소셜 계정 비밀번호, 인증번호, 로그인 토큰은 보내지 마세요.<br />
                  계정 확인을 위해 추가 정보를 요청할 수 있어요.
                </span>
              </p>
            </div>
          </aside>
        </section>

        <section className="mt-16 sm:mt-20" aria-labelledby="support-faq-title">
          <div className="max-w-[650px]">
            <p className="text-sm font-black text-hypo-brand">자주 찾는 도움말</p>
            <h2 id="support-faq-title" className="mt-2 text-2xl font-black sm:text-[28px]">
              먼저 확인해 보세요
            </h2>
          </div>
          <div className={`mt-6 overflow-hidden ${supportSurfaceClassName}`}>
            {faqItems.map(({ answer, question }, index) => (
              <details key={question} className={index > 0 ? "group border-t border-hypo-border/70" : "group"}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-black marker:hidden focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20 sm:px-6 [&::-webkit-details-marker]:hidden">
                  {question}
                  <span aria-hidden="true" className="text-xl font-semibold text-hypo-text-soft transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-[760px] px-5 pb-5 pr-8 text-sm font-semibold leading-7 text-hypo-text-muted sm:px-6">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </section>

      </div>
    </main>
  );
}
