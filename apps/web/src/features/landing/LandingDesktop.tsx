import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock3,
  MapPinned,
  MessageCircle,
  Route,
  SearchCheck,
} from "lucide-react";

import {
  LandingHeroPhoneStage,
  LandingPhoneScreen,
  LandingScreenPlaceholder,
} from "./LandingAppScreens";
import {
  landingAudienceSections,
  landingOrganizerStories,
  workflowSteps,
} from "./content";
import {
  LandingFooter,
  LandingSectionHeader,
  LandingStoreBadges,
  LandingWorkflowComparison,
} from "./LandingCommon";

interface LandingDesktopProps {
  isAuthenticated?: boolean;
  showWebEntry?: boolean;
}

export function LandingDesktop({
  isAuthenticated = false,
  showWebEntry = true,
}: LandingDesktopProps) {
  return (
    <div className="bg-landing-bg text-landing-foreground">
      <LandingHeader
        isAuthenticated={isAuthenticated}
        showWebEntry={showWebEntry}
      />
      <main id="main-content" tabIndex={-1}>
        <HeroSection showWebEntry={showWebEntry} />
        <AudienceBridgeSection />
        <WhyHypofitSection />
        <OrganizerStoriesSection />
        <DashboardSection />
        <ParticipantSection />
        <ChatSection />
        <WorkflowSection />
        <ContinuitySection />
        <FinalCtaSection showWebEntry={showWebEntry} />
      </main>
      <LandingFooter />
    </div>
  );
}

function LandingHeader({
  isAuthenticated,
  showWebEntry,
}: {
  isAuthenticated: boolean;
  showWebEntry: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-landing-border/85 bg-landing-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[78px] w-full max-w-[1240px] items-center justify-between px-6 lg:px-8">
        <a
          href="#main-content"
          className="flex items-center gap-2.5"
          aria-label="Hypofit 처음으로"
        >
          <img
            src="/brand/hypofit-mark.svg"
            alt=""
            aria-hidden="true"
            className="size-8 object-contain"
          />
          <strong className="font-brand text-[19px] font-bold tracking-[-0.03em]">
            Hypofit
          </strong>
        </a>
        <div className="flex items-center gap-3">
          {showWebEntry ? (
            <a
              href="/app"
              className="inline-flex min-h-10 items-center px-2 text-[13px] font-semibold text-landing-muted transition-colors hover:text-landing-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-landing-primary/20"
            >
              {isAuthenticated ? "대시보드" : "로그인"}
            </a>
          ) : null}
          <a
            href="#download"
            className="inline-flex min-h-10 items-center rounded-[9px] bg-landing-primary px-4 text-[13px] font-semibold text-white transition-colors hover:bg-landing-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-landing-primary/25"
          >
            앱 다운로드
          </a>
        </div>
      </div>
    </header>
  );
}

function HeroSection({ showWebEntry }: { showWebEntry: boolean }) {
  return (
    <section className="landing-hero-scene overflow-hidden">
      <div className="mx-auto grid min-h-[min(860px,calc(100dvh-78px))] max-w-[1240px] items-center gap-8 px-6 pb-16 pt-10 lg:grid-cols-[0.96fr_1.04fr] lg:px-8 lg:py-14">
        <div className="landing-hero-copy relative z-10 pb-8 lg:pb-0">
          <p className="inline-flex items-center gap-2 text-[12px] font-bold text-landing-primary">
            <span
              className="size-2 rounded-full bg-landing-accent"
              aria-hidden="true"
            />
            인터뷰 · 설문조사 · 베타테스트 · 연구 실험
          </p>
          <h1 className="mt-6 max-w-[720px] text-[clamp(3.25rem,4.5vw,4.3rem)] font-bold leading-[1.04] tracking-[-0.055em] text-landing-foreground">
            <span className="block">필요한 사람을 만나,</span>
            <span className="block text-landing-primary">답을 더 빠르게</span>
            <span className="block text-landing-primary">확인하세요.</span>
          </h1>
          <p className="mt-6 max-w-[570px] text-[18px] font-medium leading-[1.72] tracking-[-0.025em] text-landing-muted">
            인터뷰, 설문조사, 베타테스트, 연구 실험까지. 목적에 맞는 참여자를
            모집하고, 내 경험에 맞는 공고를 찾아 참여하세요.
          </p>
          <LandingStoreBadges className="mt-8" />
          {showWebEntry ? (
            <a
              href="/app"
              className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-landing-primary transition-colors hover:text-landing-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-landing-primary/20"
            >
              웹에서 이용하기 <ArrowRight size={15} aria-hidden="true" />
            </a>
          ) : null}
          <p className="mt-4 text-[12px] font-medium text-landing-muted">
            iPhone에서 이용할 수 있으며 Android 앱은 출시를 준비하고 있어요.
          </p>
        </div>
        <div className="landing-hero-visual relative z-10">
          <LandingHeroPhoneStage />
        </div>
      </div>
    </section>
  );
}

function AudienceBridgeSection() {
  return (
    <section className="bg-white py-[120px]">
      <div data-landing-reveal className="mx-auto max-w-[1240px] px-6 lg:px-8">
        <LandingSectionHeader
          eyebrow="FOR ORGANIZERS & PARTICIPANTS"
          title="하나의 Hypofit, 필요할 때 모집하고 참여하세요"
          body="모집과 참여를 한곳에서 연결하고, 목적에 맞는 다음 단계까지 자연스럽게 이어가요."
          className="lg:max-w-none"
        />
        <div className="mt-16 grid border-y border-landing-border lg:grid-cols-2">
          {landingAudienceSections.map((section, index) => (
            <article
              key={section.id}
              className={`py-10 ${index === 1 ? "lg:border-l lg:border-landing-border lg:pl-6" : "lg:pr-6"}`}
            >
              <span className="text-[12px] font-bold tracking-[0.08em] text-landing-primary">
                {section.eyebrow}
              </span>
              <h3
                className={`mt-4 max-w-[470px] text-[31px] font-bold leading-[1.2] tracking-[-0.045em] ${index === 0 ? "lg:max-w-none lg:whitespace-nowrap lg:text-[27px]" : ""}`}
              >
                {section.title}
              </h3>
              <p className="mt-4 max-w-[490px] text-[15px] leading-7 text-landing-muted">
                {section.body}
              </p>
              <ul className="mt-5 space-y-3">
                {section.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-3 text-sm font-semibold"
                  >
                    <Check
                      size={15}
                      className="text-landing-primary"
                      aria-hidden="true"
                    />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="mt-8 text-sm font-semibold text-landing-primary">
          모집과 참여 모두 모바일 앱과 웹에서 사용할 수 있어요.
        </p>
      </div>
    </section>
  );
}

function WhyHypofitSection() {
  return (
    <section className="bg-[#F3F7F3] py-[120px]">
      <div data-landing-reveal className="mx-auto max-w-[1240px] px-6 lg:px-8">
        <LandingSectionHeader
          eyebrow="WHY HYPOFIT"
          title="흩어진 모집과 참여 과정을 한곳에서 이어가세요"
          body="공고부터 신청·참여, 연락과 진행 상태까지 한곳에서 관리하고 필요한 다음 행동을 Hypofit 안에서 이어갈 수 있어요."
          className="xl:max-w-none"
        />
        <div className="mt-14">
          <LandingWorkflowComparison />
        </div>
      </div>
    </section>
  );
}

function OrganizerStoriesSection() {
  return (
    <div id="product" className="scroll-mt-24">
      {landingOrganizerStories.map((story, index) => (
        <OrganizerStoryBand
          key={story.id}
          story={story}
          reverse={index === 1}
        />
      ))}
    </div>
  );
}

function OrganizerStoryBand({
  story,
  reverse,
}: {
  story: (typeof landingOrganizerStories)[number];
  reverse: boolean;
}) {
  const isReview = story.id === "review";
  return (
    <section className={reverse ? "bg-[#F3F7F3]" : "bg-white"}>
      <div
        data-landing-reveal
        className="mx-auto grid max-w-[1240px] items-center gap-16 px-6 py-[128px] lg:grid-cols-2 lg:px-8"
      >
        <div className={reverse ? "lg:order-2" : ""}>
          <div className="flex items-center gap-3 text-landing-primary">
            <ClipboardCheck size={19} aria-hidden="true" />
            <span className="text-[12px] font-bold tracking-[0.08em]">
              ORGANIZER STORY {story.number}
            </span>
          </div>
          <h2 className="mt-5 max-w-[540px] text-[48px] font-bold leading-[1.08] tracking-[-0.055em]">
            {story.title}
          </h2>
          <p className="mt-6 max-w-[540px] text-[17px] leading-[1.72] text-landing-muted">
            {story.body}
          </p>
          <ul className="mt-8 space-y-3.5">
            {story.points.map((point) => (
              <li
                key={point}
                className="flex items-center gap-3 text-sm font-semibold"
              >
                <span className="grid size-5 place-items-center rounded-full bg-landing-soft-mint text-landing-primary">
                  <Check size={13} aria-hidden="true" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div
          className={`relative mx-auto flex min-h-[570px] w-full items-center justify-center ${reverse ? "lg:order-1" : ""}`}
        >
          {isReview ? (
            <LandingScreenPlaceholder label="신청 · 참여 관리 화면" />
          ) : (
            <LandingPhoneScreen
              className="relative z-10 w-[min(294px,88vw)]"
              kind="detail"
            />
          )}
        </div>
      </div>
    </section>
  );
}

function DashboardSection() {
  return (
    <section id="dashboard" className="scroll-mt-24 bg-white py-[128px]">
      <div data-landing-reveal className="mx-auto max-w-[1240px] px-6 lg:px-8">
        <LandingSectionHeader
          eyebrow="MOBILE & WEB"
          title="앱에서도, 웹에서도 같은 Hypofit을 사용하세요"
          body="공고를 만들고 찾고, 신청과 참여를 확인하며 필요한 다음 단계를 이어가는 핵심 기능을 모바일 앱과 웹에서 모두 사용할 수 있어요."
          className="xl:max-w-none"
        />
        <div className="mt-14 flex min-h-[310px] items-center justify-center border-y border-landing-border">
          <LandingScreenPlaceholder label="Hypofit Web 화면" />
        </div>
      </div>
    </section>
  );
}

function ParticipantSection() {
  return (
    <section className="bg-[#F3F7F3] py-[128px]">
      <div
        data-landing-reveal
        className="mx-auto grid max-w-[1240px] items-center gap-16 px-6 lg:grid-cols-2 lg:px-8"
      >
        <div className="relative mx-auto flex min-h-[600px] w-full items-center justify-center">
          <div
            className="absolute size-[430px] rounded-full bg-landing-soft-mint blur-3xl"
            aria-hidden="true"
          />
          <LandingPhoneScreen
            className="relative z-20 w-[min(294px,88vw)] -rotate-[3deg]"
            kind="interviews"
          />
          <LandingPhoneScreen
            className="absolute bottom-0 right-[7%] z-10 w-[190px] rotate-[6deg]"
            kind="map"
          />
        </div>
        <div>
          <div className="flex items-center gap-3 text-landing-primary">
            <SearchCheck size={19} aria-hidden="true" />
            <span className="text-[12px] font-bold tracking-[0.08em]">
              PARTICIPANT EXPERIENCE
            </span>
          </div>
          <h2 className="mt-5 max-w-[520px] text-[48px] font-bold leading-[1.08] tracking-[-0.055em]">
            내 경험과 조건에 맞는 공고를 쉽게 찾아보세요
          </h2>
          <p className="mt-6 max-w-[510px] text-[17px] leading-[1.72] text-landing-muted">
            공고 유형, 참여 방식, 보상과 예상 시간이나 참여 기간을 비교하고,
            지도에서 주변의 대면 공고도 확인할 수 있어요.
          </p>
          <ul className="mt-8 space-y-3.5">
            <li className="flex items-center gap-3 text-sm font-semibold">
              <Check
                size={15}
                className="text-landing-primary"
                aria-hidden="true"
              />
              유형 · 방식 · 보상 비교
            </li>
            <li className="flex items-center gap-3 text-sm font-semibold">
              <Clock3
                size={15}
                className="text-landing-primary"
                aria-hidden="true"
              />
              예상 시간이나 참여 기간 확인
            </li>
            <li className="flex items-center gap-3 text-sm font-semibold">
              <MapPinned
                size={15}
                className="text-landing-primary"
                aria-hidden="true"
              />
              대면 공고는 지도에서 지역 조건 확인
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function ChatSection() {
  return (
    <section className="bg-white py-[128px]">
      <div
        data-landing-reveal
        className="mx-auto grid max-w-[1240px] items-center gap-16 px-6 lg:grid-cols-2 lg:px-8"
      >
        <div>
          <div className="flex items-center gap-3 text-landing-primary">
            <MessageCircle size={19} aria-hidden="true" />
            <span className="text-[12px] font-bold tracking-[0.08em]">
              SHARED EXPERIENCE
            </span>
          </div>
          <h2 className="mt-5 max-w-[520px] text-[48px] font-bold leading-[1.08] tracking-[-0.055em]">
            필요할 때 바로 대화를 이어가세요
          </h2>
          <p className="mt-6 max-w-[510px] text-[17px] leading-[1.72] text-landing-muted">
            선정이나 일정 조율이 필요한 공고라면 채팅에서 시간과 장소, 온라인
            링크 등 진행에 필요한 내용을 조율할 수 있어요.
          </p>
        </div>
        <div className="relative mx-auto flex min-h-[570px] w-full items-center justify-center">
          <LandingPhoneScreen className="relative z-10 w-[min(294px,88vw)]" kind="chat" />
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section id="workflow" className="scroll-mt-24 bg-landing-bg py-[128px]">
      <div data-landing-reveal className="mx-auto max-w-[1240px] px-6 lg:px-8">
        <LandingSectionHeader
          eyebrow="HOW IT WORKS"
          title="공고에 맞는 방식으로 참여가 이어져요"
          body="바로 참여하는 설문부터 선정과 일정 조율이 필요한 인터뷰까지, 필요한 단계만 자연스럽게 이어가요."
        />
        <ol className="mt-16 grid border-y border-landing-border lg:grid-cols-4">
          {workflowSteps.map((step, index) => (
            <li
              key={step.number}
              className={`min-h-[230px] px-6 py-8 ${index > 0 ? "border-l border-landing-border" : ""}`}
            >
              <span className="text-[13px] font-bold text-landing-primary">
                {step.number}
              </span>
              <h3 className="mt-12 max-w-[210px] text-xl font-bold leading-7 tracking-[-0.035em]">
                {step.title}
              </h3>
              <p className="mt-4 max-w-[240px] text-sm leading-6 text-landing-muted">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ContinuitySection() {
  return (
    <section
      id="continuity"
      className="scroll-mt-24 overflow-hidden bg-landing-forest py-[120px] text-white"
    >
      <div
        data-landing-reveal
        className="mx-auto grid max-w-[1240px] items-center gap-16 px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8"
      >
        <div>
          <span className="text-[12px] font-bold tracking-[0.08em] text-landing-accent">
            ACTIVITY & PROGRESS
          </span>
          <h2 className="mt-5 max-w-[520px] text-[48px] font-bold leading-[1.08] tracking-[-0.055em]">
            내 공고와 참여 상황, 다음 할 일을 한눈에 확인하세요
          </h2>
          <p className="mt-6 max-w-[510px] text-[17px] leading-[1.72] text-white/70">
            내 공고와 참여 현황, 새 메시지와 진행 상태를 한곳에서 보고 필요한
            행동을 바로 이어갈 수 있어요.
          </p>
          <div className="mt-9 flex items-center gap-3 text-sm font-semibold text-white/85">
            <Route
              size={20}
              className="text-landing-accent"
              aria-hidden="true"
            />
            공고 · 신청 · 참여 · 진행을 한곳에서
          </div>
        </div>
        <div className="relative mx-auto flex h-[560px] w-full max-w-[560px] items-center justify-center">
          <div
            className="absolute size-[420px] rounded-full bg-landing-accent/10 blur-3xl"
            aria-hidden="true"
          />
          <LandingPhoneScreen
            className="relative z-10 w-[286px] rotate-[4deg]"
            kind="home"
          />
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection({ showWebEntry }: { showWebEntry: boolean }) {
  return (
    <section
      id="download"
      className="landing-final-cta scroll-mt-24 py-[128px]"
    >
      <div
        data-landing-reveal
        className="mx-auto max-w-[760px] px-6 text-center"
      >
        <img
          src="/brand/hypofit-mark.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto size-10"
        />
        <h2 className="mt-6 text-[50px] font-bold leading-[1.08] tracking-[-0.055em]">
          모집도 참여도, Hypofit에서 시작하세요.
        </h2>
        <p className="mx-auto mt-6 max-w-[550px] text-[17px] leading-[1.7] text-landing-muted">
          인터뷰, 설문조사, 베타테스트, 연구 실험 등 다양한 공고를 만들고
          찾아보세요.
        </p>
        <div className="mt-9 flex items-center justify-center gap-5">
          <LandingStoreBadges />
          {showWebEntry ? (
            <a
              href="/app"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-landing-primary transition-colors hover:text-landing-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-landing-primary/20"
            >
              웹에서 이용하기 <ArrowRight size={15} aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}
