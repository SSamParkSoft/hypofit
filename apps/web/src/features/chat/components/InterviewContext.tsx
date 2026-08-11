import { ChevronDown } from "lucide-react";

import type { ChatRoom } from "../../../shared/api/types";
import { Avatar } from "../../../shared/ui/avatar";
import { Button } from "../../../shared/ui/button";
import { cn } from "../../../shared/ui/cn";
import {
  formatInterviewMode,
  formatReward,
  getCounterpart,
  getRoomDisplayStatus,
  getRoomStatusLabel,
} from "../model/chatRoomModel";

interface InterviewContextBarProps {
  isOpen: boolean;
  onToggle: () => void;
  room: ChatRoom;
}

export function InterviewContextBar({
  isOpen,
  onToggle,
  room,
}: InterviewContextBarProps) {
  const post = room.interview_post;

  if (!post) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-hypo-border/70 pt-3">
      <button
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-3 rounded-hypo-md px-0 py-0.5 text-left transition-colors hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
        type="button"
        onClick={onToggle}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-5 text-hypo-text">
            {post.title}
          </p>
          <p className="mt-1 truncate text-[11px] font-medium leading-4 text-hypo-text-muted">
            {formatReward(post.reward_amount)} · {post.duration_minutes}분 ·{" "}
            {formatInterviewMode(post.interview_mode)}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-hypo-pill bg-hypo-bg text-[11px] font-semibold text-hypo-brand",
            isOpen ? "min-h-7 px-2.5" : "size-7",
          )}
          aria-hidden="true"
        >
          {isOpen ? "접기" : <ChevronDown size={16} strokeWidth={2.6} />}
        </span>
      </button>

      {isOpen ? (
        <div className="mt-3 grid gap-3 border-t border-hypo-border/70 pt-3">
          <div>
            <p className="text-[11px] font-semibold text-hypo-text-soft">서비스</p>
            <p className="mt-1 text-sm leading-5 text-hypo-text-muted">
              {post.service_summary}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-hypo-text-soft">찾는 응답자</p>
            <p className="mt-1 text-sm leading-5 text-hypo-text-muted">
              {post.target_description}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <ContextDetailRow label="장소" value={post.location ?? "온라인 또는 추후 안내"} />
            <ContextDetailRow
              label="가능 시간"
              value={post.schedule_options[0] ?? "모집자와 협의"}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

interface InterviewContextPanelProps {
  appUserId: string | null;
  room: ChatRoom | null;
}

export function InterviewContextPanel({
  appUserId,
  room,
}: InterviewContextPanelProps) {
  if (!room) {
    return (
      <aside className="hidden min-h-0 overflow-y-auto border-l border-hypo-border/80 px-5 py-4 min-[1600px]:block">
        <h2 className="text-sm font-semibold text-hypo-text">인터뷰 정보</h2>
        <p className="mt-2 text-sm leading-6 text-hypo-text-muted">
          채팅방을 선택하면 모집글, 사례비, 진행 방식, 신청 상태가 표시됩니다.
        </p>
      </aside>
    );
  }

  const counterpart = getCounterpart(room, appUserId);
  const post = room.interview_post;

  return (
    <aside className="hidden min-h-0 overflow-y-auto border-l border-hypo-border/80 px-5 py-4 min-[1600px]:block">
      <div className="flex items-center gap-3">
        <Avatar
          alt={counterpart.name}
          className="size-10"
          fallback={counterpart.name.slice(0, 1)}
          src={counterpart.profile_image_url}
        />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-hypo-text-soft">대화 상대</p>
          <h2 className="truncate text-sm font-semibold text-hypo-text">{counterpart.name}</h2>
          <p className="text-xs font-medium text-hypo-text-muted">방장 · 창업자</p>
        </div>
      </div>

      <div className="mt-5 grid gap-5">
        <section className="border-t border-hypo-border/70 pt-4">
          <h3 className="text-[11px] font-semibold text-hypo-text-soft">모집글</h3>
          <p className="mt-2 text-sm font-semibold leading-5 text-hypo-text">
            {post?.title ?? "인터뷰 채팅"}
          </p>
          {post ? (
            <p className="mt-2 line-clamp-3 text-sm leading-5 text-hypo-text-muted">
              {post.service_summary}
            </p>
          ) : null}
        </section>

        {post ? (
          <section className="grid gap-2 border-t border-hypo-border/70 pt-4">
            <ContextDetailRow label="사례비" value={formatReward(post.reward_amount)} />
            <ContextDetailRow label="시간" value={`${post.duration_minutes}분`} />
            <ContextDetailRow label="방식" value={formatInterviewMode(post.interview_mode)} />
            <ContextDetailRow
              label="상태"
              value={getRoomStatusLabel(getRoomDisplayStatus(room, false))}
            />
          </section>
        ) : null}

        <Button className="w-full justify-center" size="sm" variant="secondary">
          일정 확정하기
        </Button>
      </div>
    </aside>
  );
}

function ContextDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[60px_minmax(0,1fr)] items-start gap-3 border-b border-hypo-border/60 pb-2 last:border-b-0 last:pb-0">
      <p className="text-[11px] font-medium text-hypo-text-soft">{label}</p>
      <p className="min-w-0 text-sm leading-5 text-hypo-text">{value}</p>
    </div>
  );
}
