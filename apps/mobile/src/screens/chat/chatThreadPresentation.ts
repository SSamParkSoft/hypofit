import type { ChatMessage, ChatRoom, ChatWorkflow } from "@hypofit/contracts";

export function getConfirmedChatSchedule(room: ChatRoom | null, workflow: ChatWorkflow) {
  const session = workflow.session;
  if (!room?.interview_post || (room.interview_post.recruitment_type ?? "interview") !== "interview"
    || !session || session.status !== "scheduled" || session.application_id !== room.application_id) {
    return null;
  }

  let meetingUrl: string | null = null;
  if (session.meeting_type === "online" && session.meeting_url?.trim()) {
    try {
      const url = new URL(session.meeting_url.trim());
      if (url.protocol === "https:" || url.protocol === "http:") meetingUrl = url.href;
    } catch {
      // Legacy text links remain non-interactive rather than opening a custom scheme.
    }
  }

  return {
    scheduledAt: session.scheduled_at,
    modeLabel: session.meeting_type === "online" ? "화상" : "대면",
    meetingUrl,
    place: session.meeting_type === "offline" ? session.place?.trim() || null : null,
  };
}

export type OutgoingChatMessage = {
  clientId: string;
  roomId: string;
  body: string;
  status: "sending" | "failed";
  error?: string;
};

export function canGroupChatMessages(first: ChatMessage | undefined | null, second: ChatMessage | undefined | null) {
  if (!first || !second || first.message_type !== "user" || second.message_type !== "user"
    || !first.sender_id || first.sender_id !== second.sender_id) return false;

  const firstDate = new Date(first.created_at);
  const secondDate = new Date(second.created_at);
  const interval = secondDate.getTime() - firstDate.getTime();
  return interval >= 0 && interval < 5 * 60_000
    && firstDate.toDateString() === secondDate.toDateString();
}

export function getUnconfirmedOutgoingMessages(
  outgoing: OutgoingChatMessage[], messages: ChatMessage[], roomId: string | undefined,
) {
  const confirmedIds = new Set(messages.map((message) => message.client_message_id).filter(Boolean));
  return outgoing.filter((message) => message.roomId === roomId && !confirmedIds.has(message.clientId));
}

export function countNewCounterpartMessages(
  messages: ChatMessage[], previousLatestId: string, currentUserId: string | undefined,
) {
  const previousIndex = messages.findIndex((message) => message.id === previousLatestId);
  if (previousIndex < 0 || !currentUserId) return 0;
  return messages.slice(previousIndex + 1).filter((message) =>
    message.message_type === "user" && message.sender_id && message.sender_id !== currentUserId,
  ).length;
}
