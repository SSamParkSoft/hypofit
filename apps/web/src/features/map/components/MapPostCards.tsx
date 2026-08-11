import { ArrowUpRight, Clock3, LoaderCircle, MapPin, X } from "lucide-react";
import type { ReactNode } from "react";

import {
  formatReward,
  interviewModeLabels,
} from "../../interview-posts/components/interviewPostMeta";
import { navigateToInterviewDetail } from "../../../shared/navigation/appNavigation";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import type { MapPostView, SheetLevel } from "../model/mapPageModel";

export function SelectedFloatingMapCard({
  onClose,
  view,
}: {
  onClose: () => void;
  view: MapPostView;
}) {
  const post = view.post;

  return (
    <article className="rounded-[22px] border border-hypo-border bg-hypo-surface p-3 shadow-hypo-floating">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-hypo-pill bg-hypo-brand-soft px-2 py-0.5 text-[10px] font-black leading-4 text-hypo-brand">
              {interviewModeLabels[post.interview_mode]}
            </span>
            <span className="rounded-hypo-pill bg-hypo-bg px-2 py-0.5 text-[10px] font-black leading-4 text-hypo-text-soft">
              {view.distance}
            </span>
          </div>
          <h3 className="line-clamp-1 text-[15px] font-black leading-[1.45] text-hypo-text">
            {post.title}
          </h3>
        </div>
        <button
          aria-label="선택한 인터뷰 닫기"
          className="-mr-1 -mt-1 grid size-8 shrink-0 place-items-center rounded-hypo-pill text-hypo-text-soft transition-colors hover:bg-hypo-bg hover:text-hypo-text"
          type="button"
          onClick={onClose}
        >
          <X size={16} strokeWidth={2.4} />
        </button>
      </div>

      <p className="mt-1 line-clamp-1 text-xs font-semibold leading-5 text-hypo-text-muted">
        {post.target_description}
      </p>

      <div className="mt-2 grid gap-1 text-[12px] font-semibold text-hypo-text-muted">
        <MapInlineMeta icon={<MapPin size={14} />} label="위치">
          {post.location ?? view.area}
        </MapInlineMeta>
        <MapInlineMeta icon={<Clock3 size={14} />} label="시간">
          {post.duration_minutes}분 · {post.schedule_options[0] ?? "시간 협의"}
        </MapInlineMeta>
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <strong className="text-sm font-black tabular-nums text-hypo-reward">
          {formatReward(post.reward_amount)}
        </strong>
        <div className="flex shrink-0 gap-2">
          <Button
            className="min-h-11 px-3 text-xs"
            size="sm"
            variant="secondary"
            onClick={() => navigateToInterviewDetail(post.id)}
          >
            상세보기
            <ArrowUpRight size={14} />
          </Button>
          <Button
            className="min-h-11 px-3 text-xs"
            size="sm"
            onClick={() => navigateToInterviewDetail(post.id, { apply: true })}
          >
            신청하기
          </Button>
        </div>
      </div>
    </article>
  );
}

export function UnselectedMapSummary({
  isRefreshing,
  onSelect,
  sheetLevel,
  viewedPostIds,
  views,
}: {
  isRefreshing: boolean;
  onSelect: (postId: string) => void;
  sheetLevel: SheetLevel;
  viewedPostIds: Set<string>;
  views: MapPostView[];
}) {
  const isExpanded = sheetLevel === "expanded";

  return (
    <div className={cn("px-3.5 pb-3.5", isExpanded ? "pt-1.5" : "pt-1")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-6 text-hypo-text">
            근처 인터뷰 {views.length}개
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-hypo-text-muted">
            마커를 누르면 자세히 볼 수 있어요.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-hypo-pill bg-hypo-bg px-2.5 py-1 text-[11px] font-semibold text-hypo-brand">
          {isRefreshing ? (
            <LoaderCircle aria-label="지도 모집글 업데이트 중" className="animate-spin" size={11} />
          ) : null}
          지도
        </span>
      </div>

      <div
        className={cn(
          "mt-2.5 max-h-[calc(var(--map-sheet-height)-76px)] overflow-y-auto pr-0.5",
          !isExpanded && "pb-2",
        )}
      >
        <div className="divide-y divide-hypo-border/80">
          {views.map((view) => {
            const isViewed = viewedPostIds.has(view.post.id);

            return (
              <button
                key={view.post.id}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-0 py-3 text-left transition-colors hover:bg-hypo-bg/70",
                  isViewed && "text-hypo-text-muted",
                )}
                type="button"
                onClick={() => onSelect(view.post.id)}
              >
                <span className="min-w-0 pl-1">
                  <span
                    className={cn(
                      "block truncate text-xs font-black",
                      isViewed ? "text-hypo-text-muted" : "text-hypo-text",
                    )}
                  >
                    {view.post.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-hypo-text-muted">
                    {view.area} · {view.distance} · {view.post.duration_minutes}분
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] font-semibold text-hypo-text-muted">
                    {interviewModeLabels[view.post.interview_mode]} ·{" "}
                    {view.post.schedule_options[0] ?? "시간 협의"}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-[11px] font-black tabular-nums",
                    isViewed ? "text-hypo-text-soft" : "text-hypo-reward",
                  )}
                >
                  {formatReward(view.post.reward_amount)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SelectedMapPostCard({ view }: { view: MapPostView }) {
  const post = view.post;

  return (
    <article className="px-3.5 pb-3.5 pt-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-hypo-pill bg-hypo-brand-soft px-2 py-0.5 text-[10px] font-black leading-4 text-hypo-brand">
              {interviewModeLabels[post.interview_mode]}
            </span>
            <span className="rounded-hypo-pill bg-hypo-bg px-2 py-0.5 text-[10px] font-black leading-4 text-hypo-text-soft">
              {view.distance}
            </span>
          </div>
          <h3 className="line-clamp-2 text-[15px] font-black leading-[1.45] text-hypo-text">
            {post.title}
          </h3>
        </div>
        <strong className="shrink-0 text-sm font-black tabular-nums text-hypo-reward">
          {formatReward(post.reward_amount)}
        </strong>
      </div>

      <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-5 text-hypo-text-muted">
        {post.target_description}
      </p>

      <div className="mt-2.5 grid gap-1.5 text-[12px] font-semibold text-hypo-text-muted">
        <MapInlineMeta icon={<MapPin size={14} />} label="위치">
          {post.location ?? view.area}
        </MapInlineMeta>
        <MapInlineMeta icon={<Clock3 size={14} />} label="시간">
          {post.duration_minutes}분 · {post.schedule_options[0] ?? "시간 협의"}
        </MapInlineMeta>
      </div>

      <div className="mt-3 grid grid-cols-[0.9fr_1.1fr] gap-2">
        <Button
          className="min-h-9 text-xs"
          size="sm"
          variant="secondary"
          onClick={() => navigateToInterviewDetail(post.id)}
        >
          상세보기
          <ArrowUpRight size={14} />
        </Button>
        <Button
          className="min-h-9 text-xs"
          size="sm"
          onClick={() => navigateToInterviewDetail(post.id, { apply: true })}
        >
          신청하기
        </Button>
      </div>
    </article>
  );
}

export function MapListRow({
  isSelected,
  isViewed,
  onSelect,
  view,
}: {
  isSelected: boolean;
  isViewed?: boolean;
  onSelect: () => void;
  view: MapPostView;
}) {
  const post = view.post;

  return (
    <button
      className={cn(
        "relative w-full px-0 py-3.5 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
        isSelected
          ? "bg-hypo-brand-soft/45 before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r-hypo-pill before:bg-hypo-brand"
          : isViewed
            ? "hover:bg-hypo-bg/75"
            : "hover:bg-hypo-bg/55",
      )}
      type="button"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3 px-4">
        <div className="min-w-0">
          <h3
            className={cn(
              "truncate text-sm font-semibold leading-5",
              isViewed && !isSelected ? "text-hypo-text-muted" : "text-hypo-text",
            )}
          >
            {post.title}
          </h3>
          <p className="mt-1 truncate text-[11px] font-medium leading-4 text-hypo-text-muted">
            {view.area} · {view.distance} · {post.duration_minutes}분
          </p>
        </div>
        <strong
          className={cn(
            "shrink-0 text-[12px] font-black",
            isViewed && !isSelected ? "text-hypo-text-soft" : "text-hypo-reward",
          )}
        >
          {formatReward(post.reward_amount)}
        </strong>
      </div>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 px-4">
        <MiniChip>{interviewModeLabels[post.interview_mode]}</MiniChip>
        <MiniChip>{post.schedule_options[0] ?? "시간 협의"}</MiniChip>
      </div>
    </button>
  );
}

function MiniChip({ children }: { children: string }) {
  return (
    <span className="max-w-full truncate rounded-hypo-pill bg-hypo-surface px-2 py-0.5 text-[10px] font-bold leading-4 text-hypo-text-muted">
      {children}
    </span>
  );
}

function MapInlineMeta({
  children,
  icon,
  label,
}: {
  children: ReactNode;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="grid grid-cols-[17px_36px_minmax(0,1fr)] items-center gap-1.5">
      <span className="text-hypo-brand">{icon}</span>
      <span className="font-black text-hypo-text-soft">{label}</span>
      <span className="min-w-0 truncate text-hypo-text">{children}</span>
    </div>
  );
}
