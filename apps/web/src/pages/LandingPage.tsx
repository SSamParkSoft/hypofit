import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  MapPinned,
  MessageCircle,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";

import {
  APP_STORE_URL,
  landingNavigation,
  workflowSteps,
} from "../features/landing/content";
import {
  ChatPreview,
  FounderProgressPreview,
  HeroProductScene,
  InterviewConditionStrip,
  InterviewDiscoveryPreview,
  MapDiscoveryPreview,
  NotificationPreview,
} from "../features/landing/LandingProductVisuals";
import { MobileLanding } from "../features/landing/MobileLanding";
import { supportEmail } from "../shared/config/support";

export function LandingPage() {
  const isCompactWeb = useMediaQuery("(min-width: 768px)");

  useEffect(() => {
    document.title = "Hypofit | 실제 고객과 시작하는 검증 인터뷰";
    document.documentElement.classList.add("landing-scroll-smooth");

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousThemeColor = themeColor?.content;
    themeColor?.setAttribute("content", "#f6f7f8");

    return () => {
      document.documentElement.classList.remove("landing-scroll-smooth");
      if (themeColor && previousThemeColor) {
        themeColor.setAttribute("content", previousThemeColor);
      }
    };
  }, []);

  return (
    <div className="min-h-dvh bg-white text-hypo-text selection:bg-hypo-brand-soft selection:text-hypo-brand-strong">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-hypo-md bg-hypo-text px-4 py-2 text-sm font-black text-white transition-transform focus:translate-y-0"
      >
        본문으로 바로가기
      </a>

      {isCompactWeb ? (
        <div>
          <LandingHeader />

          <main id="main-content">
            <HeroSection />
            <AudienceSection />
            <WorkflowSection />
            <ProductSections />
            <TrustSection />
            <FinalCtaSection />
          </main>

          <LandingFooter />
        </div>
      ) : (
        <MobileLanding />
      )}
    </div>
  );
}

function useMediaQuery(query: string) {
  const getMatches = () =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? window.matchMedia(query).matches
      : false;
  const [matches, setMatches] = useState(getMatches);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#E3E9E6]/90 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-[1240px] items-center justify-between px-4 sm:h-16 sm:px-8 lg:px-10">
        <a href="#main-content" className="flex items-center gap-2.5" aria-label="Hypofit 처음으로">
          <img
            src="/brand/hypofit-mark.svg"
            alt=""
            aria-hidden="true"
            className="size-7 object-contain sm:size-8"
          />
          <strong className="font-brand text-base font-black text-hypo-text sm:text-lg">Hypofit</strong>
        </a>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="랜딩페이지 주요 메뉴">
          {landingNavigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs font-bold text-hypo-text-muted transition-colors hover:text-hypo-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/app"
            className="inline-flex min-h-9 items-center justify-center rounded-hypo-md px-2.5 text-[11px] font-black text-hypo-text transition-colors hover:bg-hypo-surface-muted hover:text-hypo-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20 sm:min-h-10 sm:px-3.5 sm:text-xs"
          >
            로그인
          </a>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-hypo-md bg-hypo-text px-3 text-[11px] font-black text-white transition-colors hover:bg-hypo-brand-strong focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20 sm:min-h-10 sm:gap-2 sm:px-4 sm:text-xs"
          >
            <span className="sm:hidden">앱 받기</span>
            <span className="hidden sm:inline">App Store에서 받기</span>
            <ArrowRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#F3F7F5] pt-10 sm:pt-20 lg:pt-24">
      <div className="mx-auto max-w-[920px] px-4 text-center sm:px-8">
        <span className="inline-flex items-center gap-2 rounded-hypo-pill border border-[#C7DCD4] bg-white px-3 py-1.5 text-xs font-black text-hypo-brand">
          <Sparkles size={14} aria-hidden="true" />
          고객 검증을 더 빠르게
        </span>
        <h1 className="mt-5 font-brand text-4xl font-black leading-[1.12] text-hypo-text sm:mt-6 sm:text-6xl lg:text-7xl">
          Hypofit
        </h1>
        <p className="mx-auto mt-4 max-w-[760px] text-[27px] font-black leading-[1.38] text-hypo-text sm:mt-6 sm:text-3xl lg:text-4xl">
          실제 타깃 고객과의
          <br className="sm:hidden" /> 검증 인터뷰를 시작하세요
          <span className="hidden sm:inline">
            <br />빠르게 모집하고 조율하세요
          </span>
        </p>
        <p className="mx-auto mt-4 max-w-[640px] text-[13px] font-bold leading-6 text-hypo-text-muted sm:mt-5 sm:text-base sm:leading-7">
          <span className="sm:hidden">
            창업자는 고객을 모집하고, 인터뷰어는 조건을 확인한 뒤 신청해요.
          </span>
          <span className="hidden sm:inline">
            창업자는 바로 모집하고, 인터뷰어는 조건과 사례비를 확인한 뒤 신청해요.
            신청 이후 일정과 진행 방식은 채팅에서 이어갈 수 있어요.
          </span>
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 sm:mt-8 sm:gap-3">
          <AppStoreBadge />
          <a
            href="#workflow"
            className="inline-flex min-h-12 items-center gap-2 rounded-hypo-md border border-[#C9D5CF] bg-white px-5 text-sm font-black text-hypo-text transition-colors hover:border-hypo-brand hover:text-hypo-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
          >
            <span className="sm:hidden">서비스 보기</span>
            <span className="hidden sm:inline">서비스 살펴보기</span>
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        </div>
        <span className="mt-2.5 block text-[10px] font-bold text-hypo-text-muted sm:mt-3 sm:text-[11px]">
          Android 버전은 준비 중이에요
        </span>
      </div>

      <HeroProductScene />
    </section>
  );
}

function AppStoreBadge() {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-12 items-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/25"
      aria-label="App Store에서 Hypofit 다운로드"
    >
      <img
        src="/brand/download-on-app-store.svg"
        alt="App Store에서 다운로드"
        className="h-12 w-auto"
      />
    </a>
  );
}

function AudienceSection() {
  return (
    <section id="for-who" className="scroll-mt-16 border-y border-[#E1E8E4] bg-white sm:scroll-mt-20">
      <div className="mx-auto grid max-w-[1240px] lg:grid-cols-2">
        <AudienceBlock
          eyebrow="FOR FOUNDERS"
          icon={<UserRoundSearch size={22} aria-hidden="true" />}
          title="서비스에 맞는 고객을 직접 만나보세요"
          body="찾는 고객과 인터뷰 조건을 분명하게 적고, 신청자의 경험을 확인한 뒤 대화를 이어가세요."
          points={["타깃 고객 조건을 담은 모집글", "지원자 경험과 가능한 시간 확인", "선정 이후 채팅으로 일정 조율"]}
        />
        <AudienceBlock
          eyebrow="FOR INTERVIEWERS"
          icon={<UsersRound size={22} aria-hidden="true" />}
          title="내 경험에 맞는 인터뷰에 참여하세요"
          body="지역, 방식, 시간과 사례비를 먼저 확인하고 내가 실제로 겪은 경험을 바탕으로 신청하세요."
          points={["검색과 지도로 조건 비교", "관련 경험을 간단히 작성", "신청 결과와 진행 상태 확인"]}
          right
        />
      </div>
    </section>
  );
}

function AudienceBlock({
  body,
  eyebrow,
  icon,
  points,
  right = false,
  title,
}: {
  body: string;
  eyebrow: string;
  icon: ReactNode;
  points: readonly string[];
  right?: boolean;
  title: string;
}) {
  return (
    <div className={`px-5 py-10 sm:px-8 sm:py-16 lg:px-14 lg:py-20 ${right ? "border-t border-[#E1E8E4] lg:border-l lg:border-t-0" : ""}`}>
      <div className="flex items-center gap-2 text-hypo-brand">
        {icon}
        <span className="text-[11px] font-black">{eyebrow}</span>
      </div>
      <h2 className="mt-4 max-w-[470px] text-[25px] font-black leading-[1.42] text-hypo-text sm:mt-5 sm:text-3xl sm:leading-[1.35]">
        {title}
      </h2>
      <p className="mt-4 max-w-[500px] text-sm font-bold leading-7 text-hypo-text-muted sm:text-base">
        {body}
      </p>
      <ul className="mt-7 space-y-3">
        {points.map((point) => (
          <li key={point} className="flex items-center gap-2.5 text-sm font-black text-hypo-text">
            <span className="grid size-5 shrink-0 place-items-center rounded-hypo-pill bg-hypo-brand-soft text-hypo-brand">
              <Check size={12} aria-hidden="true" />
            </span>
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-16 bg-[#17231F] py-14 text-white sm:scroll-mt-20 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <SectionIntro
          inverse
          eyebrow="HOW IT WORKS"
          title="모집부터 인터뷰까지 한 흐름으로 이어져요"
          body="복잡한 조사 도구 대신, 실제 고객을 만나기 위해 필요한 과정만 담았어요."
        />

        <ol className="mt-9 grid border-y border-white/15 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <li
              key={step.number}
              className={`min-h-[170px] px-1 py-6 sm:min-h-[210px] sm:px-6 sm:py-7 lg:min-h-[230px] lg:px-7 ${
                index % 2 === 1 ? "sm:border-l sm:border-white/15" : ""
              } ${index > 1 ? "border-t border-white/15 lg:border-t-0" : index === 1 ? "border-t border-white/15 sm:border-t-0" : ""} ${
                index > 0 ? "lg:border-l lg:border-white/15" : ""
              }`}
            >
              <span className="text-xs font-black text-[#72C6A9]">{step.number}</span>
              <h3 className="mt-5 text-lg font-black leading-7 text-white sm:mt-8">{step.title}</h3>
              <p className="mt-3 text-sm font-bold leading-6 text-white/60">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ProductSections() {
  return (
    <div id="product" className="scroll-mt-16 sm:scroll-mt-20">
      <ProductBand
        eyebrow="DISCOVER"
        icon={<SearchCheck size={19} aria-hidden="true" />}
        title="조건을 비교하고 나에게 맞는 인터뷰를 찾아보세요"
        body="서비스, 타깃, 지역을 검색하고 진행 방식과 사례비 조건을 비교할 수 있어요. 필요한 정보는 한눈에 읽고, 자세한 내용은 눌러 확인해요."
        points={["서비스·타깃·지역 검색", "대면·화상 진행 방식", "사례비와 예상 시간 확인"]}
        visual={<InterviewDiscoveryPreview />}
      />
      <ProductBand
        alternate
        eyebrow="NEARBY"
        icon={<MapPinned size={19} aria-hidden="true" />}
        title="지도에서 가까운 인터뷰를 살펴보세요"
        body="위치 권한을 허용하면 현재 보이는 지도 범위에 맞춰 인터뷰를 찾아볼 수 있어요. 정확한 만남 장소는 선정 이후 채팅에서 조율해요."
        points={["현재 위치 중심 탐색", "지역과 장소 검색", "지도와 목록을 함께 확인"]}
        visual={<MapDiscoveryPreview />}
      />
      <ProductBand
        eyebrow="COORDINATE"
        icon={<MessageCircle size={19} aria-hidden="true" />}
        title="신청 이후 필요한 이야기는 채팅에서 이어가세요"
        body="신청한 인터뷰의 맥락을 유지한 채 일정과 진행 방식을 조율해요. 선정, 일정, 완료 같은 중요한 상태도 같은 흐름에서 확인할 수 있어요."
        points={["인터뷰별 대화 공간", "읽지 않은 메시지와 상태", "일정과 진행 방식 조율"]}
        visual={<ChatPreview />}
      />
      <ProductBand
        alternate
        eyebrow="MANAGE"
        icon={<ClipboardCheck size={19} aria-hidden="true" />}
        title="모집글과 지원자 진행 상태를 한곳에서 관리하세요"
        body="내가 만든 인터뷰의 지원자를 확인하고, 필요한 정보를 본 뒤 채팅으로 이동할 수 있어요. 모집 상태와 인터뷰 조건도 놓치지 않게 정리해요."
        points={["지원자 목록과 신청 정보", "모집글 상태와 조건", "지원자별 채팅 바로가기"]}
        visual={
          <div className="space-y-5">
            <FounderProgressPreview />
            <InterviewConditionStrip />
          </div>
        }
      />
    </div>
  );
}

function ProductBand({
  alternate = false,
  body,
  eyebrow,
  icon,
  points,
  title,
  visual,
}: {
  alternate?: boolean;
  body: string;
  eyebrow: string;
  icon: ReactNode;
  points: readonly string[];
  title: string;
  visual: ReactNode;
}) {
  return (
    <section className={alternate ? "bg-[#F3F7F5]" : "bg-white"}>
      <div className="mx-auto grid max-w-[1240px] items-center gap-8 px-5 py-14 sm:gap-10 sm:px-8 sm:py-20 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:py-28">
        <div className={alternate ? "lg:order-2" : ""}>
          <div className="flex items-center gap-2 text-hypo-brand">
            {icon}
            <span className="text-[11px] font-black">{eyebrow}</span>
          </div>
          <h2 className="mt-4 max-w-[510px] text-[27px] font-black leading-[1.42] text-hypo-text sm:mt-5 sm:text-4xl sm:leading-[1.35]">
            {title}
          </h2>
          <p className="mt-5 max-w-[540px] text-sm font-bold leading-7 text-hypo-text-muted sm:text-base">
            {body}
          </p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-2 text-sm font-black text-hypo-text">
                <Check size={15} className="shrink-0 text-hypo-brand" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className={`mx-auto w-full max-w-[620px] lg:max-w-none ${alternate ? "lg:order-1" : ""}`}>
          {visual}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const trustItems = [
    {
      title: "조건을 먼저 확인해요",
      body: "사례비, 방식, 시간과 타깃 조건을 신청 전에 확인할 수 있어요.",
    },
    {
      title: "문제가 생기면 알릴 수 있어요",
      body: "신고, 차단과 문의 기능으로 불편하거나 부적절한 상황을 알려주세요.",
    },
    {
      title: "내 정보는 직접 관리해요",
      body: "개인정보처리방침을 확인하고 앱 안에서 계정을 삭제할 수 있어요.",
    },
  ];

  return (
    <section id="trust" className="scroll-mt-16 border-y border-[#DCE5E0] bg-white py-14 sm:scroll-mt-20 sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
        <div className="grid items-end gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
          <SectionIntro
            eyebrow="TRUST & SAFETY"
            title="조건은 미리 확인하고, 문제는 바로 알릴 수 있어요"
            body="신청 전에 인터뷰 조건을 확인하고, 불편한 일이 생기면 신고·차단·문의 기능을 이용할 수 있어요. 개인정보와 계정도 직접 관리할 수 있어요."
          />
          <NotificationPreview />
        </div>

        <div className="mt-12 grid border-y border-[#DCE5E0] lg:grid-cols-3">
          {trustItems.map((item, index) => (
            <div
              key={item.title}
              className={`px-1 py-7 sm:px-5 ${index > 0 ? "border-t border-[#DCE5E0] lg:border-l lg:border-t-0" : ""}`}
            >
              <ShieldCheck size={20} className="text-hypo-brand" aria-hidden="true" />
              <h3 className="mt-4 text-base font-black text-hypo-text">{item.title}</h3>
              <p className="mt-2 text-sm font-bold leading-6 text-hypo-text-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="bg-hypo-brand py-14 text-white sm:py-20 lg:py-24">
      <div className="mx-auto max-w-[860px] px-5 text-center sm:px-8">
        <img
          src="/brand/hypofit-mark-inverse.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto size-12 object-contain"
        />
        <h2 className="mt-5 text-[28px] font-black leading-[1.42] sm:mt-6 sm:text-4xl sm:leading-[1.35]">
          고객 검증에 필요한 대화를
          <br className="hidden sm:block" /> 지금 시작해보세요
        </h2>
        <p className="mx-auto mt-4 max-w-[600px] text-sm font-bold leading-7 text-white/75 sm:text-base">
          실제 타깃 고객을 모집하고, 내 경험에 맞는 인터뷰에 참여할 수 있어요.
        </p>
        <div className="mt-8">
          <AppStoreBadge />
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="bg-[#111916] py-10 text-white/60">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-8 px-5 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div>
          <div className="flex items-center gap-2.5">
            <img
              src="/brand/hypofit-mark-inverse.svg"
              alt=""
              aria-hidden="true"
              className="size-7 object-contain"
            />
            <strong className="font-brand text-base font-black text-white">Hypofit</strong>
          </div>
          <p className="mt-4 text-xs font-bold leading-6">
            제공자 박종인 · contentruck팀
            <br />
            문의 {supportEmail}
          </p>
          <p className="mt-3 text-[11px] font-bold">© 2026 contentruck. All rights reserved.</p>
        </div>

        <nav className="flex flex-wrap gap-x-5 gap-y-3 text-xs font-black" aria-label="법적 고지와 지원">
          <a className="transition-colors hover:text-white" href="/legal/privacy">개인정보처리방침</a>
          <a className="transition-colors hover:text-white" href="/legal/terms">이용약관</a>
          <a className="transition-colors hover:text-white" href="/account-deletion">계정 삭제</a>
          <a className="transition-colors hover:text-white" href="/support">문의하기</a>
          <a className="transition-colors hover:text-white" href="/app">웹에서 열기</a>
        </nav>
      </div>
    </footer>
  );
}

function SectionIntro({
  body,
  eyebrow,
  inverse = false,
  title,
}: {
  body: string;
  eyebrow: string;
  inverse?: boolean;
  title: string;
}) {
  return (
    <div>
      <span className={`text-[11px] font-black ${inverse ? "text-[#72C6A9]" : "text-hypo-brand"}`}>
        {eyebrow}
      </span>
      <h2 className={`mt-4 max-w-[680px] text-[28px] font-black leading-[1.42] sm:text-4xl sm:leading-[1.35] ${inverse ? "text-white" : "text-hypo-text"}`}>
        {title}
      </h2>
      <p className={`mt-4 max-w-[650px] text-sm font-bold leading-7 sm:text-base ${inverse ? "text-white/60" : "text-hypo-text-muted"}`}>
        {body}
      </p>
    </div>
  );
}
