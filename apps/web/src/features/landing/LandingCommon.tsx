import {
  CalendarDays,
  ClipboardList,
  FileText,
  Megaphone,
  MessageCircle,
  ListChecks,
  UserCheck,
} from "lucide-react";

import { APP_STORE_URL, landingFooterLinks } from "./content";
import { LandingBusinessDetails } from "./LandingBusinessDetails";

interface LandingStoreBadgesProps {
  className?: string;
  compact?: boolean;
  inverseFocus?: boolean;
}

export function LandingStoreBadges({
  className = "",
  compact = false,
  inverseFocus = false,
}: LandingStoreBadgesProps) {
  const badgeHeightClass = compact ? "h-11" : "h-12";
  const focusClass = inverseFocus
    ? "focus-visible:ring-white/45"
    : "focus-visible:ring-hypo-brand/25";

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`.trim()}>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noreferrer"
        className={`inline-flex min-h-11 items-center rounded-hypo-md focus-visible:outline-none focus-visible:ring-[3px] ${focusClass}`}
        aria-label="App Store에서 Hypofit 다운로드"
      >
        <img
          src="/brand/download-on-app-store.svg"
          alt="App Store에서 다운로드"
          className={`${badgeHeightClass} w-auto`}
        />
      </a>
    </div>
  );
}

interface LandingSectionHeaderProps {
  align?: "left" | "center";
  body: string;
  className?: string;
  compact?: boolean;
  eyebrow: string;
  inverse?: boolean;
  title: string;
  titleClassName?: string;
  bodyClassName?: string;
}

export function LandingSectionHeader({
  align = "left",
  body,
  className = "",
  compact = false,
  eyebrow,
  inverse = false,
  title,
  titleClassName = "",
  bodyClassName = "",
}: LandingSectionHeaderProps) {
  const isCenter = align === "center";

  return (
    <div
      className={`${isCenter ? "mx-auto max-w-[760px] text-center" : "max-w-[720px]"} ${className}`}
    >
      <span
        data-landing-reveal-item="eyebrow"
        className={`text-[11px] font-black ${
          inverse ? "text-[#74C6AA]" : "text-hypo-brand"
        }`}
      >
        {eyebrow}
      </span>
      <h2
        data-landing-reveal-item="title"
        className={`mt-4 font-black leading-[1.32] ${
          inverse ? "text-white" : "text-hypo-text"
        } ${
          compact
            ? isCenter
              ? "text-[26px] sm:text-[34px]"
              : "text-[25px] sm:text-[34px]"
            : isCenter
              ? "text-[29px] sm:text-[40px]"
              : "text-[28px] sm:text-[42px]"
        } ${titleClassName}`}
      >
        {title}
      </h2>
      <p
        data-landing-reveal-item="body"
        className={`${compact ? "mt-3 text-sm leading-6" : "mt-4 text-sm leading-7 sm:text-base"} font-bold ${
          inverse ? "text-white/68" : "text-hypo-text-muted"
        } ${bodyClassName}`}
      >
        {body}
      </p>
    </div>
  );
}

interface LandingWorkflowComparisonProps {
  compact?: boolean;
}

const fragmentedTools = [
  { icon: Megaphone, label: "모집 채널" },
  { icon: FileText, label: "신청 폼" },
  { icon: MessageCircle, label: "메신저" },
  { icon: CalendarDays, label: "진행 관리" },
];

const hypofitWorkflow = [
  { icon: ClipboardList, label: "공고" },
  { icon: UserCheck, label: "신청 · 참여" },
  { icon: MessageCircle, label: "연락" },
  { icon: ListChecks, label: "진행 관리" },
];

export function LandingWorkflowComparison({
  compact = false,
}: LandingWorkflowComparisonProps) {
  const panelPaddingClass = compact ? "p-5" : "p-7";
  const toolCardClass = compact
    ? "min-h-[62px] rounded-xl px-3 py-3 text-[13px]"
    : "min-h-[74px] rounded-2xl px-4 py-4 text-sm";
  const stepCardClass = compact
    ? "min-h-[62px] rounded-xl px-3 py-3 text-[13px]"
    : "min-h-[108px] rounded-2xl px-3 py-4 text-sm";

  return (
    <div
      data-landing-workflow
      className="grid gap-5 lg:grid-cols-[minmax(320px,0.85fr)_80px_minmax(520px,1.15fr)] lg:items-center"
      aria-label="기존 방식과 Hypofit 모집 및 참여 흐름 비교"
    >
      <section
        className={`border border-landing-border bg-white/45 ${panelPaddingClass}`}
        aria-labelledby="fragmented-workflow-title"
      >
        <p
          data-landing-workflow-item="old-label"
          id="fragmented-workflow-title"
          className="text-[11px] font-bold tracking-[0.08em] text-landing-muted"
        >
          기존 방식
        </p>
        <div className="relative mt-6 grid grid-cols-2 gap-x-5 gap-y-5 py-1">
          <svg
            data-landing-workflow-item="paths"
            className="pointer-events-none absolute inset-0 size-full"
            viewBox="0 0 320 180"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M72 42 C125 58, 154 27, 236 61"
              fill="none"
              stroke="#C7D3CC"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              opacity="0.76"
            />
            <path
              d="M242 69 C219 104, 166 121, 91 136"
              fill="none"
              stroke="#C7D3CC"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              opacity="0.68"
            />
            <path
              d="M100 143 C156 156, 194 134, 251 119"
              fill="none"
              stroke="#C7D3CC"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              opacity="0.68"
            />
          </svg>
          {fragmentedTools.map(({ icon: Icon, label }, index) => (
            <div
              data-landing-workflow-item="old-card"
              key={label}
              className={`relative z-10 flex items-center gap-2.5 border border-landing-border bg-white/85 font-bold text-landing-foreground shadow-[0_8px_24px_rgba(16,24,18,0.04)] transition-transform duration-300 hover:-translate-y-0.5 ${toolCardClass} ${
                index === 0
                  ? "mr-3 -translate-y-1"
                  : index === 1
                    ? "ml-2 translate-y-4"
                    : index === 2
                      ? "ml-4 translate-y-1"
                      : "mr-1 -translate-y-2"
              }`}
            >
              <Icon
                size={compact ? 16 : 18}
                className="shrink-0 text-landing-muted"
                aria-hidden="true"
              />
              {label}
            </div>
          ))}
        </div>
      </section>

      <div
        data-landing-workflow-item="transition"
        className="relative flex h-12 items-center justify-center lg:h-auto lg:min-h-[64px]"
        aria-hidden="true"
      >
        <span className="absolute left-0 hidden w-3 border-t border-dashed border-landing-border lg:block" />
        <span className="relative z-10 flex size-12 items-center justify-center rounded-full border border-landing-border bg-white text-xl font-bold text-landing-primary shadow-[0_8px_24px_rgba(16,24,18,0.04)] lg:size-16">
          <span className="lg:hidden">↓</span>
          <span className="hidden lg:inline">→</span>
        </span>
        <span className="absolute right-0 hidden w-3 border-t-2 border-landing-primary lg:block" />
      </div>

      <section
        data-landing-workflow-item="new-panel"
        className={`border border-landing-primary/25 bg-landing-soft-mint/50 ${panelPaddingClass}`}
        aria-labelledby="hypofit-workflow-title"
      >
        <p
          id="hypofit-workflow-title"
          className="text-[11px] font-bold tracking-[0.08em] text-landing-primary"
        >
          HYPOFIT
        </p>
        <div className="relative mt-6">
          <span
            data-landing-workflow-item="rail"
            className="absolute bottom-5 left-[9px] top-5 border-l-2 border-landing-primary lg:bottom-auto lg:left-[12.5%] lg:right-[12.5%] lg:top-[18px] lg:h-0 lg:border-l-0 lg:border-t-2"
            aria-hidden="true"
          />
          <ol className="grid gap-3 pl-8 lg:grid-cols-4 lg:gap-3 lg:pl-0">
            {hypofitWorkflow.map(({ icon: Icon, label }) => (
              <li
                key={label}
                data-landing-workflow-item="step"
                className="relative z-10"
              >
                <span
                  data-landing-workflow-item="node"
                  className="absolute -left-8 top-4 size-5 rounded-full border-[3px] border-landing-primary bg-landing-accent lg:left-1/2 lg:top-2 lg:-translate-x-1/2"
                  aria-hidden="true"
                />
                <div
                  className={`flex items-center gap-2.5 border border-landing-primary/20 bg-white/85 font-bold text-landing-foreground shadow-[0_10px_30px_rgba(15,122,77,0.06)] lg:flex-col lg:justify-center lg:gap-2 lg:text-center ${stepCardClass}`}
                >
                  <Icon
                    size={compact ? 16 : 18}
                    className="shrink-0 text-landing-primary"
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

interface LandingFooterProps {
  mobile?: boolean;
}

export function LandingFooter({ mobile = false }: LandingFooterProps) {
  return (
    <footer
      className={
        mobile
          ? "bg-[#111916] px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-8 text-white/60"
          : "bg-[#111916] py-9 text-white/60"
      }
    >
      <div
        className={
          mobile
            ? "mx-auto max-w-[430px]"
            : "mx-auto flex max-w-[1240px] flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10"
        }
      >
        <div>
          <div className="flex items-center gap-2.5">
            <img
              src="/brand/hypofit-mark-inverse.svg"
              alt=""
              aria-hidden="true"
              className={
                mobile ? "size-6 object-contain" : "size-7 object-contain"
              }
            />
            <strong
              className={`font-brand font-black text-white ${mobile ? "text-sm" : "text-base"}`}
            >
              Hypofit
            </strong>
          </div>
          <LandingBusinessDetails
            className={
              mobile
                ? "mt-4 text-[11px] font-bold leading-5"
                : "mt-4 max-w-2xl text-xs font-bold leading-6"
            }
          />
        </div>

        <nav
          className={
            mobile
              ? "mt-4 flex flex-wrap gap-x-4 text-xs font-black"
              : "flex flex-wrap gap-x-5 gap-y-3 text-xs font-black"
          }
          aria-label={mobile ? "모바일 법적 고지와 지원" : "법적 고지와 지원"}
        >
          {landingFooterLinks.map((link) => (
            <a
              key={link.href}
              className={
                mobile
                  ? "inline-flex min-h-11 items-center transition-colors hover:text-white"
                  : "transition-colors hover:text-white"
              }
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
