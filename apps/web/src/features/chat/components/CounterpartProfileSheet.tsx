import * as Dialog from "@radix-ui/react-dialog";
import { Ban, Flag, X } from "lucide-react";

import type { ChatRoom } from "../../../shared/api/types";
import { Avatar } from "../../../shared/ui/avatar";
import { Button } from "../../../shared/ui/button";
import { getCounterpart, getCounterpartRoleLabel } from "../model/chatRoomModel";

interface CounterpartProfileSheetProps {
  appUserId: string | null;
  onBlock: () => void;
  onClose: () => void;
  onReport: () => void;
  room: ChatRoom;
}

export function CounterpartProfileSheet({
  appUserId,
  onBlock,
  onClose,
  onReport,
  room,
}: CounterpartProfileSheetProps) {
  const counterpart = getCounterpart(room, appUserId);
  const post = room.interview_post;

  return (
    <Dialog.Root open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-hypo-text/35" />
        <Dialog.Content className="fixed bottom-[calc(var(--app-safe-bottom)+0.75rem)] left-1/2 z-50 grid max-h-[calc(100dvh-var(--app-safe-top)-var(--app-safe-bottom)-3rem)] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 gap-4 overflow-y-auto rounded-hypo-lg border border-hypo-border bg-hypo-surface p-4 shadow-hypo-floating focus:outline-none md:bottom-auto md:top-1/2 md:-translate-y-1/2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar
                alt={counterpart.name}
                className="size-14"
                fallback={counterpart.name.slice(0, 1)}
                src={counterpart.profile_image_url}
              />
              <div className="min-w-0">
                <Dialog.Title className="truncate text-lg font-black leading-7 text-hypo-text">
                  {counterpart.name}
                </Dialog.Title>
                <p className="text-xs font-bold text-hypo-text-muted">
                  {getCounterpartRoleLabel(counterpart.role)}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                aria-label="닫기"
                className="grid size-9 place-items-center rounded-hypo-md text-hypo-text-soft transition-colors hover:bg-hypo-surface-muted hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
                type="button"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <p className="rounded-hypo-lg bg-hypo-brand-soft px-3 py-2.5 text-sm font-bold leading-6 text-hypo-brand">
            {counterpart.bio ?? "아직 한줄소개가 없습니다."}
          </p>

          <div className="rounded-hypo-lg bg-hypo-bg px-3 py-3">
            <p className="text-[11px] font-black text-hypo-text-soft">연결된 인터뷰</p>
            <p className="mt-1 truncate text-sm font-black text-hypo-text">
              {post?.title ?? "인터뷰 채팅"}
            </p>
            {post ? (
              <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-hypo-text-muted">
                {post.service_summary}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onReport}>
              <Flag size={15} />
              신고하기
            </Button>
            <Button variant="outlineDanger" onClick={onBlock}>
              <Ban size={15} />
              차단하기
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
