import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import type { SupportTicket, SupportTicketCategory } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import { useDeleteSupportTicket, useSupportTickets } from "@/features/support/useSupportTicket";
import { StateMessage } from "@/screens/home/HomeScreen";
import { getSafeReturnTo, goBackOrReplaceReturnTo } from "@/shared/navigation/backNavigation";
import { AppScreen } from "@/shared/ui/AppScreen";
import { ListRow, ListSection } from "@/shared/ui/ListSurface";
import { PrimaryButton } from "@/shared/ui/PrimaryButton";
import { SupportForm } from "./SupportForm";

const categoryLabels: Record<SupportTicketCategory, string> = {
  account: "계정",
  abuse: "부적절한 내용",
  application: "신청과 선정",
  chat: "채팅",
  interview_post: "공고",
  no_show: "노쇼",
  other: "기타",
  privacy: "개인정보",
  reward: "보상",
};

export function SupportScreen() {
  const params = useLocalSearchParams<{ returnTo?: string | string[]; ticketId?: string | string[] }>();
  const { accessToken } = useAuth();
  const explicitBackTo = getSafeReturnTo(params.returnTo);
  const backTo = explicitBackTo ?? "/(tabs)/profile";
  const requestedTicketId = readSingleParam(params.ticketId);
  const [isWriting, setIsWriting] = useState(false);
  const [editingTicket, setEditingTicket] = useState<SupportTicket | null>(null);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [openMenuTicketId, setOpenMenuTicketId] = useState<string | null>(null);
  const { data: tickets = [], isError, isLoading } = useSupportTickets(
    accessToken,
    requestedTicketId ? undefined : "inquiry",
  );
  const deleteTicket = useDeleteSupportTicket(accessToken);
  const requestedTicket = useMemo(
    () =>
      requestedTicketId
        ? tickets.find((ticket) => ticket.id === requestedTicketId && !isFeedbackTicket(ticket)) ?? null
        : null,
    [requestedTicketId, tickets],
  );
  const inquiryTickets = useMemo(
    () => tickets.filter((ticket) => !isFeedbackTicket(ticket) && ticket.kind === "inquiry"),
    [tickets],
  );
  const displayTickets = useMemo(
    () => prioritizeTicket(getInquiryTicketsWithRequestedTicket(inquiryTickets, requestedTicket), requestedTicketId),
    [inquiryTickets, requestedTicket, requestedTicketId],
  );
  const focusMessage =
    requestedTicketId && !isLoading && !requestedTicket
      ? "알림에서 연 문의를 찾지 못했어요. 최신 문의 내역을 먼저 보여드릴게요."
      : null;

  useEffect(() => {
    if (!requestedTicketId || !displayTickets.some((ticket) => ticket.id === requestedTicketId)) {
      return;
    }

    setExpandedTicketId(requestedTicketId);
    setOpenMenuTicketId(null);
  }, [displayTickets, requestedTicketId]);

  if (isWriting || editingTicket) {
    return (
      <SupportForm
        backTo={backTo}
        initialTicket={editingTicket ?? undefined}
        mode="inquiry"
        onCancel={() => {
          setEditingTicket(null);
          setIsWriting(false);
        }}
        onSubmitted={() => {
          setEditingTicket(null);
          setIsWriting(false);
        }}
      />
    );
  }

  const requestDelete = (ticket: SupportTicket) => {
    if (ticket.status !== "open") {
      Alert.alert("삭제할 수 없어요", "확인 중이거나 답변이 완료된 문의는 삭제할 수 없어요.");
      return;
    }

    Alert.alert("문의를 삭제할까요?", "삭제한 문의는 다시 확인할 수 없어요.", [
      { style: "cancel", text: "취소" },
      {
        style: "destructive",
        text: "삭제",
        onPress: () => {
          setOpenMenuTicketId(null);
          deleteTicket.mutate(ticket.id, {
            onError: () => {
              Alert.alert("삭제하지 못했어요", "잠시 후 다시 시도해 주세요.");
            },
          });
        },
      },
    ]);
  };

  return (
    <AppScreen
      backTo={backTo}
      title="문의하기"
      description="접수한 문의를 확인하고 새 문의를 남길 수 있어요."
      onBack={() => goBackOrReplaceReturnTo(explicitBackTo, "/(tabs)/profile")}
      right={
        <AddButton
          onPress={() => {
            setOpenMenuTicketId(null);
            setIsWriting(true);
          }}
        />
      }
    >
      {focusMessage ? (
        <Text className="px-1 text-xs font-bold leading-[18px] text-hypo-muted">{focusMessage}</Text>
      ) : null}

      {isLoading ? (
        <StateMessage title="문의 내역을 불러오는 중입니다." loading />
      ) : isError ? (
        <StateMessage title="문의 내역을 불러오지 못했어요." description="잠시 후 다시 확인해 주세요." />
      ) : displayTickets.length === 0 ? (
        <View className="gap-4">
          <StateMessage title="아직 문의한 내역이 없어요." description="계정, 공고, 신청 문제를 남기면 확인 후 답변드릴게요." />
          <PrimaryButton onPress={() => setIsWriting(true)}>문의 남기기</PrimaryButton>
        </View>
      ) : (
        <ListSection chrome="plain" surface="background">
          {displayTickets.map((ticket) => (
            <InquiryRow
              key={ticket.id}
              isExpanded={expandedTicketId === ticket.id}
              isMenuOpen={openMenuTicketId === ticket.id}
              ticket={ticket}
              onDelete={() => requestDelete(ticket)}
              onEdit={() => {
                if (ticket.status !== "open") {
                  Alert.alert("수정할 수 없어요", "확인 중이거나 답변이 완료된 문의는 수정할 수 없어요.");
                  return;
                }

                setOpenMenuTicketId(null);
                setEditingTicket(ticket);
              }}
              onToggleExpand={() => {
                setOpenMenuTicketId(null);
                setExpandedTicketId((current) => (current === ticket.id ? null : ticket.id));
              }}
              onToggleMenu={() => setOpenMenuTicketId((current) => (current === ticket.id ? null : ticket.id))}
            />
          ))}
        </ListSection>
      )}
    </AppScreen>
  );
}

function isFeedbackTicket(ticket: SupportTicket) {
  return ticket.metadata?.source === "mobile_feedback";
}

function getInquiryTicketsWithDemo(tickets: SupportTicket[]) {
  if (!__DEV__ || tickets.some((ticket) => ticket.status === "resolved" || ticket.status === "closed")) {
    return tickets;
  }

  return [...tickets, demoResolvedInquiryTicket];
}

function getInquiryTicketsWithRequestedTicket(
  inquiryTickets: SupportTicket[],
  requestedTicket: SupportTicket | null,
) {
  if (!requestedTicket || requestedTicket.kind === "inquiry") {
    return getInquiryTicketsWithDemo(inquiryTickets);
  }

  return getInquiryTicketsWithDemo([requestedTicket, ...inquiryTickets]);
}

function prioritizeTicket(tickets: SupportTicket[], ticketId: string | null) {
  if (!ticketId) {
    return tickets;
  }

  const matchedTicket = tickets.find((ticket) => ticket.id === ticketId);
  if (!matchedTicket) {
    return tickets;
  }

  return [matchedTicket, ...tickets.filter((ticket) => ticket.id !== ticketId)];
}

const demoResolvedInquiryTicket: SupportTicket = {
  body: "피드백 남기기 화면에서 제출 후 프로필로 돌아오는 흐름을 확인하고 싶어요.",
  category: "other",
  contact_email: "demo@example.com",
  created_at: "2026-06-09T09:30:00.000Z",
  id: "demo-resolved-support-ticket",
  kind: "inquiry",
  metadata: { source: "mobile_demo" },
  replies: [
    {
      created_at: "2026-06-09T10:00:00.000Z",
      id: "demo-resolved-support-ticket-reply",
      message: "확인했습니다. 피드백 제출 후 프로필 화면으로 돌아가도록 반영해 두었습니다.",
      ticket_id: "demo-resolved-support-ticket",
    },
  ],
  status: "resolved",
  subject: "답변 완료된 문의 예시",
  target_id: null,
  target_type: null,
  updated_at: "2026-06-09T10:00:00.000Z",
  user_id: "demo-user",
};

function AddButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="문의 남기기"
      accessibilityRole="button"
      hitSlop={10}
      className="h-10 w-10 items-center justify-center"
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
    >
      <Feather color="#1D2522" name="plus" size={23} />
    </Pressable>
  );
}

function InquiryRow({
  isExpanded,
  isMenuOpen,
  onDelete,
  onEdit,
  onToggleExpand,
  onToggleMenu,
  ticket,
}: {
  isExpanded: boolean;
  isMenuOpen: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onToggleExpand: () => void;
  onToggleMenu: () => void;
  ticket: SupportTicket;
}) {
  const title = ticket.subject?.trim() || getFallbackTitle(ticket);
  const category = categoryLabels[ticket.category] ?? "기타";
  const canEdit = ticket.status === "open";

  return (
    <ListRow appearance="flat" className={isMenuOpen ? "z-20" : "z-0"} size="comfortable" onPress={onToggleExpand}>
      <View className="relative gap-2.5 pr-1">
        <View className="flex-row items-center gap-2 pl-px pr-10">
          <CategoryBadge label={category} />
          <StatusBadge status={ticket.status} />
        </View>
        <View className="gap-1 pl-px pr-1">
          <Text numberOfLines={1} className="text-[15px] font-black leading-[21px] text-hypo-text">
            {title}
          </Text>
          <View className="flex-row items-end gap-2">
            <Text numberOfLines={2} className="min-w-0 flex-1 text-[13px] font-bold leading-[20px] text-hypo-muted">
              {ticket.body}
            </Text>
            <Text className="shrink-0 text-[12px] font-bold leading-4 text-hypo-muted">
              {formatDateTime(ticket.created_at)}
            </Text>
          </View>
        </View>
        {isExpanded ? <InquiryDetail ticket={ticket} /> : null}
        <Pressable
          accessibilityLabel="문의 메뉴"
          accessibilityRole="button"
          hitSlop={10}
          className="absolute right-0 top-[-2px] h-8 w-8 items-center justify-center"
          onPress={onToggleMenu}
        >
          <Feather color="#66706B" name="more-horizontal" size={20} />
        </Pressable>
        {isMenuOpen ? (
          <View className="absolute right-0 top-8 z-10 min-w-[128px] overflow-hidden rounded-[14px] border border-hypo-border bg-hypo-surface shadow-lg">
            <MenuAction disabled={!canEdit} label={canEdit ? "수정" : "수정 불가"} onPress={onEdit} />
            <MenuAction destructive disabled={!canEdit} label={canEdit ? "삭제" : "삭제 불가"} onPress={onDelete} />
          </View>
        ) : null}
      </View>
    </ListRow>
  );
}

function InquiryDetail({ ticket }: { ticket: SupportTicket }) {
  const replies = ticket.replies ?? [];

  return (
    <View className="mt-1 gap-3 rounded-[14px] bg-hypo-surface px-3.5 py-3">
      {replies.length ? (
        <View className="gap-2">
          <Text className="text-[11px] font-black text-[#8A9387]">운영팀 답변</Text>
          {replies.map((reply) => (
            <View key={reply.id} className="gap-1 rounded-[12px] bg-hypo-brandSoft px-3 py-2.5">
              <Text className="text-[13px] font-bold leading-5 text-hypo-text">{reply.message}</Text>
              <Text className="text-right text-[11px] font-bold leading-4 text-hypo-muted">
                {formatDateTime(reply.created_at)}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <Text className="text-[13px] font-bold leading-5 text-hypo-muted">
          아직 등록된 답변이 없어요.
        </Text>
      )}
      {ticket.status === "resolved" || ticket.status === "closed" ? (
        <Text className="text-xs font-bold leading-[18px] text-hypo-muted">답변이 완료된 문의는 수정할 수 없어요.</Text>
      ) : null}
    </View>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <View className="gap-1">
      <Text className="text-[11px] font-black text-[#8A9387]">{label}</Text>
      <Text className="text-[13px] font-bold leading-5 text-hypo-text">{value}</Text>
    </View>
  );
}

function MenuAction({
  destructive,
  disabled,
  label,
  onPress,
}: {
  destructive?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-10 justify-center px-4"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ opacity: disabled ? 0.42 : pressed ? 0.72 : 1 })}
    >
      <Text className={`text-[13px] font-black ${destructive ? "text-hypo-danger" : "text-hypo-text"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function CategoryBadge({ label }: { label: string }) {
  return (
    <View className="flex-row items-center gap-1.5 rounded-full bg-[#EEF2EF] px-2.5 py-1">
      <Text className="text-[11px] font-black text-[#66706B]">유형</Text>
      <View className="h-2.5 w-px bg-[#D3DAD1]" />
      <Text className="text-[11px] font-black text-hypo-text">{label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: SupportTicket["status"] }) {
  const label = getStatusLabel(status);
  const color = getStatusColor(status);

  return (
    <View className={`rounded-full px-2.5 py-1 ${color.background}`}>
      <Text className={`text-[11px] font-black ${color.text}`}>{label}</Text>
    </View>
  );
}

function getStatusColor(status: SupportTicket["status"]) {
  if (status === "resolved" || status === "closed") {
    return { background: "bg-[#EEF2EF]", text: "text-[#66706B]" };
  }

  if (status === "in_review") {
    return { background: "bg-[#FFF4D9]", text: "text-[#8A6116]" };
  }

  return { background: "bg-hypo-brandSoft", text: "text-hypo-brand" };
}

function getStatusLabel(status: SupportTicket["status"]) {
  switch (status) {
    case "closed":
      return "종료";
    case "in_review":
      return "확인 중";
    case "resolved":
      return "답변 완료";
    case "open":
    default:
      return "접수됨";
  }
}

function readSingleParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.find((item) => item.trim()) ?? null;
  }

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getFallbackTitle(ticket: SupportTicket) {
  return `${categoryLabels[ticket.category] ?? "기타"} 문의`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
