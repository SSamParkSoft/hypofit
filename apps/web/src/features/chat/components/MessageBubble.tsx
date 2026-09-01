import { MessageCircle } from "lucide-react";

import type { ChatMessage } from "../../../shared/api/types";
import { cn } from "../../../shared/ui/cn";
import { formatClock, isSystemMessage } from "../model/chatRoomModel";

interface MessageBubbleProps {
  message: ChatMessage;
  mySenderId: string | null;
}

export function MessageBubble({ message, mySenderId }: MessageBubbleProps) {
  const isMine = Boolean(mySenderId && message.sender_id === mySenderId);

  if (isSystemMessage(message)) {
    return (
      <div className="mx-auto max-w-[88%] whitespace-pre-line rounded-hypo-pill border border-hypo-border bg-hypo-bg px-3 py-2 text-center text-xs font-semibold leading-5 text-hypo-text-muted">
        <MessageCircle className="mr-1 inline-block align-[-3px]" size={14} />
        {message.body}
      </div>
    );
  }

  return (
    <div className={cn("flex", isMine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[82%] rounded-hypo-lg px-4 py-3 text-sm leading-6",
          isMine
            ? "rounded-br-hypo-sm border border-hypo-brand/10 bg-hypo-brand-soft text-hypo-brand-strong"
            : "rounded-bl-hypo-sm border border-hypo-border bg-hypo-surface-muted text-hypo-text",
        )}
      >
        <p>{message.body}</p>
        <span
          className={cn(
            "mt-1 block text-[10px] font-semibold",
            isMine ? "text-hypo-brand/65" : "text-hypo-text-soft",
          )}
        >
          {formatClock(message.created_at)}
        </span>
      </div>
    </div>
  );
}
