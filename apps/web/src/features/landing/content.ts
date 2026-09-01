export const APP_STORE_URL =
  "https://apps.apple.com/kr/app/%ED%95%98%EC%9D%B4%ED%8F%AC%ED%95%8F/id6775675046";

export interface LandingNavigationItem {
  href: `#${string}`;
  label: string;
}

export const landingNavigation = [
  { href: "#product", label: "제품" },
  { href: "#workflow", label: "이용 방법" },
  { href: "#dashboard", label: "앱 · 웹" },
  { href: "#continuity", label: "진행 관리" },
] as const satisfies readonly LandingNavigationItem[];

export type LandingAudienceId = "organizers" | "participants";

export interface LandingAudienceSection {
  body: string;
  eyebrow: string;
  id: LandingAudienceId;
  points: readonly string[];
  title: string;
}

export const landingAudienceSections = [
  {
    id: "organizers",
    eyebrow: "FOR ORGANIZERS",
    title: "필요한 경험과 조건을 갖춘 참여자를 모집하세요",
    body: "기업, 창업팀, 연구자와 프로젝트 운영자는 목적에 맞는 공고를 만들고 필요한 참여자를 모집할 수 있어요.",
    points: [
      "모집 목적과 참여 조건 작성",
      "진행 방식과 예상 시간·기간 안내",
      "보상과 참여 흐름 설정",
    ],
  },
  {
    id: "participants",
    eyebrow: "FOR PARTICIPANTS",
    title: "내 경험에 맞는 참여 기회를 찾아보세요",
    body: "공고 유형, 참여 방식, 보상과 예상 시간이나 참여 기간을 확인하고 나에게 맞는 공고를 찾아 참여할 수 있어요.",
    points: [
      "공고 유형과 참여 조건 비교",
      "보상과 예상 시간·기간 확인",
      "신청하거나 바로 참여",
    ],
  },
] as const satisfies readonly LandingAudienceSection[];

export interface LandingWorkflowStep {
  body: string;
  mobileBody: string;
  number: string;
  title: string;
}

export const workflowSteps = [
  {
    number: "01",
    title: "목적에 맞는 공고를 만들어요",
    body: "모집자는 공고 유형, 참여 조건, 진행 방식과 보상을 정해요.",
    mobileBody: "공고 유형과 참여 조건, 진행 방식과 보상을 정해요.",
  },
  {
    number: "02",
    title: "조건을 확인하고 신청하거나 참여해요",
    body: "참여자는 공고에 따라 신청을 남기거나 바로 설문·테스트 등에 참여할 수 있어요.",
    mobileBody: "공고에 따라 신청을 남기거나 바로 참여할 수 있어요.",
  },
  {
    number: "03",
    title: "필요한 경우 참여자를 확인하고 선정해요",
    body: "선발이 필요한 공고는 신청자의 경험과 답변을 보고 다음 단계를 정해요.",
    mobileBody: "선발이 필요한 공고는 신청 내용을 보고 다음 단계를 정해요.",
  },
  {
    number: "04",
    title: "공고에 맞는 다음 단계로 이어가요",
    body: "채팅, 일정 조율, 외부 링크 등 필요한 방식으로 다음 단계를 이어가요.",
    mobileBody: "필요한 방식으로 다음 단계를 이어가요.",
  },
] as const satisfies readonly LandingWorkflowStep[];

export interface LandingOrganizerStory {
  body: string;
  id: "recruit" | "review";
  number: string;
  points: readonly string[];
  title: string;
}

export const landingOrganizerStories = [
  {
    id: "recruit",
    number: "01",
    title: "목적과 조건을 담아 참여자를 모집하세요",
    body: "인터뷰, 설문조사, 베타테스트, 연구 실험 등 공고 유형을 선택하고, 참여 조건과 진행 방식, 예상 시간이나 참여 기간, 보상을 분명하게 안내하세요.",
    points: [
      "공고 유형과 참여 조건 안내",
      "진행 방식과 예상 시간이나 참여 기간 설정",
      "현금·기프티콘·제품 등 보상 안내",
    ],
  },
  {
    id: "review",
    number: "02",
    title: "공고에 맞게 신청과 참여를 관리하세요",
    body: "바로 참여할 수 있는 설문부터 선발이 필요한 인터뷰와 테스트까지, 공고 방식에 맞게 필요한 다음 단계를 이어가요.",
    points: [
      "신청 내용과 관련 경험 확인",
      "필요한 경우 참여자 선정",
      "공고 유형에 맞는 다음 단계 연결",
    ],
  },
] as const satisfies readonly LandingOrganizerStory[];

export const landingFooterLinks = [
  { href: "/legal/privacy", label: "개인정보처리방침" },
  { href: "/legal/terms", label: "이용약관" },
  { href: "/account-deletion", label: "계정 삭제" },
] as const;

// Retained only for the legacy, currently unmounted LandingProductVisuals module.
export const interviewExamples = [
  {
    reward: "30,000원",
    title: "1인 가구 식재료 관리 경험 인터뷰",
    target: "주 2회 이상 직접 장을 보는 1인 가구",
    meta: "대면 · 안산 중앙동 · 60분",
  },
  {
    reward: "20,000원",
    title: "운동 기록 앱 사용 경험 인터뷰",
    target: "최근 3개월 안에 운동 앱을 사용한 분",
    meta: "화상 · 일정 조율 · 40분",
  },
] as const;
