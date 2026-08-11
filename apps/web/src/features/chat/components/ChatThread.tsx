import { ArrowLeft, BellOff, Send } from "lucide-react";

import type { ChatRoom } from "../../../shared/api/types";
import { Avatar } from "../../../shared/ui/avatar";
import { Badge } from "../../../shared/ui/badge";
import { Button } from "../../../shared/ui/button";
import { LoadingState } from "../../../shared/ui/state";
import { cn } from "../../../shared/ui/cn";
import { getWorkspaceRegionClassName } from "../../../shared/ui/workspace";
import {
  getCounterpart,
  getRoomBadgeIntent,
  getRoomDisplayStatus,
  getRoomStatusLabel,
} from "../model/chatRoomModel";
import { useChatThreadController } from "../model/useChatThreadController";
import { InterviewContextBar } from "./InterviewContext";
import { MessageBubble } from "./MessageBubble";
import { ChatRoomActionMenu } from "./ChatRoomActionMenu";

interface ChatThreadProps {
  accessToken: string | null;
  appUserId: string | null;
  isBlocked: boolean;
  isMuted: boolean;
  onBlock: () => void;
  onBack: () => void;
  onHide: () => void;
  onMuteToggle: () => void;
  onProfileOpen: () => void;
  onReport: () => void;
  room: ChatRoom;
}

export function ChatThread({
  accessToken,
  appUserId,
  isBlocked,
  isMuted,
  onBlock,
  onBack,
  onHide,
  onMuteToggle,
  onProfileOpen,
  onReport,
  room,
}: ChatThreadProps) {
  const controller = useChatThreadController({
    accessToken,
    isBlocked,
    room,
  });
  const counterpart = getCounterpart(room, appUserId);
  const displayStatus = getRoomDisplayStatus(room, isBlocked);

  return (
    <section className="fixed inset-0 z-40 grid grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden bg-hypo-bg min-[1200px]:static min-[1200px]:h-full min-[1200px]:min-h-0 min-[1200px]:bg-hypo-surface">
      <header className="border-b border-hypo-border/80 bg-hypo-surface/96 px-4 pb-3 pt-[calc(var(--app-safe-top)+0.75rem)] backdrop-blur md:px-5 md:pb-4 md:pt-[calc(var(--app-safe-top)+1rem)] min-[1200px]:px-5 min-[1200px]:pb-4 min-[1200px]:pt-4">
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="채팅 목록으로 돌아가기"
              className="grid size-9 shrink-0 place-items-center rounded-hypo-md text-hypo-text-muted transition-colors hover:bg-hypo-surface-muted hover:text-hypo-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20 min-[1200px]:hidden"
              type="button"
              onClick={onBack}
            >
              <ArrowLeft size={19} />
            </button>
            <button
              className="grid size-10 shrink-0 place-items-center rounded-hypo-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hypo-brand/20"
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
            <button className="min-w-0 flex-1 text-left" type="button" onClick={onProfileOpen}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[15px] font-semibold leading-5 text-hypo-text">
                  {counterpart.name}
                </h2>
                <Badge intent={getRoomBadgeIntent(displayStatus)}>
                  {getRoomStatusLabel(displayStatus)}
                </Badge>
                {isMuted ? <BellOff className="text-hypo-text-soft" size={13} /> : null}
              </div>
              <p className="mt-1 truncate text-[12px] font-medium text-hypo-text-muted">
                {room.interview_post?.title ?? "인터뷰 채팅"}
              </p>
            </button>
            <ChatRoomActionMenu
              align="right"
              isMuted={isMuted}
              onBlock={onBlock}
              onHide={onHide}
              onMuteToggle={onMuteToggle}
              onProfileOpen={onProfileOpen}
              onReport={onReport}
            />
          </div>

          <InterviewContextBar
            isOpen={controller.isInterviewDetailOpen}
            room={room}
            onToggle={() =>
              controller.setIsInterviewDetailOpen((isOpen) => !isOpen)
            }
          />
        </div>
      </header>

      <div
        className={cn(
          "bg-hypo-bg px-4 py-4 md:px-5 min-[1200px]:px-5",
          getWorkspaceRegionClassName({ scroll: "panel" }),
        )}
      >
        <div className="mx-auto grid w-full max-w-4xl gap-3">
          {controller.isLoading ? (
            <LoadingState
              className="rounded-none border-0 bg-transparent px-0 py-0"
              title="메시지를 불러오는 중입니다."
            />
          ) : null}
          {controller.messages.map((chatMessage) => (
            <MessageBubble
              key={chatMessage.id}
              message={chatMessage}
              mySenderId={appUserId}
            />
          ))}
        </div>
      </div>

      <form
        className="border-t border-hypo-border/80 bg-hypo-surface px-4 pb-[calc(var(--app-safe-bottom)+0.75rem)] pt-3 md:px-5 min-[1200px]:px-5"
        onSubmit={controller.handleSubmit}
      >
        <div className="mx-auto w-full max-w-4xl">
          <div className="flex items-end gap-2">
            <label className="sr-only" htmlFor="chat-message">
              메시지
            </label>
            <textarea
              className="min-h-[42px] flex-1 resize-none rounded-hypo-pill border border-hypo-border bg-hypo-bg px-4 py-2.5 text-sm leading-5 text-hypo-text outline-none transition focus:border-hypo-brand focus:ring-[3px] focus:ring-hypo-brand/15"
              id="chat-message"
              maxLength={1000}
              placeholder={
                isBlocked ? "차단한 상대와는 메시지를 보낼 수 없어요" : "메시지를 입력하세요"
              }
              rows={1}
              value={controller.message}
              disabled={isBlocked}
              onChange={(event) => controller.setMessage(event.target.value)}
            />
            <Button
              aria-label="메시지 보내기"
              className="size-[42px] rounded-hypo-pill p-0"
              disabled={!controller.canSend}
              type="submit"
            >
              <Send size={18} />
            </Button>
          </div>
          {controller.isSendError ? (
            <p className="mt-2 text-xs font-bold text-hypo-danger">
              메시지를 보내지 못했어요. 잠시 뒤 다시 시도해주세요.
            </p>
          ) : null}
          {isBlocked ? (
            <p className="mt-2 text-xs font-bold text-hypo-danger">
              이 상대를 차단했어요. 신고 내용은 운영자가 확인합니다.
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
