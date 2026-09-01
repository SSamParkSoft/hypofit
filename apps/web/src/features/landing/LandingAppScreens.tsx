import chatScreenshot from "../../../../../docs/assets/readme/app-screens/chat.jpg";
import homeScreenshot from "../../../../../docs/assets/readme/app-screens/home-current-brand.png";
import interviewDetailScreenshot from "../../../../../docs/assets/readme/app-screens/interview-detail.jpg";
import interviewScreenshot from "../../../../../docs/assets/readme/app-screens/interviews.jpg";
import mapScreenshot from "../../../../../docs/assets/readme/app-screens/map.jpg";

type AppScreenKind = "chat" | "detail" | "home" | "interviews" | "map";

const screenSources = {
  chat: {
    alt: "공고 참여 과정에서 필요한 내용을 조율하는 Hypofit 채팅 화면",
    src: chatScreenshot,
  },
  detail: {
    alt: "공고 조건과 모집자 정보를 확인하는 Hypofit 앱 화면",
    src: interviewDetailScreenshot,
  },
  home: {
    alt: "내 공고와 참여 진행 상황을 확인하는 Hypofit 앱 홈 화면",
    src: homeScreenshot,
  },
  interviews: {
    alt: "공고를 탐색하고 조건을 비교하는 Hypofit 앱 화면",
    src: interviewScreenshot,
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
    <figure
      className={`overflow-hidden rounded-[38px] border-[7px] border-[#152019] bg-[#152019] shadow-[0_2px_5px_rgb(8_24_15_/_0.12),0_18px_40px_rgb(8_24_15_/_0.16),0_46px_100px_rgb(8_24_15_/_0.19)] ${className}`}
    >
      <div className="relative overflow-hidden rounded-[31px] bg-white">
        <img
          alt={screen.alt}
          className="block h-auto w-full"
          decoding={priority ? "sync" : "async"}
          loading={priority ? "eager" : "lazy"}
          src={screen.src}
          height={2778}
          width={1279}
        />
      </div>
    </figure>
  );
}

export function LandingScreenPlaceholder({
  className = "",
  inverse = false,
  label,
}: {
  className?: string;
  inverse?: boolean;
  label: string;
}) {
  return (
    <p
      className={`text-center text-[15px] font-semibold leading-7 tracking-[-0.025em] ${
        inverse ? "text-white/70" : "text-landing-muted"
      } ${className}`}
    >
      {label}
    </p>
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
        kind="interviews"
      />
      <LandingPhoneScreen
        className={
          mobile
            ? "absolute right-[7%] top-0 z-20 w-[56%] rotate-[4deg]"
            : "absolute right-[6%] top-[2%] z-20 w-[50%] rotate-[4deg]"
        }
        kind="home"
        priority
      />
    </div>
  );
}
