import { BellOff } from "lucide-react";

import type { ChatRoom } from "../../../shared/api/types";
import { Avatar } from "../../../shared/ui/avatar";
import { cn } from "../../../shared/ui/cn";
import {
  type DisplayChatStatus,
  formatRelativeTime,
  getCounterpart,
  getRoomStatusClassName,
  getRoomStatusLabel,
} from "../model/chatRoomModel";
import { ChatRoomActionMenu } from "./ChatRoomActionMenu";

interface ChatRoomPreviewProps {
  appUserId: string | null;
  isMuted: boolean;
  isSelected: boolean;
  onBlock: () => void;
  onHide: () => void;
  onMuteToggle: () => void;
  onProfileOpen: () => void;
  onReport: () => void;
  onSelect: () => void;
  room: ChatRoom;
  status: DisplayChatStatus;
  unreadCount: number;
}

export function ChatRoomPreview({
  appUserId,
  isMuted,
  isSelected,
  onBlock,
  onHide,
  onMuteToggle,
  onProfileOpen,
  onReport,
  onSelect,
  room,
  status,
  unreadCount,
}: ChatRoomPreviewProps) {
  const counterpart = getCounterpart(room, appUserId);
  const title = room.interview_post?.title ?? "인터뷰 채팅";
  const lastMessage = room.last_message?.body ?? "채팅방이 열렸어요.";
  const statusLabel = getRoomStatusLabel(status);

  return (
    <div
      className={cn(
        "relative grid min-h-[74px] w-full grid-cols-[40px_minmax(0,1fr)_28px] gap-3 px-4 py-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20",
        isSelected
          ? "bg-hypo-surface-selected before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:bg-hypo-brand"
          : "hover:bg-hypo-surface-muted/55",
      )}
    >
      <button
        aria-label={`${counterpart.name} 정보 보기`}
        className="grid size-10 place-items-center rounded-hypo-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
        type="button"
        onClick={onProfileOpen}
      >
        <Avatar
          alt={counterpart.name}
          className="size-10"
          fallback={counterpart.name.slice(0, 1)}
          src={counterpart.profile_image_url}
        />
      </button>
      <button
        aria-current={isSelected ? "page" : undefined}
        className="grid min-w-0 gap-1 rounded-hypo-md text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
        type="button"
        onClick={onSelect}
      >
        <span className="flex min-w-0 items-start gap-2">
          <strong className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-5 text-hypo-text">
            {counterpart.name}
          </strong>
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium leading-4 text-hypo-text-soft">
            {formatRelativeTime(room.last_message_at ?? room.updated_at)}
            {isMuted ? <BellOff size={12} /> : null}
          </span>
        </span>
        <span className="truncate text-[11px] font-semibold leading-4 text-hypo-text-muted">
          {title}
        </span>
        <span className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <span
            className={cn(
              "block truncate text-[13px] leading-5",
              unreadCount > 0 ? "text-hypo-text" : "text-hypo-text-soft",
            )}
          >
            {lastMessage}
          </span>
          {unreadCount > 0 ? <UnreadBadge count={unreadCount} /> : null}
        </span>
        <span className="flex min-w-0 items-center gap-2 pt-0.5">
          <span
            className={cn(
              "inline-flex min-h-5 shrink-0 items-center rounded-hypo-pill px-2 text-[10px] font-semibold leading-4",
              getRoomStatusClassName(status),
            )}
          >
            {statusLabel}
          </span>
        </span>
      </button>
      <ChatRoomActionMenu
        isMuted={isMuted}
        onBlock={onBlock}
        onHide={onHide}
        onMuteToggle={onMuteToggle}
        onProfileOpen={onProfileOpen}
        onReport={onReport}
      />
    </div>
  );
}

function UnreadBadge({ count }: { count: number }) {
  return (
    <span
      aria-label={`읽지 않은 메시지 ${count}개`}
      className="grid h-5 min-w-[22px] shrink-0 place-items-center rounded-hypo-pill bg-hypo-brand px-1.5 text-[10px] font-semibold leading-5 text-white"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
