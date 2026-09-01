const sourceRoot = "../../docs/assets/readme/app-screens";

const frames = {
  1: {
    eyebrow: "CUSTOMER INTERVIEW",
    headline: "실제 고객과\n검증 인터뷰를 시작하세요",
    body: "모집부터 신청, 일정 조율까지 한곳에서 이어가요.",
    primary: `${sourceRoot}/interviews.jpg`,
    secondary: `${sourceRoot}/interview-detail.jpg`,
    footer: "고객 검증을 더 빠르게",
    tone: "mint",
  },
  2: {
    eyebrow: "DISCOVER NEARBY",
    headline: "조건에 맞는 인터뷰를\n더 빠르게 찾아보세요",
    body: "검색과 지도에서 방식, 지역과 사례비를 비교해요.",
    primary: `${sourceRoot}/map.jpg`,
    secondary: `${sourceRoot}/interview-detail.jpg`,
    footer: "검색과 지도로 간편하게",
    tone: "warm",
  },
  3: {
    eyebrow: "COORDINATE TOGETHER",
    headline: "신청 이후 일정과 방식은\n채팅에서 조율해요",
    body: "어떤 인터뷰인지 확인하며 중요한 대화를 이어가요.",
    primary: `${sourceRoot}/chat.jpg`,
    secondary: `${sourceRoot}/interview-detail.jpg`,
    footer: "인터뷰에 연결된 대화",
    tone: "deep",
  },
  4: {
    eyebrow: "TRACK PROGRESS",
    headline: "내 인터뷰 진행 상황을\n한눈에 확인하세요",
    body: "신청과 모집 현황을 확인하고 다음 할 일을 이어가요.",
    primary: `${sourceRoot}/home-current-brand.png`,
    secondary: `${sourceRoot}/chat.jpg`,
    footer: "모집과 신청 현황을 한곳에서",
    tone: "mint",
  },
};

const query = new URLSearchParams(window.location.search);
const frameNumber = Number(query.get("frame") || "1");
const format = query.get("format") || "apple";
const frame = frames[frameNumber] || frames[1];
const root = document.documentElement;

root.dataset.format = format;
root.dataset.tone = frame.tone;
document.body.dataset.ready = "false";

document.querySelector("#eyebrow").textContent = frame.eyebrow;
document.querySelector("#headline").textContent = frame.headline;
document.querySelector("#body").textContent = frame.body;
document.querySelector("#footer-copy").textContent = frame.footer;
document.querySelector("#sequence").textContent = `${String(frameNumber).padStart(2, "0")} / ${format === "play" ? "04" : "03"}`;

const primary = document.querySelector("#primary-screen");
const secondary = document.querySelector("#secondary-screen");
primary.src = frame.primary;
secondary.src = frame.secondary;

if (format === "readme") {
  document.querySelector("#eyebrow").textContent = "실제 고객과 시작하는 검증 인터뷰";
  document.querySelector("#headline").textContent = "고객을 찾고,\n인터뷰를 끝까지";
  document.querySelector("#body").textContent = "모집 · 신청 · 채팅 · 진행 관리";
  document.querySelector("#footer-copy").textContent = "iOS에서 지금 이용할 수 있어요";
  document.querySelector("#sequence").textContent = "hypofit.bukae.co.kr";
  primary.src = `${sourceRoot}/interviews.jpg`;
  secondary.src = `${sourceRoot}/map.jpg`;

  const third = document.createElement("figure");
  third.className = "phone phone--tertiary";
  third.setAttribute("aria-hidden", "true");
  third.innerHTML = `<img src="${sourceRoot}/chat.jpg" alt="" />`;
  document.querySelector(".product-stage").append(third);
}

if (format === "feature") {
  document.querySelector("#headline").textContent = "고객을 찾고,\n인터뷰를 끝까지";
  document.querySelector("#body").textContent = "실제 타깃 고객과 시작하는\n고객 인터뷰 매칭 서비스";
}

await Promise.all(
  [...document.images].map((image) => {
    if (image.complete) return Promise.resolve();
    return new Promise((resolve, reject) => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", reject, { once: true });
    });
  }),
);
await document.fonts.ready;
document.body.dataset.ready = "true";
