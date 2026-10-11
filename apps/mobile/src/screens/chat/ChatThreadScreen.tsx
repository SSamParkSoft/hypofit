import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  FlatList,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "react-native-reanimated";
import type { ChatMessage, ChatRoom } from "@hypofit/contracts";
import { useChatHistory } from "@/features/chat/useChatHistory";
import type { ChatWorkflowAction } from "@hypofit/contracts";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  useChatMessages,
  useChatRoom,
  useChatWorkflow,
  useMarkChatRoomRead,
  useSendChatMessage,
  useUpdateChatRoomSettings,
} from "@/features/chat/useChat";
import { useUpdateApplicationStatus } from "@/features/applications/useApplicationMutations";
import {
  useConfirmAttendance,
  useConfirmRewardReceived,
  useCreateInterviewReview,
  useDisputeReward,
  useMarkRewardPaid,
  useMarkNoShow,
} from "@/features/sessions/useSessionMutations";
import { StateMessage } from "@/shared/ui/StateMessage";
import { ApiError } from "@/shared/api/client";
import { useChatMessagePolling } from "./useChatMessagePolling";
import { goBackOrReplaceFallback } from "@/shared/navigation/backNavigation";
import { colors } from "@/shared/theme/tokens";
import { CounterpartProfileModal, getCounterpart } from "./CounterpartProfileModal";
import {
  canGroupChatMessages,
  countNewCounterpartMessages,
  getUnconfirmedOutgoingMessages,
  type OutgoingChatMessage,
} from "./chatThreadPresentation";
import { ChatThreadHeader } from "./ChatThreadHeader";
import {
  MessageBubble,
  MessageDateSeparator,
  OutgoingMessageBubble,
  getMessageDateKey,
} from "./ChatThreadMessages";
import { ApplicationReviewModal, RejectApplicationModal, ReviewModal } from "./ChatThreadDialogs";
import { ChatThreadMenu, ChatWorkflowActionStrip, ApplicantReviewActions } from "./ChatThreadActions";

const MESSAGE_BOTTOM_THRESHOLD = 72;

function createClientMessageId() {
  const randomUUID = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID;
  if (randomUUID) return randomUUID();
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function ChatThreadScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ roomId?: string }>();
  const roomId = Array.isArray(params.roomId) ? params.roomId[0] : params.roomId;
  const { accessToken, appUser } = useAuth();
  const handleBack = useCallback(() => {
    goBackOrReplaceFallback("/(tabs)/chat");
  }, []);
  const threadReturnTo = roomId ? `/(tabs)/chat/${roomId}` : "/(tabs)/chat";
  const {
    data: room,
    isError: isRoomError,
    isLoading: isRoomLoading,
    refetch: refetchRoom,
  } = useChatRoom(roomId, accessToken);
  const { data: workflow } = useChatWorkflow(roomId, accessToken);
  const {
    data: latestMessages,
    dataUpdatedAt: messagesDataUpdatedAt,
    isError: isMessagesError,
    isLoading: isMessagesLoading,
    refetch: refetchMessages,
    shouldPollMessages,
  } = useChatMessagePolling(roomId, accessToken);
  const history = useChatHistory(roomId, appUser?.id, accessToken, latestMessages);
  const messages = history.messages;
  const { isPending: isMarkingRead, mutate: markRoomRead } = useMarkChatRoomRead(roomId, accessToken);
  const sendMessage = useSendChatMessage(roomId, accessToken);
  const updateSettings = useUpdateChatRoomSettings(roomId, accessToken);
  const updateApplicationStatus = useUpdateApplicationStatus(accessToken);
  const confirmAttendance = useConfirmAttendance(accessToken);
  const markRewardPaid = useMarkRewardPaid(accessToken);
  const confirmRewardReceived = useConfirmRewardReceived(accessToken);
  const disputeReward = useDisputeReward(accessToken);
  const createReview = useCreateInterviewReview(accessToken);
  const markNoShow = useMarkNoShow(accessToken);
  const [body, setBody] = useState("");
  const [outgoingMessages, setOutgoingMessages] = useState<OutgoingChatMessage[]>([]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showLatestButton, setShowLatestButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const reduceMotion = useReducedMotion();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isApplicationReviewOpen, setIsApplicationReviewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const latestReadSubmittedMessageIdRef = useRef<string | null>(null);
  const scrollViewRef = useRef<FlatList<ChatMessage> | null>(null);
  const isNearBottomRef = useRef(true);
  const hasMeasuredScrollRef = useRef(false);
  const previousLatestMessageIdRef = useRef<string | null>(null);
  const sendInFlightRef = useRef(false);
  const visibleOutgoingMessages = useMemo(
    () => getUnconfirmedOutgoingMessages(outgoingMessages, messages, roomId),
    [outgoingMessages, messages, roomId],
  );

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () => setIsKeyboardVisible(true));
    const hide = Keyboard.addListener("keyboardDidHide", () => setIsKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  const latestCounterpartMessage = useMemo(() => {
    if (!appUser?.id) return null;

    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.sender_id && message.sender_id !== appUser.id) {
        return message;
      }
    }

    return null;
  }, [appUser?.id, messages]);

  useEffect(() => {
    latestReadSubmittedMessageIdRef.current = null;
    isNearBottomRef.current = true;
    hasMeasuredScrollRef.current = false;
    previousLatestMessageIdRef.current = null;
    setShowLatestButton(false);
    setNewMessageCount(0);
    setBody("");
    setOutgoingMessages([]);
  }, [roomId]);

  useEffect(() => {
    const previousId = previousLatestMessageIdRef.current;
    const latestId = messages.at(-1)?.id ?? null;
    previousLatestMessageIdRef.current = latestId;
    if (!previousId || previousId === latestId || isNearBottomRef.current) return;
    const count = countNewCounterpartMessages(messages, previousId, appUser?.id);
    if (count) setNewMessageCount((current) => current + count);
  }, [messages, appUser?.id]);

  const submitReadForMessage = useCallback(
    (messageId: string) => {
      if (isMarkingRead) return;
      if (latestReadSubmittedMessageIdRef.current === messageId) return;

      latestReadSubmittedMessageIdRef.current = messageId;
      markRoomRead({ last_read_message_id: messageId }, {
        onError: () => {
          latestReadSubmittedMessageIdRef.current = null;
        },
      });
    },
    [isMarkingRead, markRoomRead],
  );

  useEffect(() => {
    if (!shouldPollMessages || !latestCounterpartMessage || !isNearBottomRef.current) return;
    submitReadForMessage(latestCounterpartMessage.id);
  }, [latestCounterpartMessage, shouldPollMessages, submitReadForMessage]);

  const updateNearBottom = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    hasMeasuredScrollRef.current = true;
    isNearBottomRef.current = distanceFromBottom <= MESSAGE_BOTTOM_THRESHOLD;
    setShowLatestButton(!isNearBottomRef.current);
    if (isNearBottomRef.current) {
      setNewMessageCount(0);
      if (shouldPollMessages && latestCounterpartMessage) submitReadForMessage(latestCounterpartMessage.id);
    }
  }, [latestCounterpartMessage, shouldPollMessages, submitReadForMessage]);

  const handleContentSizeChange = useCallback(() => {
    if (!messages.length && !visibleOutgoingMessages.length) return;

    const shouldAutoScroll = !hasMeasuredScrollRef.current || isNearBottomRef.current;

    if (!shouldAutoScroll) return;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: hasMeasuredScrollRef.current && !reduceMotion });
      isNearBottomRef.current = true;
      setShowLatestButton(false);
      setNewMessageCount(0);

      if (latestCounterpartMessage) {
        submitReadForMessage(latestCounterpartMessage.id);
      }
    });
  }, [latestCounterpartMessage, messages, visibleOutgoingMessages.length, reduceMotion, submitReadForMessage]);

  const scrollToLatest = () => {
    scrollViewRef.current?.scrollToEnd({ animated: !reduceMotion });
    isNearBottomRef.current = true;
    setShowLatestButton(false);
    setNewMessageCount(0);
    if (shouldPollMessages && latestCounterpartMessage) submitReadForMessage(latestCounterpartMessage.id);
  };

  const counterpart = useMemo(() => (room ? getCounterpart(room, appUser?.id) : null), [appUser?.id, room]);
  const canReviewApplication = Boolean(
    room &&
      appUser?.id &&
      room.founder_id === appUser.id &&
      room.status === "open" &&
      room.application?.status === "applied",
  );
  const composerState = getComposerState(room ?? null);
  const isWorkflowPending =
    confirmAttendance.isPending ||
    markRewardPaid.isPending ||
    confirmRewardReceived.isPending ||
    disputeReward.isPending ||
    createReview.isPending ||
    markNoShow.isPending ||
    updateApplicationStatus.isPending;

  const openReport = useCallback(() => {
    if (!room) return;
    const reportCounterpart = getCounterpart(room, appUser?.id);
    router.push({
      pathname: "/support/report",
      params: {
        category: "chat",
        counterpart_name: reportCounterpart?.name,
        interview_title: room.interview_post?.title,
        returnTo: threadReturnTo,
        target_id: room.id,
        target_type: "chat_room",
      },
    });
  }, [appUser?.id, room, threadReturnTo]);

  const runWorkflowAction = useCallback(
    (action: ChatWorkflowAction) => {
      const sessionId = workflow?.session?.id;
      if (action === "open_application_answers") {
        setIsApplicationReviewOpen(true);
        return;
      }
      if (action === "select_application") {
        if (!room?.application_id) return;
        Alert.alert("이 신청자를 선정할까요?", "선정하면 상대방에게 바로 안내되고, 이 채팅에서 일정을 조율할 수 있어요.", [
          { style: "cancel", text: "취소" },
          {
            onPress: () => {
              updateApplicationStatus.mutate({
                applicationId: room.application_id,
                input: { status: "selected" },
              });
            },
            text: "선정하기",
          },
        ]);
        return;
      }
      if (action === "reject_application") {
        setIsRejectOpen(true);
        return;
      }
      if (action === "create_schedule") {
        if (!room?.application_id || !roomId) return;
        router.push({
          pathname: "/(tabs)/chat/schedule",
          params: {
            applicationId: room.application_id,
            returnTo: threadReturnTo,
            roomId,
          },
        });
        return;
      }
      if (action === "open_support_report") {
        openReport();
        return;
      }
      if (!sessionId) {
        Alert.alert("진행 상태를 확인하지 못했어요", "잠시 후 다시 시도해 주세요.");
        return;
      }
      if (action === "confirm_attendance") {
        Alert.alert("인터뷰를 진행했나요?", "만남을 확인하면 상대에게도 확인 요청이 보내져요.", [
          { style: "cancel", text: "취소" },
          {
            onPress: () => confirmAttendance.mutate({ roomId, sessionId }),
            text: "만남 확인",
          },
        ]);
        return;
      }
      if (action === "mark_no_show") {
        const noShowParty = room?.founder_id === appUser?.id ? "respondent" : "founder";
        Alert.alert("상대가 오지 않았나요?", "노쇼로 기록하면 이 인터뷰는 종료되고, 채팅에 상태가 남아요.", [
          { style: "cancel", text: "취소" },
          {
            onPress: () => markNoShow.mutate({ input: { no_show_party: noShowParty }, roomId, sessionId }),
            style: "destructive",
            text: "노쇼 기록",
          },
        ]);
        return;
      }
      if (action === "mark_reward_paid") {
        Alert.alert("보상 지급을 완료했나요?", "지급 완료로 표시하면 상대에게 수령 확인 요청이 보내져요.", [
          { style: "cancel", text: "취소" },
          {
            onPress: () => markRewardPaid.mutate({ roomId, sessionId }),
            text: "지급 완료로 표시",
          },
        ]);
        return;
      }
      if (action === "confirm_reward_received") {
        Alert.alert("보상을 받았나요?", "받았다고 확인하면 후기를 남길 수 있어요.", [
          { style: "cancel", text: "취소" },
          {
            onPress: () => confirmRewardReceived.mutate({ roomId, sessionId }),
            text: "받았어요",
          },
        ]);
        return;
      }
      if (action === "dispute_reward") {
        Alert.alert("보상 확인에 문제가 있나요?", "문제를 접수하면 채팅 기록과 함께 확인할 수 있어요.", [
          { style: "cancel", text: "취소" },
          {
            onPress: () => disputeReward.mutate({ input: { reason: "보상 수령 확인 필요" }, roomId, sessionId }),
            style: "destructive",
            text: "문제 신고",
          },
        ]);
        return;
      }
      if (action === "write_review") {
        setIsReviewOpen(true);
      }
    },
    [
      confirmAttendance,
      confirmRewardReceived,
      disputeReward,
      markRewardPaid,
      markNoShow,
      openReport,
      room,
      roomId,
      appUser?.id,
      threadReturnTo,
      updateApplicationStatus,
      workflow?.session?.id,
    ],
  );

  const sendOutgoingMessage = (message: OutgoingChatMessage) => {
    if (sendInFlightRef.current || message.roomId !== roomId || composerState.disabled) return;
    sendInFlightRef.current = true;
    setOutgoingMessages((current) => current.map((item) => item.clientId === message.clientId
      ? { ...item, status: "sending", error: undefined } : item));
    sendMessage.mutate(
      { body: message.body, client_message_id: message.clientId },
      {
        onSuccess: () => {
          setOutgoingMessages((current) => current.filter((item) => item.clientId !== message.clientId));
        },
        onError: (error) => {
          const errorMessage = error instanceof ApiError && error.status === 403
            ? "이 대화에서는 메시지를 보낼 수 없어요."
            : error instanceof ApiError && error.status === 409
              ? "현재 참여 상태에서는 메시지를 보낼 수 없어요."
              : "전송하지 못했어요. 다시 시도해 주세요.";
          if (error instanceof ApiError && (error.status === 403 || error.status === 409)) {
            void refetchRoom();
          }
          setOutgoingMessages((current) => current.map((item) => item.clientId === message.clientId
            ? { ...item, status: "failed", error: errorMessage } : item));
        },
        onSettled: () => { sendInFlightRef.current = false; },
      },
    );
  };

  const submit = () => {
    const nextBody = body.trim();
    if (!nextBody || !roomId || composerState.disabled || sendInFlightRef.current) return;
    const message: OutgoingChatMessage = {
      clientId: createClientMessageId(), roomId, body: nextBody,
      status: "sending",
    };
    setBody("");
    isNearBottomRef.current = true;
    setOutgoingMessages((current) => [...current, message]);
    sendOutgoingMessage(message);
  };

  if (!accessToken) {
    return (
      <View className="flex-1 bg-hypo-bg px-4" style={{ paddingTop: insets.top + 12 }}>
        <ChatThreadHeader title="대화" onBack={handleBack} />
        <StateMessage title="로그인이 필요해요." description="채팅은 로그인 후 확인할 수 있어요." />
      </View>
    );
  }

  const hasLoadedMessagesOnce = messagesDataUpdatedAt > 0;
  const isLoading = isRoomLoading || isMessagesLoading;
  const isError = isRoomError || (isMessagesError && !hasLoadedMessagesOnce);

  return (
    <View className="flex-1 bg-hypo-bg">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-1 px-5" style={{ paddingTop: insets.top + 8 }}>
          <ChatThreadHeader
            counterpart={counterpart}
            title={counterpart?.name ?? "대화"}
            subtitle={room?.interview_post?.title}
            onBack={handleBack}
            isMuted={room?.is_muted}
            isMuting={updateSettings.isPending}
            onMenu={room ? () => setIsMenuOpen(true) : undefined}
            onMuteToggle={() => {
              if (room) {
                updateSettings.mutate({ is_muted: !room.is_muted });
              }
            }}
            onProfile={() => setIsProfileOpen(true)}
          />

          <View className="mt-2 min-h-0 flex-1 bg-hypo-bg">
            {isLoading ? <StateMessage title="대화를 불러오는 중입니다." loading /> : null}
            {isError ? (
              <View>
                <StateMessage title="대화를 불러오지 못했어요." description="잠시 후 다시 시도해 주세요." />
                <Pressable accessibilityRole="button" className="min-h-11 items-center justify-center" onPress={() => {
                  void refetchRoom();
                  void refetchMessages();
                }}>
                  <Text className="text-sm font-semibold text-hypo-brand">다시 시도</Text>
                </Pressable>
              </View>
            ) : null}
            {!isLoading && !isError ? (
              <FlatList
                ref={scrollViewRef}
                data={messages}
                keyExtractor={(message) => message.id}
                maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
                contentContainerClassName="py-4"
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={handleContentSizeChange}
                onScroll={updateNearBottom}
                ListHeaderComponent={history.hasOlder || history.isHistoryError ? <View>
                  {history.hasOlder ? <Pressable
                    accessibilityRole="button"
                    disabled={history.isLoadingOlder}
                    className="min-h-11 items-center justify-center"
                    onPress={() => {
                      isNearBottomRef.current = false;
                      hasMeasuredScrollRef.current = true;
                      void history.loadOlder();
                    }}
                  >
                    <Text className="text-sm font-semibold text-hypo-brand">{history.isLoadingOlder ? "불러오는 중" : "이전 메시지 보기"}</Text>
                  </Pressable> : null}
                  {history.isHistoryError ? <Text accessibilityRole="alert" className="text-sm text-hypo-danger">이전 메시지를 불러오지 못했어요. 다시 시도해 주세요.</Text> : null}
                </View> : null}
                ListEmptyComponent={visibleOutgoingMessages.length ? null : <StateMessage title="아직 메시지가 없어요." />}
                renderItem={({ item: message, index }) => {
                    const previousMessage = index > 0 ? messages[index - 1] : null;
                    const shouldShowDate =
                      !previousMessage ||
                      getMessageDateKey(previousMessage.created_at) !== getMessageDateKey(message.created_at);

                    return (
                      <View key={message.id} className={canGroupChatMessages(previousMessage, message) ? "mt-1" : "mt-3"}>
                        {shouldShowDate ? <MessageDateSeparator value={message.created_at} /> : null}
                        <MessageBubble
                          currentUserId={appUser?.id}
                          message={message}
                          showTime={!canGroupChatMessages(message, messages[index + 1])}
                        />
                      </View>
                    );
                }}
                ListFooterComponent={<View>{visibleOutgoingMessages.map((message) => (
                  <OutgoingMessageBubble
                    key={message.clientId}
                    message={message}
                    disabled={sendMessage.isPending || composerState.disabled}
                    onRetry={() => sendOutgoingMessage(message)}
                    onRemove={() => setOutgoingMessages((current) => current.filter((item) => item.clientId !== message.clientId))}
                  />
                ))}</View>}
              />
            ) : null}
            {showLatestButton && !isLoading && !isError ? (
              <View className="absolute bottom-3 left-0 right-0 items-center" pointerEvents="box-none">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={newMessageCount ? `새 메시지 ${newMessageCount}개, 최근 메시지로 이동` : "최근 메시지로 이동"}
                  accessibilityLiveRegion="polite"
                  className="min-h-11 flex-row items-center gap-2 rounded-full border border-hypo-border bg-hypo-surface px-4"
                  onPress={scrollToLatest}
                >
                  <Feather name="arrow-down" color={colors.brand} size={18} />
                  <Text className="text-[13px] font-semibold text-hypo-text">{newMessageCount ? `새 메시지 ${newMessageCount}개` : "최근 메시지"}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <CounterpartProfileModal
          currentUserId={appUser?.id}
          room={isProfileOpen ? room ?? null : null}
          onClose={() => setIsProfileOpen(false)}
          onReport={(reportRoom) => {
            const reportCounterpart = getCounterpart(reportRoom, appUser?.id);
            setIsProfileOpen(false);
            router.push({
              pathname: "/support/report",
              params: {
                category: "chat",
                counterpart_name: reportCounterpart?.name,
                interview_title: reportRoom.interview_post?.title,
                returnTo: threadReturnTo,
                target_id: reportRoom.id,
                target_type: "chat_room",
              },
            });
          }}
        />

        <ApplicationReviewModal
          application={room?.application ?? null}
          isOpen={isApplicationReviewOpen}
          applicantName={counterpart?.name}
          onClose={() => setIsApplicationReviewOpen(false)}
        />

        <RejectApplicationModal
          applicationId={room?.application_id}
          isOpen={isRejectOpen}
          isSubmitting={updateApplicationStatus.isPending}
          onClose={() => setIsRejectOpen(false)}
          onSubmit={(rejectionReason) => {
            if (!room?.application_id) return;
            updateApplicationStatus.mutate(
              {
                applicationId: room.application_id,
                input: { rejection_reason: rejectionReason, status: "rejected" },
              },
              {
                onSuccess: () => {
                  setIsRejectOpen(false);
                },
              },
            );
          }}
        />

        <ReviewModal
          isOpen={isReviewOpen}
          isSubmitting={createReview.isPending}
          onClose={() => setIsReviewOpen(false)}
          onSubmit={(input) => {
            const sessionId = workflow?.session?.id;
            if (!sessionId) return;
            createReview.mutate(
              { input, roomId, sessionId },
              { onSuccess: () => setIsReviewOpen(false) },
            );
          }}
        />

        <ChatThreadMenu
          anchorTop={insets.top + 56}
          isHiding={updateSettings.isPending}
          onHide={() => {
            updateSettings.mutate({ is_hidden: true }, {
              onSuccess: () => {
                setIsMenuOpen(false);
                router.replace("/(tabs)/chat");
              },
              onError: () => Alert.alert("대화를 숨기지 못했어요", "잠시 후 다시 시도해 주세요."),
            });
          }}
          isCanceling={updateApplicationStatus.isPending}
          isOpen={isMenuOpen}
          room={room ?? null}
          workflow={workflow}
          isWorkflowPending={isWorkflowPending}
          onWorkflowAction={(action) => {
            setIsMenuOpen(false);
            runWorkflowAction(action);
          }}
          onCancelInterview={() => {
            if (!room) return;
            Alert.alert("참여를 취소할까요?", "취소하면 상대방에게도 상태가 안내돼요.", [
              { style: "cancel", text: "아니요" },
              {
                onPress: () => {
                  updateApplicationStatus.mutate(
                    { applicationId: room.application_id, input: { status: "canceled" } },
                    { onSuccess: () => setIsMenuOpen(false) },
                  );
                },
                style: "destructive",
                text: "취소하기",
              },
            ]);
          }}
          onClose={() => setIsMenuOpen(false)}
          onDetail={() => {
            if (!room?.interview_post_id) return;
            setIsMenuOpen(false);
            router.push({
              pathname: "/interviews/[postId]",
              params: { postId: room.interview_post_id, returnTo: threadReturnTo },
            });
          }}
          onReport={() => {
            if (!room) return;
            const reportCounterpart = getCounterpart(room, appUser?.id);
            setIsMenuOpen(false);
            router.push({
              pathname: "/support/report",
              params: {
                category: "chat",
                counterpart_name: reportCounterpart?.name,
                interview_title: room.interview_post?.title,
                returnTo: threadReturnTo,
                target_id: room.id,
                target_type: "chat_room",
              },
            });
          }}
        />

        <View
          className="bg-hypo-bg px-5 pt-2"
          style={{ paddingBottom: isKeyboardVisible ? 8 : Math.max(insets.bottom + 8, 12) }}
        >
          {canReviewApplication ? (
            <ApplicantReviewActions
              disabled={updateApplicationStatus.isPending}
              onOpenAnswers={() => setIsApplicationReviewOpen(true)}
              onReject={() => setIsRejectOpen(true)}
              onSelect={() => {
                if (!room?.application_id) return;
                Alert.alert("이 신청자를 선정할까요?", "선정하면 상대방에게 바로 안내되고, 이 채팅에서 일정을 조율할 수 있어요.", [
                  { style: "cancel", text: "취소" },
                  {
                    onPress: () => {
                      updateApplicationStatus.mutate({
                        applicationId: room.application_id,
                        input: { status: "selected" },
                      });
                    },
                    text: "선정하기",
                  },
                ]);
              }}
            />
          ) : workflow ? (
            <ChatWorkflowActionStrip
              disabled={isWorkflowPending}
              room={room ?? null}
              workflow={workflow}
              onOpenMeetingLink={async (url) => {
                try {
                  await WebBrowser.openBrowserAsync(url);
                } catch {
                  Alert.alert("화상 링크를 열지 못했어요", "잠시 후 다시 시도해 주세요.");
                }
              }}
              onAction={runWorkflowAction}
            />
          ) : null}
          <View className="flex-row items-end gap-2 rounded-[18px] border border-hypo-border bg-hypo-surface pl-4 pr-1 py-1">
            <TextInput
              multiline
              editable={!composerState.disabled}
              placeholder={composerState.placeholder}
              placeholderTextColor="#98A196"
              scrollEnabled
              accessibilityLabel="메시지 내용"
              className={`max-h-28 min-h-10 flex-1 text-[15px] leading-5 ${composerState.disabled ? "text-hypo-muted" : "text-hypo-text"}`}
              style={{ fontFamily: "HypofitSansMedium", paddingBottom: 5, paddingTop: 8 }}
              textAlignVertical="center"
              value={body}
              onChangeText={setBody}
            />
            <Pressable
              accessibilityLabel="메시지 전송"
              accessibilityRole="button"
              disabled={composerState.disabled || !body.trim() || sendMessage.isPending}
              accessibilityState={{ disabled: composerState.disabled || !body.trim() || sendMessage.isPending }}
              className="h-11 w-11 items-center justify-center"
              onPress={submit}
            >
              <Feather color={composerState.disabled || !body.trim() || sendMessage.isPending ? colors.textSoft : colors.brand} name="arrow-up" size={22} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function getComposerState(room: ChatRoom | null): { disabled: boolean; placeholder: string } {
  if (!room) return { disabled: true, placeholder: "대화를 불러오는 중입니다" };
  if (room.status === "blocked") return { disabled: true, placeholder: "차단된 상대와는 대화할 수 없어요" };
  if (room.status === "closed") return { disabled: true, placeholder: "종료된 참여예요" };

  const applicationStatus = room.application?.status;
  if (applicationStatus === "rejected" || applicationStatus === "canceled") {
    return { disabled: true, placeholder: "종료된 참여예요" };
  }
  if (applicationStatus === "no_show") {
    return { disabled: true, placeholder: "종료된 참여예요" };
  }

  return { disabled: false, placeholder: "메시지를 입력하세요" };
}
