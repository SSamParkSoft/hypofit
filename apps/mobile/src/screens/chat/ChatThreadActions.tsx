import { Modal, Pressable, Text, View } from "react-native";
import type { ChatRoom } from "@hypofit/contracts";
import type { ChatWorkflow, ChatWorkflowAction } from "@hypofit/contracts";
import { formatSessionTime } from "@/features/sessions/sessionPresentation";
import { getConfirmedChatSchedule } from "./chatThreadPresentation";

export function ChatThreadMenu({
  anchorTop,
  isHiding,
  onHide,
  isCanceling,
  isOpen,
  onCancelInterview,
  onClose,
  onDetail,
  onReport,
  room,
  workflow,
  isWorkflowPending,
  onWorkflowAction,
}: {
  anchorTop: number;
  isHiding?: boolean;
  onHide: () => void;
  isCanceling?: boolean;
  isOpen: boolean;
  onCancelInterview: () => void;
  onClose: () => void;
  onDetail: () => void;
  onReport: () => void;
  room: ChatRoom | null;
  workflow?: ChatWorkflow;
  isWorkflowPending?: boolean;
  onWorkflowAction: (action: ChatWorkflowAction) => void;
}) {
  if (!room) return null;

  const applicationStatus = room.application?.status;
  const canCancelInterview = applicationStatus === "applied" || applicationStatus === "selected";

  return (
    <Modal animationType="fade" transparent visible={isOpen} onRequestClose={onClose}>
      <View className="flex-1">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View
          className="absolute right-4 w-[280px] rounded-[16px] border border-hypo-border bg-hypo-surface px-3 py-3 shadow-lg"
          style={{ top: anchorTop }}
        >
          <View>
            {workflow?.description ? (
              <View className="mb-2 px-2.5 pb-2">
                <Text className="text-[13px] font-semibold leading-5 text-hypo-text">{workflow.title}</Text>
                <Text className="mt-1 text-[12px] leading-[18px] text-hypo-muted">{workflow.description}</Text>
              </View>
            ) : null}
            <ThreadMenuButton label="공고 상세정보" onPress={onDetail} />
            <ThreadMenuButton disabled={isHiding} label="목록에서 숨기기" onPress={onHide} />
            {[workflow?.secondary_action, workflow?.danger_action].map((action) => action ? (
              <ThreadMenuButton
                key={action.action}
                disabled={isWorkflowPending}
                label={action.action === "mark_no_show" ? "노쇼 기록" : action.label}
                tone={action.tone === "danger" ? "danger" : "default"}
                onPress={() => onWorkflowAction(action.action)}
              />
            ) : null)}
            <ThreadMenuButton
              disabled={!canCancelInterview || isCanceling}
              helper={canCancelInterview ? undefined : "이미 종료된 참여는 취소할 수 없어요."}
              label="참여 취소"
              tone="danger"
              onPress={onCancelInterview}
            />
            <View className="my-1 h-px bg-hypo-border" />
            <ThreadMenuButton label="신고하기" tone="danger" onPress={onReport} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ThreadMenuButton({
  disabled,
  helper,
  label,
  onPress,
  tone = "default",
}: {
  disabled?: boolean;
  helper?: string;
  label: string;
  onPress: () => void;
  tone?: "default" | "danger";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`min-h-11 justify-center rounded-[10px] px-2.5 ${disabled ? "opacity-45" : "opacity-100"}`}
      onPress={onPress}
    >
      <Text className={`text-[14px] font-black ${tone === "danger" ? "text-hypo-danger" : "text-hypo-text"}`}>{label}</Text>
      {helper ? <Text className="mt-0.5 text-[12px] leading-[18px] text-hypo-muted">{helper}</Text> : null}
    </Pressable>
  );
}

export function ApplicantReviewActions({
  disabled,
  onOpenAnswers,
  onReject,
  onSelect,
}: {
  disabled?: boolean;
  onOpenAnswers: () => void;
  onReject: () => void;
  onSelect: () => void;
}) {
  return (
    <View className="mb-2 flex-row items-center gap-2">
      <ApplicantReviewButton label="답변 보기" onPress={onOpenAnswers} />
      <ApplicantReviewButton disabled={disabled} label="선정" tone="primary" onPress={onSelect} />
      <ApplicantReviewButton disabled={disabled} label="반려" tone="danger" onPress={onReject} />
    </View>
  );
}

export function ChatWorkflowActionStrip({
  disabled,
  onAction,
  onOpenMeetingLink,
  room,
  workflow,
}: {
  disabled?: boolean;
  onAction: (action: ChatWorkflowAction) => void;
  onOpenMeetingLink: (url: string) => void;
  room: ChatRoom | null;
  workflow: ChatWorkflow;
}) {
  const action = workflow.primary_action;
  const schedule = getConfirmedChatSchedule(room, workflow);
  const shouldRender = schedule || action || workflow.title;
  if (!shouldRender) return null;

  return (
    <View className="mb-2">
      {schedule ? (
        <View className="mb-1">
          <Text accessibilityRole="header" className="text-[13px] leading-5 text-hypo-text" style={{ fontFamily: "HypofitSansMedium" }}>
            확정된 일정 · {schedule.modeLabel}
          </Text>
          <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
            <Text className="max-w-full text-[14px] leading-[21px] text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>
              {formatSessionTime(schedule.scheduledAt)}
            </Text>
            {schedule.meetingUrl ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="화상 링크 열기, 외부 브라우저"
                className="min-h-11 justify-center"
                onPress={() => {
                  if (schedule.meetingUrl) onOpenMeetingLink(schedule.meetingUrl);
                }}
              >
                <Text className="text-[13px] leading-5 text-hypo-brand" style={{ fontFamily: "HypofitSansMedium" }}>화상 링크 열기</Text>
              </Pressable>
            ) : null}
          </View>
          {schedule.place ? <Text className="text-[13px] leading-5 text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>{schedule.place}</Text> : null}
        </View>
      ) : null}
      <View className="flex-row items-center justify-between gap-3">
        <Text accessibilityRole="header" className="min-w-0 flex-1 text-[13px] leading-5 text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>
          {workflow.title}
        </Text>
        {action ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: Boolean(disabled) }}
            disabled={disabled}
            className="min-h-11 flex-shrink-0 justify-center px-2"
            style={{ opacity: disabled ? 0.45 : 1 }}
            onPress={() => onAction(action.action)}
          >
            <Text className={`text-[14px] leading-5 ${action.tone === "danger" ? "text-hypo-danger" : "text-hypo-brand"}`} style={{ fontFamily: "HypofitSansBold" }}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function ApplicantReviewButton({
  disabled,
  label,
  onPress,
  tone = "default",
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone?: "default" | "primary" | "danger";
}) {
  const className =
    tone === "primary"
      ? "border-hypo-brand bg-hypo-brand"
      : tone === "danger"
        ? "border-[#F2C4C4] bg-hypo-dangerSoft"
        : "border-hypo-border bg-hypo-surface";
  const textClassName =
    tone === "primary" ? "text-white" : tone === "danger" ? "text-hypo-danger" : "text-hypo-text";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`min-h-11 flex-1 items-center justify-center rounded-[12px] border px-3 py-2 ${className}`}
      style={{ opacity: disabled ? 0.45 : 1 }}
      onPress={onPress}
    >
      <Text className={`text-[12px] font-black leading-4 ${textClassName}`}>{label}</Text>
    </Pressable>
  );
}
