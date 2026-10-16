import activityScreenshot from "../../../../../docs/store-assets/landing/activity.webp";
import applicantsScreenshot from "../../../../../docs/store-assets/landing/applicants.webp";
import chatScreenshot from "../../../../../docs/store-assets/landing/chat.webp";
import createScreenshot from "../../../../../docs/store-assets/landing/create.webp";
import discoveryScreenshot from "../../../../../docs/store-assets/landing/discovery.webp";
import mapScreenshot from "../../../../../docs/store-assets/landing/map.webp";
import webScreenshot from "../../../../../docs/store-assets/landing/web-discovery.webp";
import iphoneBezel from "../../../../../docs/store-assets/landing/iphone-17-pro-silver.webp";

type AppScreenKind = "activity" | "applicants" | "chat" | "create" | "discovery" | "map";

const screenSources = {
  chat: {
    alt: "공고 참여 과정에서 필요한 내용을 조율하는 Hypofit 채팅 화면",
    src: chatScreenshot,
  },
  create: {
    alt: "인터뷰·설문조사·베타테스트·연구 실험 유형을 선택하는 Hypofit 공고 만들기 화면",
    src: createScreenshot,
  },
  applicants: {
    alt: "신청자 목록과 진행 상태를 확인하는 Hypofit 지원자 관리 화면",
    src: applicantsScreenshot,
  },
  activity: {
    alt: "내 참여와 내 공고의 진행 상태를 확인하는 Hypofit 내 활동 화면",
    src: activityScreenshot,
  },
  discovery: {
    alt: "공고를 탐색하고 조건을 비교하는 Hypofit 앱 화면",
    src: discoveryScreenshot,
  },
  map: {
    alt: "지도에서 주변 대면 공고를 확인하는 Hypofit 앱 화면",
    src: mapScreenshot,
  },
} as const;

export function LandingPhoneScreen({
  className = "",
  kind,
  priority = false,
}: {
  className?: string;
  kind: AppScreenKind;
  priority?: boolean;
}) {
  const screen = screenSources[kind];

  return (
    <figure className={className}>
      <div className="relative aspect-[1350/2760] w-full">
        {/* Official 1350×2760 bezel: 1206×2622 screen at (72, 69). */}
        <img
          alt={screen.alt}
          className="absolute left-[5.333333%] top-[2.5%] h-[95%] w-[89.333333%] rounded-[14%/6.5%] bg-white object-contain"
          decoding={priority ? "sync" : "async"}
          loading={priority ? "eager" : "lazy"}
          {...(priority ? { fetchpriority: "high" } : {})}
          src={screen.src}
          height={1565}
          width={720}
        />
        <img
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          src={iphoneBezel}
          width={810}
          height={1656}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
        />
      </div>
    </figure>
  );
}

export function LandingWebScreen() {
  return (
    <figure className="w-full overflow-hidden rounded-xl border border-landing-border bg-white">
      <img
        alt="검색과 필터, 공고 목록과 선택한 설문 상세를 함께 확인하는 Hypofit 웹 화면"
        className="block h-auto w-full"
        src={webScreenshot}
        width={1470}
        height={630}
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}

export function LandingHeroPhoneStage({
  mobile = false,
}: {
  mobile?: boolean;
}) {
  return (
    <div
      aria-label="Hypofit 모바일 앱 화면"
      className={`landing-phone-stage relative isolate mx-auto ${mobile ? "h-[390px] max-w-[430px]" : "h-[520px] sm:h-[620px] lg:h-[720px] max-w-[610px]"}`}
    >
      <LandingPhoneScreen
        className={
          mobile
            ? "absolute bottom-0 left-[6%] z-10 w-[44%] -rotate-[7deg] opacity-95"
            : "absolute bottom-[9%] left-[4%] z-10 w-[39%] -rotate-[7deg] opacity-95"
        }
        kind="activity"
      />
      <LandingPhoneScreen
        className={
          mobile
            ? "absolute right-[7%] top-0 z-20 w-[56%] rotate-[4deg]"
            : "absolute right-[6%] top-[2%] z-20 w-[50%] rotate-[4deg]"
        }
        kind="discovery"
        priority
      />
    </div>
  );
}
