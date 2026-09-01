import {
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

export function MobileLanding() {
  return (
    <div className="min-h-dvh bg-landing-bg text-landing-foreground">
      <MobileHeader />
      <main id="main-content" tabIndex={-1}>
        <MobileHero />
        <MobileAudienceBridge />
        <MobileWhyHypofit />
        <MobileOrganizerStories />
        <MobileDashboard />
        <MobileParticipant />
        <MobileChat />
        <MobileWorkflow />
        <MobileContinuity />
        <MobileDownload />
      </main>
      <LandingFooter mobile />
    </div>
  );
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-landing-border/85 bg-landing-bg/92 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4">
        <a
          href="#mobile-top"
          className="flex items-center gap-2"
          aria-label="Hypofit 모바일 랜딩 처음으로"
        >
          <img
            src="/brand/hypofit-mark.svg"
            alt=""
            aria-hidden="true"
            className="size-7"
          />
          <strong className="font-brand text-base font-bold tracking-[-0.03em]">
            Hypofit
          </strong>
        </a>
        <a
          href="#mobile-download"
          className="inline-flex min-h-9 items-center rounded-[9px] bg-landing-primary px-3 text-[12px] font-semibold text-white transition-colors hover:bg-landing-primary-hover focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-landing-primary/25"
        >
          앱 다운로드
        </a>
      </div>
    </header>
  );
}

function MobileHero() {
  return (
    <section
      id="mobile-top"
      className="landing-hero-scene scroll-mt-16 overflow-hidden px-5 pb-5 pt-10"
    >
      <div className="landing-hero-copy mx-auto max-w-[430px]">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold text-landing-primary">
          <span
            className="size-1.5 rounded-full bg-landing-accent"
            aria-hidden="true"
          />
          인터뷰 · 설문조사 · 베타테스트 · 연구 실험
        </p>
        <h1 className="mt-5 text-[44px] font-bold leading-[1.07] tracking-[-0.058em]">
          <span className="block">필요한 사람을 만나,</span>
          <span className="block text-landing-primary">답을 더 빠르게</span>
          <span className="block text-landing-primary">확인하세요.</span>
        </h1>
        <p className="mt-5 text-[15px] leading-7 text-landing-muted">
          인터뷰, 설문조사, 베타테스트, 연구 실험까지. 목적에 맞는 참여자를
          모집하고, 내 경험에 맞는 공고를 찾아 참여하세요.
        </p>
        <LandingStoreBadges className="mt-7 gap-2" compact />
        <p className="mt-3 text-[11px] leading-5 text-landing-muted">
          iPhone에서 이용할 수 있으며 Android 앱은 출시를 준비하고 있어요.
        </p>
        <div className="landing-hero-visual">
          <LandingHeroPhoneStage mobile />
        </div>
      </div>
    </section>
  );
}

function MobileAudienceBridge() {
  return (
    <section className="bg-white px-5 py-20">
      <div data-landing-reveal className="mx-auto max-w-[430px]">
        <LandingSectionHeader
          eyebrow="FOR ORGANIZERS & PARTICIPANTS"
          title="하나의 Hypofit, 필요할 때 모집하고 참여하세요"
          body="모집과 참여를 한곳에서 연결하고, 목적에 맞는 다음 단계까지 자연스럽게 이어가요."
        />
        <div className="mt-10 divide-y divide-landing-border border-y border-landing-border">
          {landingAudienceSections.map((section) => (
            <article key={section.id} className="py-7">
              <span className="text-[11px] font-bold tracking-[0.08em] text-landing-primary">
                {section.eyebrow}
              </span>
              <h3 className="mt-3 text-[23px] font-bold leading-[1.25] tracking-[-0.04em]">
                {section.title}
              </h3>
              <p className="mt-3 text-[13px] leading-6 text-landing-muted">
                {section.body}
              </p>
              <ul className="mt-4 space-y-2.5">
                {section.points.map((point) => (
                  <li
                    key={point}
                    className="flex items-center gap-2.5 text-[13px] font-semibold leading-5"
                  >
                    <Check
                      size={14}
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
        <p className="mt-7 text-[13px] font-semibold text-landing-primary">
          모집과 참여 모두 모바일 앱과 웹에서 사용할 수 있어요.
        </p>
      </div>
    </section>
  );
}

function MobileWhyHypofit() {
  return (
    <section className="bg-[#F3F7F3] px-5 py-20">
      <div data-landing-reveal className="mx-auto max-w-[430px]">
        <LandingSectionHeader
          eyebrow="WHY HYPOFIT"
          title="흩어진 모집과 참여 과정을 한곳에서 이어가세요"
          body="공고부터 신청·참여, 연락과 진행 상태까지 한곳에서 관리하고 필요한 다음 행동을 Hypofit 안에서 이어갈 수 있어요."
        />
        <div className="mt-10">
          <LandingWorkflowComparison compact />
        </div>
      </div>
    </section>
  );
}

function MobileOrganizerStories() {
  return (
    <div id="product" className="scroll-mt-16">
      {landingOrganizerStories.map((story, index) => (
        <section
          key={story.id}
          className={
            index === 1 ? "bg-[#F3F7F3] px-5 py-20" : "bg-white px-5 py-20"
          }
        >
          <div data-landing-reveal className="mx-auto max-w-[430px]">
            <div className="flex items-center gap-2 text-landing-primary">
              <ClipboardCheck size={17} aria-hidden="true" />
              <span className="text-[11px] font-bold tracking-[0.08em]">
                ORGANIZER STORY {story.number}
              </span>
            </div>
            <h2 className="mt-4 text-[31px] font-bold leading-[1.16] tracking-[-0.05em]">
              {story.title}
            </h2>
            <p className="mt-4 text-[14px] leading-7 text-landing-muted">
              {story.body}
            </p>
            <div className="relative mx-auto mt-9 flex h-[430px] items-center justify-center">
              {story.id === "review" ? (
                <LandingScreenPlaceholder label="신청 · 참여 관리 화면" />
              ) : (
                <LandingPhoneScreen
                  className="relative z-10 w-[214px]"
                  kind="detail"
                />
              )}
            </div>
            <ul className="mt-7 space-y-3">
              {story.points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-[13px] font-semibold leading-5"
                >
                  <Check
                    className="mt-0.5 shrink-0 text-landing-primary"
                    size={15}
                    aria-hidden="true"
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}
    </div>
  );
}

function MobileDashboard() {
  return (
    <section id="dashboard" className="scroll-mt-16 bg-white px-5 py-20">
      <div data-landing-reveal className="mx-auto max-w-[430px]">
        <LandingSectionHeader
          eyebrow="MOBILE & WEB"
          title="앱에서도, 웹에서도 같은 Hypofit을 사용하세요"
          body="공고를 만들고 찾고, 신청과 참여를 확인하며 필요한 다음 단계를 이어가는 핵심 기능을 모바일 앱과 웹에서 모두 사용할 수 있어요."
        />
        <div className="mt-10 flex h-[230px] items-center justify-center border-y border-landing-border">
          <LandingScreenPlaceholder label="Hypofit Web 화면" />
        </div>
      </div>
    </section>
  );
}

function MobileParticipant() {
  return (
    <section className="bg-[#F3F7F3] px-5 py-20">
      <div data-landing-reveal className="mx-auto max-w-[430px]">
        <div className="flex items-center gap-2 text-landing-primary">
          <SearchCheck size={17} aria-hidden="true" />
          <span className="text-[11px] font-bold tracking-[0.08em]">
            PARTICIPANT EXPERIENCE
          </span>
        </div>
        <h2 className="mt-4 text-[31px] font-bold leading-[1.16] tracking-[-0.05em]">
          내 경험과 조건에 맞는 공고를 쉽게 찾아보세요
        </h2>
        <p className="mt-4 text-[14px] leading-7 text-landing-muted">
          공고 유형, 참여 방식, 보상과 예상 시간이나 참여 기간을 비교하고,
          지도에서 주변의 대면 공고도 확인할 수 있어요.
        </p>
        <div className="relative mx-auto mt-9 flex h-[465px] items-center justify-center">
          <div
            className="absolute size-[290px] rounded-full bg-landing-soft-mint blur-3xl"
            aria-hidden="true"
          />
          <LandingPhoneScreen
            className="relative z-20 w-[214px] -rotate-[3deg]"
            kind="interviews"
          />
          <LandingPhoneScreen
            className="absolute bottom-0 right-[2%] z-10 w-[138px] rotate-[6deg]"
            kind="map"
          />
        </div>
        <div className="mt-7 space-y-3">
          <p className="flex items-center gap-2.5 text-[13px] font-semibold">
            <Check
              size={14}
              className="text-landing-primary"
              aria-hidden="true"
            />
            유형 · 방식 · 보상 비교
          </p>
          <p className="flex items-center gap-2.5 text-[13px] font-semibold">
            <Clock3
              size={14}
              className="text-landing-primary"
              aria-hidden="true"
            />
            예상 시간이나 참여 기간 확인
          </p>
          <p className="flex items-center gap-2.5 text-[13px] font-semibold">
            <MapPinned
              size={14}
              className="text-landing-primary"
              aria-hidden="true"
            />
            대면 공고는 지도에서 지역 조건 확인
          </p>
        </div>
      </div>
    </section>
  );
}

function MobileChat() {
  return (
    <section className="bg-white px-5 py-20">
      <div data-landing-reveal className="mx-auto max-w-[430px]">
        <div className="flex items-center gap-2 text-landing-primary">
          <MessageCircle size={17} aria-hidden="true" />
          <span className="text-[11px] font-bold tracking-[0.08em]">
            SHARED EXPERIENCE
          </span>
        </div>
        <h2 className="mt-4 text-[31px] font-bold leading-[1.16] tracking-[-0.05em]">
          필요할 때 바로 대화를 이어가세요
        </h2>
        <p className="mt-4 text-[14px] leading-7 text-landing-muted">
          선정이나 일정 조율이 필요한 공고라면 채팅에서 시간과 장소, 온라인 링크
          등 진행에 필요한 내용을 조율할 수 있어요.
        </p>
        <div className="relative mx-auto mt-9 flex h-[430px] items-center justify-center">
          <LandingPhoneScreen className="relative z-10 w-[214px]" kind="chat" />
        </div>
      </div>
    </section>
  );
}

function MobileWorkflow() {
  return (
    <section id="workflow" className="scroll-mt-16 bg-landing-bg px-5 py-20">
      <div data-landing-reveal className="mx-auto max-w-[430px]">
        <LandingSectionHeader
          eyebrow="HOW IT WORKS"
          title="공고에 맞는 방식으로 참여가 이어져요"
          body="바로 참여하는 설문부터 선정과 일정 조율이 필요한 인터뷰까지, 필요한 단계만 자연스럽게 이어가요."
        />
        <ol className="mt-10 border-l border-landing-border pl-5">
          {workflowSteps.map((step) => (
            <li key={step.number} className="relative pb-8 last:pb-0">
              <span
                className="absolute -left-[29px] top-0 grid size-4 place-items-center rounded-full border border-landing-primary bg-landing-bg text-[0px]"
                aria-hidden="true"
              />
              <span className="text-[11px] font-bold text-landing-primary">
                {step.number}
              </span>
              <h3 className="mt-2 text-[17px] font-bold tracking-[-0.03em]">
                {step.title}
              </h3>
              <p className="mt-2 text-[13px] leading-6 text-landing-muted">
                {step.mobileBody}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function MobileContinuity() {
  return (
    <section
      id="continuity"
      className="scroll-mt-16 overflow-hidden bg-landing-forest px-5 py-20 text-white"
    >
      <div data-landing-reveal className="mx-auto max-w-[430px]">
        <span className="text-[11px] font-bold tracking-[0.08em] text-landing-accent">
          ACTIVITY & PROGRESS
        </span>
        <h2 className="mt-4 text-[32px] font-bold leading-[1.16] tracking-[-0.052em]">
          내 공고와 참여 상황, 다음 할 일을 한눈에 확인하세요
        </h2>
        <p className="mt-4 text-[14px] leading-7 text-white/70">
          내 공고와 참여 현황, 새 메시지와 진행 상태를 한곳에서 보고 필요한
          행동을 바로 이어갈 수 있어요.
        </p>
        <div className="mt-6 flex items-center gap-2 text-[13px] font-semibold text-white/85">
          <Route size={17} className="text-landing-accent" aria-hidden="true" />
          공고 · 신청 · 참여 · 진행을 한곳에서
        </div>
        <div className="relative mx-auto mt-9 flex h-[410px] items-center justify-center">
          <div
            className="absolute size-[280px] rounded-full bg-landing-accent/10 blur-3xl"
            aria-hidden="true"
          />
          <LandingPhoneScreen
            className="relative z-10 w-[212px] rotate-[3deg]"
            kind="home"
          />
        </div>
      </div>
    </section>
  );
}

function MobileDownload() {
  return (
    <section
      id="mobile-download"
      className="landing-final-cta scroll-mt-16 px-5 py-20"
    >
      <div data-landing-reveal className="mx-auto max-w-[430px] text-center">
        <img
          src="/brand/hypofit-mark.svg"
          alt=""
          aria-hidden="true"
          className="mx-auto size-8"
        />
        <h2 className="mt-5 text-[32px] font-bold leading-[1.15] tracking-[-0.052em]">
          모집도 참여도, Hypofit에서 시작하세요.
        </h2>
        <p className="mt-4 text-[14px] leading-7 text-landing-muted">
          인터뷰, 설문조사, 베타테스트, 연구 실험 등 다양한 공고를 만들고
          찾아보세요.
        </p>
        <LandingStoreBadges className="mt-7 justify-center" compact />
      </div>
    </section>
  );
}
