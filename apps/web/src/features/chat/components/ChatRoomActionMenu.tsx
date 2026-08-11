import {
  Ban,
  Bell,
  BellOff,
  EyeOff,
  Flag,
  MoreVertical,
  UserRound,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { cn } from "../../../shared/ui/cn";

interface ChatRoomActionMenuProps {
  align?: "left" | "right";
  isMuted: boolean;
  onBlock: () => void;
  onHide: () => void;
  onMuteToggle: () => void;
  onProfileOpen: () => void;
  onReport: () => void;
}

export function ChatRoomActionMenu({
  align = "left",
  isMuted,
  onBlock,
  onHide,
  onMuteToggle,
  onProfileOpen,
  onReport,
}: ChatRoomActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  const runAction = (action: () => void) => {
    setIsOpen(false);
    action();
  };

  return (
    <div className="relative -mt-1 flex justify-end self-start">
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-label="채팅방 메뉴"
        className="grid size-8 translate-x-1 place-items-center rounded-hypo-md text-hypo-text-soft transition-colors hover:bg-hypo-surface-muted hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <MoreVertical size={18} />
      </button>
      {isOpen ? (
        <>
          <button
            aria-label="채팅방 메뉴 닫기"
            className="fixed inset-0 z-30 cursor-default bg-transparent"
            type="button"
            onClick={() => setIsOpen(false)}
          />
          <div
            id={menuId}
            className={cn(
              "absolute top-9 z-40 grid w-44 overflow-hidden rounded-hypo-lg border border-hypo-border bg-hypo-surface py-1 text-left shadow-hypo-floating",
              align === "right"
                ? "right-0"
                : "right-0 min-[1200px]:left-0 min-[1200px]:right-auto",
            )}
          >
            <ActionMenuItem
              icon={UserRound}
              label="프로필 보기"
              onClick={() => runAction(onProfileOpen)}
            />
            <ActionMenuItem
              icon={isMuted ? Bell : BellOff}
              label={isMuted ? "알림 켜기" : "알림 끄기"}
              onClick={() => runAction(onMuteToggle)}
            />
            <ActionMenuItem
              icon={EyeOff}
              label="채팅방 숨기기"
              onClick={() => runAction(onHide)}
            />
            <ActionMenuItem icon={Flag} label="신고하기" onClick={() => runAction(onReport)} />
            <ActionMenuItem
              danger
              icon={Ban}
              label="차단하기"
              onClick={() => runAction(onBlock)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function ActionMenuItem({
  danger,
  icon: Icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex min-h-10 items-center gap-2 px-3 text-left text-xs font-black transition-colors hover:bg-hypo-surface-muted focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-hypo-brand/20",
        danger ? "text-hypo-danger" : "text-hypo-text-muted",
      )}
      type="button"
      onClick={onClick}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}
