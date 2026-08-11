import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  Search,
  SlidersHorizontal,
  Users,
  Video,
} from "lucide-react";

import { interviewExamples } from "./content";

export function HeroProductScene() {
  return (
    <div className="relative mx-auto mt-8 w-full max-w-[1080px] px-4 sm:mt-12 sm:px-8 lg:mt-14">
      <div className="absolute inset-x-[8%] bottom-0 top-[18%] rounded-hypo-lg bg-[#DDEAE5]" />
      <div className="relative grid min-h-[360px] items-end gap-4 sm:min-h-[500px] lg:grid-cols-[0.78fr_1.12fr_0.78fr] lg:gap-5">
        <div className="relative z-10 hidden translate-y-8 lg:block">
          <FounderProgressPreview />
        </div>
        <div className="relative z-20 mx-auto w-full max-w-[520px]">
          <InterviewDiscoveryPreview featured />
        </div>
        <div className="relative z-10 hidden translate-y-12 lg:block">
          <ChatPreview compact />
        </div>
      </div>
    </div>
  );
}

export function InterviewDiscoveryPreview({
  compact = false,
  featured = false,
}: {
  compact?: boolean;
  featured?: boolean;
}) {
  const visibleExamples = compact ? interviewExamples.slice(0, 2) : interviewExamples;

  return (
    <div
      className={`overflow-hidden rounded-hypo-lg border border-[#CBD7D1] bg-white shadow-[0_24px_64px_rgb(22_64_54_/_0.16)] ${
        featured ? "min-h-[360px] sm:min-h-[440px]" : ""
      }`}
      aria-label="인터뷰 검색 화면 예시"
    >
      <div className="flex items-start justify-between border-b border-[#E3E9E6] px-4 py-3.5 sm:px-6 sm:py-4">
        <div>
          <strong className="block text-lg font-black text-hypo-text">인터뷰</strong>
          <span className="mt-1 block text-xs font-bold text-hypo-text-muted">
            조건에 맞는 인터뷰를 찾아보세요
          </span>
        </div>
        <Bell className="text-hypo-text" size={20} aria-hidden="true" />
      </div>

      <div className="px-4 py-3.5 sm:px-6 sm:py-4">
        <div className="flex gap-2">
          <div className="flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-hypo-md border border-hypo-border bg-[#F8FAF9] px-3 text-xs font-bold text-hypo-text-muted">
            <Search size={15} aria-hidden="true" />
            <span className="truncate">서비스, 타깃, 지역 검색</span>
          </div>
          <div className="flex min-h-10 items-center gap-1.5 rounded-hypo-md border border-hypo-border px-3 text-xs font-black text-hypo-text">
            <SlidersHorizontal size={15} aria-hidden="true" />
            필터
          </div>
        </div>

        <div className="mt-3 border-t border-[#E5E9E7]">
          {visibleExamples.map((interview, index) => (
            <div
              key={interview.title}
              className={`grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3.5 sm:py-4 ${
                index < visibleExamples.length - 1 ? "border-b border-[#E5E9E7]" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black text-hypo-reward">{interview.reward}</span>
                  <span className="text-[10px] font-bold text-hypo-text-muted">{interview.meta}</span>
                </div>
                <strong className="mt-1.5 block truncate text-sm font-black text-hypo-text">
                  {interview.title}
                </strong>
                <span className="mt-1 block truncate text-[11px] font-bold text-hypo-text-muted">
                  {interview.target}
                </span>
              </div>
              <ChevronRight className="mt-5 text-[#A1AAA5]" size={17} aria-hidden="true" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MapDiscoveryPreview({ compact = false }: { compact?: boolean }) {
  const markers = [
    { label: "2만원", left: "19%", top: "28%" },
    { label: "3만원", left: "60%", top: "20%" },
    { label: "4만원", left: "52%", top: "55%" },
    { label: "2만원", left: "76%", top: "43%" },
  ];

  return (
    <div className={`relative overflow-hidden rounded-hypo-lg border border-[#CBD7D1] bg-[#E7ECE9] shadow-[0_18px_50px_rgb(22_64_54_/_0.12)] ${compact ? "min-h-[320px]" : "min-h-[430px]"}`} aria-label="지도에서 인터뷰를 찾는 화면 예시">
      <div className="absolute left-[8%] top-0 h-full w-8 rotate-[14deg] bg-white/90" />
      <div className="absolute right-[18%] top-0 h-full w-5 -rotate-[18deg] bg-white/80" />
      <div className="absolute left-0 top-[38%] h-7 w-full -rotate-[5deg] bg-white/90" />
      <div className="absolute left-0 top-[68%] h-4 w-full rotate-[8deg] bg-[#CFD9D4]" />
      <div className="absolute inset-x-4 top-4 z-10 flex h-11 items-center gap-2 rounded-hypo-md border border-[#CDD7D2] bg-white px-4 shadow-hypo-panel">
        <Search size={16} className="text-hypo-text-muted" aria-hidden="true" />
        <span className="text-xs font-bold text-hypo-text-muted">지역이나 장소를 검색해보세요</span>
      </div>

      {markers.map((marker) => (
        <div
          key={`${marker.left}-${marker.top}`}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-hypo-pill border border-hypo-brand bg-white px-2.5 py-1.5 text-[11px] font-black text-hypo-brand shadow-hypo-panel"
          style={{ left: marker.left, top: marker.top }}
        >
          {marker.label}
        </div>
      ))}

      <div className="absolute left-[39%] top-[44%] z-10 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-hypo-pill border-[3px] border-white bg-hypo-info shadow-hypo-panel">
        <span className="sr-only">현재 위치</span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 rounded-t-hypo-lg border-t border-[#D3DCD8] bg-white px-5 pb-5 pt-3 shadow-[0_-12px_36px_rgb(22_64_54_/_0.08)]">
        <div className="mx-auto h-1 w-9 rounded-hypo-pill bg-[#C8CFCC]" />
        <div className="mt-3 flex items-center justify-between">
          <div>
            <strong className="block text-sm font-black text-hypo-text">근처 인터뷰</strong>
            <span className="mt-1 block text-[11px] font-bold text-hypo-text-muted">
              지도에서 찾은 모집글 4개
            </span>
          </div>
          <span className="rounded-hypo-md bg-hypo-brand-soft px-2.5 py-1.5 text-[11px] font-black text-hypo-brand">
            목록
          </span>
        </div>
      </div>
    </div>
  );
}

export function ApplicationPreview() {
  return (
    <div className="overflow-hidden rounded-hypo-lg border border-[#CBD7D1] bg-white shadow-[0_18px_50px_rgb(22_64_54_/_0.12)]" aria-label="인터뷰 신청 화면 예시">
      <div className="border-b border-[#E3E9E6] px-4 py-3.5">
        <span className="text-[10px] font-black text-hypo-reward">사례비 30,000원</span>
        <strong className="mt-1.5 block text-sm font-black leading-5 text-hypo-text">
          1인 가구 식재료 관리 경험 인터뷰
        </strong>
        <span className="mt-1 block text-[10px] font-bold text-hypo-text-muted">
          대면 · 안산 중앙동 · 60분
        </span>
      </div>
      <div className="space-y-3 px-4 py-4">
        <div>
          <span className="text-[10px] font-black text-hypo-text">관련 경험</span>
          <div className="mt-1.5 min-h-16 rounded-hypo-md border border-[#D8E0DC] bg-[#F8FAF9] px-3 py-2 text-[10px] font-bold leading-4 text-hypo-text-muted">
            평소 주 2회 직접 장을 보고 남은 식재료를 메모로 관리하고 있어요.
          </div>
        </div>
        <div>
          <span className="text-[10px] font-black text-hypo-text">가능한 시간</span>
          <div className="mt-1.5 flex min-h-10 items-center rounded-hypo-md border border-[#D8E0DC] bg-[#F8FAF9] px-3 text-[10px] font-bold text-hypo-text-muted">
            평일 오후 7시 이후
          </div>
        </div>
        <div className="flex min-h-10 items-center justify-center rounded-hypo-md bg-hypo-brand text-xs font-black text-white">
          신청하기
        </div>
      </div>
    </div>
  );
}

export function ChatPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-hidden rounded-hypo-lg border border-[#CBD7D1] bg-[#F5F7F6] shadow-[0_18px_50px_rgb(22_64_54_/_0.12)]" aria-label="인터뷰 일정과 방식을 조율하는 채팅 화면 예시">
      <div className="border-b border-[#DEE5E1] bg-white px-4 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <strong className="block text-sm font-black text-hypo-text">김민지</strong>
            <span className="mt-0.5 block text-[10px] font-bold text-hypo-text-muted">
              운동 기록 앱 사용 경험 인터뷰
            </span>
          </div>
          <MessageCircle size={18} className="text-hypo-brand" aria-hidden="true" />
        </div>
      </div>
      <div className={`space-y-3 px-4 py-5 ${compact ? "min-h-[205px]" : "min-h-[360px]"}`}>
        <div className="max-w-[82%] rounded-hypo-lg bg-white px-3 py-2.5 text-xs font-bold leading-5 text-hypo-text shadow-hypo-panel">
          신청 내용 확인했어요. 평일 저녁도 괜찮으실까요?
        </div>
        <div className="ml-auto max-w-[82%] rounded-hypo-lg bg-hypo-brand px-3 py-2.5 text-xs font-bold leading-5 text-white">
          네, 화요일 오후 7시 이후 가능해요.
        </div>
        <div className="mx-auto flex w-fit items-center gap-1.5 rounded-hypo-pill bg-[#E8EEEB] px-3 py-1.5 text-[10px] font-black text-hypo-text-muted">
          <Check size={12} aria-hidden="true" /> 인터뷰 일정이 정해졌어요
        </div>
        {!compact ? (
          <div className="max-w-[82%] rounded-hypo-lg bg-white px-3 py-2.5 text-xs font-bold leading-5 text-hypo-text shadow-hypo-panel">
            좋아요. 화상 링크는 일정 전에 이 채팅으로 보내드릴게요.
          </div>
        ) : null}
      </div>
      <div className="border-t border-[#DEE5E1] bg-white p-3">
        <div className="flex h-10 items-center justify-between rounded-hypo-md bg-[#F1F4F2] px-3 text-[11px] font-bold text-hypo-text-muted">
          메시지를 입력하세요
          <MessageCircle size={16} className="text-hypo-brand" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

export function FounderProgressPreview() {
  return (
    <div className="overflow-hidden rounded-hypo-lg border border-[#CBD7D1] bg-white shadow-[0_18px_50px_rgb(22_64_54_/_0.12)]" aria-label="모집글과 지원자 관리 화면 예시">
      <div className="border-b border-[#E3E9E6] px-4 py-4">
        <span className="text-[10px] font-black text-hypo-brand">모집중</span>
        <strong className="mt-1 block text-sm font-black leading-5 text-hypo-text">
          1인 가구 식재료 관리 경험 인터뷰
        </strong>
      </div>
      <div className="grid grid-cols-2 border-b border-[#E3E9E6]">
        <div className="border-r border-[#E3E9E6] px-4 py-3">
          <span className="block text-[10px] font-bold text-hypo-text-muted">지원자</span>
          <strong className="mt-1 block text-lg font-black text-hypo-text">4명</strong>
        </div>
        <div className="px-4 py-3">
          <span className="block text-[10px] font-bold text-hypo-text-muted">선정</span>
          <strong className="mt-1 block text-lg font-black text-hypo-text">1명</strong>
        </div>
      </div>
      <div className="px-4 py-2">
        {["이서현", "박지우", "최민준"].map((name, index) => (
          <div key={name} className={`flex items-center gap-3 py-3 ${index < 2 ? "border-b border-[#E7ECE9]" : ""}`}>
            <div className="grid size-8 shrink-0 place-items-center rounded-hypo-pill bg-hypo-brand-soft text-[11px] font-black text-hypo-brand">
              {name.slice(0, 1)}
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block text-xs font-black text-hypo-text">{name}</strong>
              <span className="mt-0.5 block truncate text-[10px] font-bold text-hypo-text-muted">
                관련 경험과 가능한 시간을 확인해보세요
              </span>
            </div>
            <ChevronRight size={15} className="text-[#A1AAA5]" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function InterviewConditionStrip() {
  const items = [
    { icon: Clock3, label: "예상 시간", value: "60분" },
    { icon: Video, label: "진행 방식", value: "대면·화상" },
    { icon: MapPin, label: "지역", value: "안산" },
    { icon: Users, label: "모집 인원", value: "4명" },
  ];

  return (
    <div className="grid grid-cols-2 border-y border-[#DCE5E0] sm:grid-cols-4">
      {items.map(({ icon: Icon, label, value }, index) => (
        <div
          key={label}
          className={`px-4 py-5 ${index % 2 === 0 ? "border-r border-[#DCE5E0]" : ""} ${
            index < 2 ? "border-b border-[#DCE5E0] sm:border-b-0" : ""
          } ${index === 1 ? "sm:border-r" : ""}`}
        >
          <Icon size={17} className="text-hypo-brand" aria-hidden="true" />
          <span className="mt-2 block text-[10px] font-bold text-hypo-text-muted">{label}</span>
          <strong className="mt-1 block text-sm font-black text-hypo-text">{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function NotificationPreview() {
  return (
    <div className="divide-y divide-[#E4EAE7] border-y border-[#DCE5E0]">
      {[
        { icon: Users, title: "새로운 신청이 도착했어요", time: "방금" },
        { icon: CalendarDays, title: "인터뷰 일정이 정해졌어요", time: "1시간 전" },
        { icon: MessageCircle, title: "새 메시지가 도착했어요", time: "어제" },
      ].map(({ icon: Icon, title, time }) => (
        <div key={title} className="flex items-center gap-3 py-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-hypo-md bg-hypo-brand-soft text-hypo-brand">
            <Icon size={17} aria-hidden="true" />
          </div>
          <strong className="min-w-0 flex-1 text-sm font-black text-hypo-text">{title}</strong>
          <span className="text-[10px] font-bold text-hypo-text-muted">{time}</span>
        </div>
      ))}
    </div>
  );
}
