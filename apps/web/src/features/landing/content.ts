export const APP_STORE_URL =
  "https://apps.apple.com/kr/app/%ED%95%98%EC%9D%B4%ED%8F%AC%ED%95%8F/id6775675046";

export const landingNavigation = [
  { href: "#for-who", label: "누구를 위한 서비스인가요" },
  { href: "#workflow", label: "이용 흐름" },
  { href: "#product", label: "주요 기능" },
  { href: "#trust", label: "안심하고 사용하세요" },
] as const;

export const workflowSteps = [
  {
    number: "01",
    title: "인터뷰를 만들거나 찾아요",
    body: "필요한 고객 조건을 적어 모집하고, 내 경험에 맞는 인터뷰를 살펴봐요.",
    mobileBody: "고객 조건을 적어 모집하거나 내 경험에 맞는 인터뷰를 찾아요.",
  },
  {
    number: "02",
    title: "경험과 시간을 전해요",
    body: "사례비와 방식을 확인한 뒤 관련 경험과 가능한 시간을 적어 신청해요.",
    mobileBody: "조건을 확인하고 관련 경험과 가능한 시간을 적어 신청해요.",
  },
  {
    number: "03",
    title: "채팅에서 조율해요",
    body: "선정 여부를 확인하고 일정과 진행 방식은 대화로 간편하게 맞춰요.",
    mobileBody: "선정 이후 일정과 진행 방식은 채팅에서 맞춰요.",
  },
  {
    number: "04",
    title: "진행 상태를 확인해요",
    body: "신청부터 완료까지 중요한 상태와 소식을 놓치지 않고 확인해요.",
    mobileBody: "신청부터 완료까지 중요한 상태와 소식을 확인해요.",
  },
] as const;

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
  {
    reward: "40,000원",
    title: "중고거래 약속 조율 경험 인터뷰",
    target: "월 2회 이상 중고거래를 하는 분",
    meta: "대면 · 수원역 인근 · 50분",
  },
] as const;
