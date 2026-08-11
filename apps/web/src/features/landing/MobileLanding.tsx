import { useRef, useState } from "react";
import {
  ArrowDown,
  Check,
  ChevronRight,
  CircleHelp,
  Flag,
  LockKeyhole,
  MapPinned,
  MessageCircle,
  SearchCheck,
  ShieldCheck,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";

import { APP_STORE_URL, workflowSteps } from "./content";
import {
  ApplicationPreview,
  ChatPreview,
  InterviewDiscoveryPreview,
  MapDiscoveryPreview,
} from "./LandingProductVisuals";
import { supportEmail } from "../../shared/config/support";

type Audience = "founder" | "interviewer";

const audienceContent: Record<
  Audience,
  {
    body: string;
    icon: typeof UserRoundSearch;
    points: readonly string[];
    title: string;
  }
> = {
  founder: {
    title: "내 서비스에 맞는 고객을 만나요",
    body: "찾는 고객과 인터뷰 조건을 적고, 신청자의 경험을 확인한 뒤 대화를 이어가세요.",
    icon: UserRoundSearch,
    points: ["고객 조건을 담은 모집글", "신청자의 관련 경험 확인", "채팅으로 일정 조율"],
  },
  interviewer: {
    title: "내 경험에 맞는 인터뷰를 찾아요",
    body: "지역, 방식, 시간과 사례비를 확인하고 내가 실제로 겪은 경험을 바탕으로 신청하세요.",
    icon: UsersRound,
    points: ["검색과 지도로 조건 비교", "경험과 가능한 시간 작성", "신청 결과와 상태 확인"],
  },
};

const productSlides = [
  {
    eyebrow: "1 / 4",
    icon: SearchCheck,
    title: "조건에 맞는 인터뷰 찾기",
    body: "서비스와 타깃, 지역을 검색하고 사례비와 진행 방식을 비교해요.",
    visual: <InterviewDiscoveryPreview compact />,
  },
  {
    eyebrow: "2 / 4",
    icon: MapPinned,
    title: "지도에서 가까운 인터뷰 보기",
    body: "현재 위치나 검색한 장소를 중심으로 주변 인터뷰를 살펴봐요.",
    visual: <MapDiscoveryPreview compact />,
  },
  {
    eyebrow: "3 / 4",
    icon: Check,
    title: "경험과 가능한 시간으로 신청",
    body: "인터뷰 조건을 확인하고 모집자가 알아야 할 내용만 간단히 전해요.",
    visual: <ApplicationPreview />,
  },
  {
    eyebrow: "4 / 4",
    icon: MessageCircle,
    title: "선정 이후 채팅으로 조율",
    body: "일정과 진행 방식을 맞추고 중요한 상태를 같은 대화에서 확인해요.",
    visual: <ChatPreview compact />,
  },
] as const;

export function MobileLanding() {
  return (
    <div className="min-h-dvh bg-hypo-bg">
      <MobileHeader />
      <main id="main-content">
        <MobileHero />
        <MobileAudience />
        <MobileProductTour />
        <MobileWorkflow />
        <MobileTrust />
        <MobileDownload />
      </main>
      <MobileFooter />
    </div>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#E2E8E5] bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="flex h-14 items-center justify-between px-4">
        <a href="#mobile-top" className="flex items-center gap-2" aria-label="Hypofit 모바일 랜딩 처음으로">
          <img
            src="/brand/hypofit-mark.svg"
            alt=""
            aria-hidden="true"
            className="size-7 object-contain"
          />
          <strong className="font-brand text-base font-black text-hypo-text">Hypofit</strong>
        </a>
        <div className="flex items-center gap-1">
          <a
            href="/app"
            className="inline-flex min-h-11 items-center rounded-hypo-md px-2.5 text-xs font-black text-hypo-text transition-colors hover:bg-hypo-surface-muted hover:text-hypo-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
          >
            로그인
          </a>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1 rounded-hypo-md bg-hypo-text px-3 text-xs font-black text-white transition-colors hover:bg-hypo-brand-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
          >
            앱 받기
            <ChevronRight size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}

function MobileHero() {
  return (
    <section id="mobile-top" className="scroll-mt-20 overflow-hidden bg-[#F0F6F3] px-4 pb-8 pt-8">
      <div className="mx-auto max-w-[430px] text-center">
        <span className="text-[11px] font-black text-hypo-brand">고객 검증을 더 빠르게</span>
        <h1 className="mt-3 font-brand text-[38px] font-black leading-[1.15] text-hypo-text">Hypofit</h1>
        <p className="mt-4 text-[26px] font-black leading-[1.4] text-hypo-text">
          실제 고객과
          <br />검증 인터뷰를 시작하세요
        </p>
        <p className="mx-auto mt-3 max-w-[320px] text-[13px] font-bold leading-6 text-hypo-text-muted">
          모집과 신청, 일정 조율을 한곳에서 이어가요.
        </p>

        <div className="mt-5 flex items-center justify-center gap-3">
          <MobileAppStoreBadge />
          <a
            href="#mobile-product"
            className="inline-flex h-11 items-center gap-1.5 rounded-hypo-md border border-[#C9D5CF] bg-white px-3.5 text-xs font-black text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
          >
            화면 보기
            <ArrowDown size={14} aria-hidden="true" />
          </a>
        </div>
        <span className="mt-2 block text-xs font-bold text-hypo-text-muted">Android 버전은 준비 중이에요</span>

        <div className="relative mx-auto mt-7 max-w-[350px]">
          <div className="absolute inset-x-4 bottom-0 top-8 rounded-hypo-lg bg-[#D8E8E1]" />
          <div className="relative px-2">
            <InterviewDiscoveryPreview compact />
          </div>
        </div>
      </div>
    </section>
  );
}

function MobileAudience() {
  const [audience, setAudience] = useState<Audience>("founder");
  const selected = audienceContent[audience];
  const Icon = selected.icon;

  return (
    <section className="border-y border-[#E0E7E3] bg-white px-4 py-12" aria-labelledby="mobile-audience-title">
      <div className="mx-auto max-w-[430px]">
        <span className="text-[11px] font-black text-hypo-brand">누구를 위한 서비스인가요?</span>
        <h2 id="mobile-audience-title" className="mt-3 text-[25px] font-black leading-[1.42] text-hypo-text">
          역할에 따라 필요한 흐름만 보여드려요
        </h2>

        <div className="mt-6 grid grid-cols-2 rounded-hypo-lg bg-[#EDF2EF] p-1" role="tablist" aria-label="사용자 역할 선택">
          <AudienceTab
            controls="mobile-audience-panel"
            id="mobile-audience-founder"
            isSelected={audience === "founder"}
            label="창업자"
            onSelect={() => setAudience("founder")}
            onSelectSibling={() => setAudience("interviewer")}
          />
          <AudienceTab
            controls="mobile-audience-panel"
            id="mobile-audience-interviewer"
            isSelected={audience === "interviewer"}
            label="인터뷰어"
            onSelect={() => setAudience("interviewer")}
            onSelectSibling={() => setAudience("founder")}
          />
        </div>

        <div
          key={audience}
          id="mobile-audience-panel"
          role="tabpanel"
          aria-labelledby={`mobile-audience-${audience}`}
          className="landing-audience-panel mt-6 min-h-[260px] border-y border-[#DCE4E0] py-6"
          aria-live="polite"
        >
          <div className="grid size-10 place-items-center rounded-hypo-md bg-hypo-brand-soft text-hypo-brand">
            <Icon size={20} aria-hidden="true" />
          </div>
          <h3 className="mt-4 text-xl font-black leading-7 text-hypo-text">{selected.title}</h3>
          <p className="mt-3 text-[13px] font-bold leading-6 text-hypo-text-muted">{selected.body}</p>
          <ul className="mt-5 space-y-3">
            {selected.points.map((point) => (
              <li key={point} className="flex items-center gap-2 text-[13px] font-black text-hypo-text">
                <Check size={14} className="shrink-0 text-hypo-brand" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function AudienceTab({
  controls,
  id,
  isSelected,
  label,
  onSelect,
  onSelectSibling,
}: {
  controls: string;
  id: string;
  isSelected: boolean;
  label: string;
  onSelect: () => void;
  onSelectSibling: () => void;
}) {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-controls={controls}
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      className={`min-h-11 rounded-hypo-md text-[13px] font-black transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20 ${
        isSelected ? "bg-white text-hypo-brand shadow-hypo-panel" : "text-hypo-text-muted"
      }`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (["ArrowLeft", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          onSelectSibling();
          window.requestAnimationFrame(() => {
            document.getElementById(
              id === "mobile-audience-founder"
                ? "mobile-audience-interviewer"
                : "mobile-audience-founder",
            )?.focus();
          });
        }
      }}
    >
      {label}
    </button>
  );
}

function MobileProductTour() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeSlide, setActiveSlide] = useState(0);

  const updateActiveSlide = () => {
    const track = trackRef.current;
    if (!track) {
      return;
    }

    const slides = Array.from(track.querySelectorAll<HTMLElement>("[data-product-slide]"));
    const viewportCenter = track.scrollLeft + track.clientWidth / 2;
    const nearestIndex = slides.reduce((nearest, slide, index) => {
      const nearestSlide = slides[nearest];
      const nearestDistance = Math.abs(
        nearestSlide.offsetLeft + nearestSlide.offsetWidth / 2 - viewportCenter,
      );
      const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - viewportCenter);
      return distance < nearestDistance ? index : nearest;
    }, 0);

    setActiveSlide(nearestIndex);
  };

  const showSlide = (index: number) => {
    const track = trackRef.current;
    const slide = track?.querySelectorAll<HTMLElement>("[data-product-slide]")[index];
    if (!track || !slide) {
      return;
    }

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const centeredLeft = slide.offsetLeft - (track.clientWidth - slide.offsetWidth) / 2;
    track.scrollTo({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      left: Math.max(0, centeredLeft),
    });
    setActiveSlide(index);
  };

  return (
    <section id="mobile-product" className="scroll-mt-20 bg-[#17231F] py-12 text-white">
      <div className="px-4">
        <div className="mx-auto max-w-[430px]">
          <span className="text-[11px] font-black text-[#72C6A9]">앱에서 이렇게 이어져요</span>
          <h2 className="mt-3 text-[25px] font-black leading-[1.42]">필요한 화면만 넘겨보세요</h2>
          <p className="mt-3 text-[13px] font-bold leading-6 text-white/60">
            좌우로 밀어 인터뷰를 찾고 조율하는 흐름을 확인할 수 있어요.
          </p>
        </div>
      </div>

      <div
        ref={trackRef}
        className="mt-7 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Hypofit 주요 기능 화면"
        onScroll={updateActiveSlide}
      >
        {productSlides.map(({ body, eyebrow, icon: Icon, title, visual }, index) => (
          <article
            key={title}
            data-product-slide
            aria-label={`${index + 1}/${productSlides.length} ${title}`}
            className="w-[calc(100vw-3rem)] max-w-[360px] shrink-0 snap-center rounded-hypo-lg bg-white p-4 text-hypo-text"
          >
            <div className="flex items-center justify-between">
              <div className="grid size-9 place-items-center rounded-hypo-md bg-hypo-brand-soft text-hypo-brand">
                <Icon size={18} aria-hidden="true" />
              </div>
              <span className="text-[11px] font-black text-hypo-text-muted">{eyebrow}</span>
            </div>
            <h3 className="mt-4 text-lg font-black leading-7">{title}</h3>
            <p className="mt-2 min-h-12 text-xs font-bold leading-5 text-hypo-text-muted">{body}</p>
            <div className="mt-4 min-h-[320px] overflow-hidden">{visual}</div>
          </article>
        ))}
        <div className="w-1 shrink-0" aria-hidden="true" />
      </div>
      <div className="mt-1 flex items-center justify-center" aria-label="주요 기능 화면 선택">
        {productSlides.map((slide, index) => (
          <button
            key={slide.title}
            type="button"
            className="grid size-11 place-items-center rounded-hypo-pill focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#72C6A9]/50"
            aria-label={`${index + 1}번째 기능 보기`}
            aria-current={activeSlide === index ? "true" : undefined}
            onClick={() => showSlide(index)}
          >
            <span
              className={`block h-1.5 rounded-hypo-pill transition-[width,background-color] ${
                activeSlide === index ? "w-5 bg-[#72C6A9]" : "w-1.5 bg-white/35"
              }`}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {productSlides.length}개 중 {activeSlide + 1}번째 기능
      </p>
    </section>
  );
}

function MobileWorkflow() {
  return (
    <section className="bg-white px-4 py-12" aria-labelledby="mobile-workflow-title">
      <div className="mx-auto max-w-[430px]">
        <span className="text-[11px] font-black text-hypo-brand">이용 흐름</span>
        <h2 id="mobile-workflow-title" className="mt-3 text-[25px] font-black leading-[1.42] text-hypo-text">
          모집부터 인터뷰까지 이어져요
        </h2>

        <ol className="mt-7 border-y border-[#DCE4E0]">
          {workflowSteps.map((step, index) => (
            <li key={step.number} className={`grid grid-cols-[36px_minmax(0,1fr)] gap-3 py-5 ${index < workflowSteps.length - 1 ? "border-b border-[#E5EAE7]" : ""}`}>
              <span className="grid size-8 place-items-center rounded-hypo-md bg-hypo-brand-soft text-[10px] font-black text-hypo-brand">
                {step.number}
              </span>
              <div>
                <h3 className="text-[15px] font-black leading-6 text-hypo-text">{step.title}</h3>
                <p className="mt-1 text-xs font-bold leading-5 text-hypo-text-muted">{step.mobileBody}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function MobileTrust() {
  const rows = [
    { icon: ShieldCheck, label: "인터뷰 조건을 신청 전에 확인해요" },
    { icon: Flag, label: "불편한 사용자와 모집글을 신고할 수 있어요" },
    { icon: LockKeyhole, label: "개인정보와 계정 삭제 경로를 제공해요" },
    { icon: CircleHelp, label: "문의 내역과 답변을 앱에서 확인해요" },
  ];

  return (
    <section className="border-y border-[#E0E7E3] bg-hypo-bg px-4 py-12" aria-labelledby="mobile-trust-title">
      <div className="mx-auto max-w-[430px]">
        <span className="text-[11px] font-black text-hypo-brand">안심하고 사용하세요</span>
        <h2 id="mobile-trust-title" className="mt-3 text-[25px] font-black leading-[1.42] text-hypo-text">
          신청 전 확인부터 문제 해결까지 함께해요
        </h2>
        <div className="mt-7 divide-y divide-[#DFE6E2] border-y border-[#D6DFDA]">
          {rows.map(({ icon: Icon, label }) => (
            <div key={label} className="flex min-h-14 items-center gap-3 py-3">
              <Icon size={18} className="shrink-0 text-hypo-brand" aria-hidden="true" />
              <span className="min-w-0 flex-1 text-[13px] font-black leading-5 text-hypo-text">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs font-bold leading-5 text-hypo-text-muted">
          조건 확인, 신고·차단·문의, 계정 관리까지 필요한 경로를 앱 안에서 찾을 수 있어요.
        </p>
      </div>
    </section>
  );
}

function MobileDownload() {
  return (
    <section className="bg-hypo-brand px-4 py-12 text-center text-white">
      <div className="mx-auto max-w-[430px]">
        <img
          src="/brand/hypofit-mark-inverse.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto size-12 object-contain"
        />
        <h2 className="mt-5 text-[27px] font-black leading-[1.4]">
          실제 고객과의 대화를
          <br />지금 시작해보세요
        </h2>
        <p className="mt-3 text-[13px] font-bold leading-6 text-white/75">
          모집과 신청, 일정 조율을 한곳에서 이어갈 수 있어요.
        </p>
        <div className="mt-6">
          <MobileAppStoreBadge />
        </div>
      </div>
    </section>
  );
}

function MobileAppStoreBadge() {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-11 items-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/50"
      aria-label="App Store에서 Hypofit 다운로드"
    >
      <img src="/brand/download-on-app-store.svg" alt="App Store에서 다운로드" className="h-11 w-auto" />
    </a>
  );
}

function MobileFooter() {
  return (
    <footer className="bg-[#111916] px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-8 text-white/60">
      <div className="mx-auto max-w-[430px]">
        <div className="flex items-center gap-2">
          <img
            src="/brand/hypofit-mark-inverse.svg"
            alt=""
            aria-hidden="true"
            className="size-6 object-contain"
          />
          <strong className="font-brand text-sm font-black text-white">Hypofit</strong>
        </div>
        <nav className="mt-4 flex flex-wrap gap-x-4 text-xs font-black" aria-label="모바일 법적 고지와 지원">
          <a className="inline-flex min-h-11 items-center" href="/legal/privacy">개인정보처리방침</a>
          <a className="inline-flex min-h-11 items-center" href="/legal/terms">이용약관</a>
          <a className="inline-flex min-h-11 items-center" href="/account-deletion">계정 삭제</a>
          <a className="inline-flex min-h-11 items-center" href="/support">문의하기</a>
        </nav>
        <p className="mt-5 text-[11px] font-bold leading-5">
          제공자 박종인 · contentruck팀
          <br />문의 {supportEmail}
          <br />© 2026 Hypofit. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
