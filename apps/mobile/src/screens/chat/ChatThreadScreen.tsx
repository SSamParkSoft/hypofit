import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ChatMessage, ChatRoom } from "@hypofit/contracts";
import type { ChatWorkflow, ChatWorkflowAction } from "@hypofit/contracts";
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
import { formatAnswerLabel } from "@/features/workflow/readModels";
import { StateMessage } from "@/screens/home/HomeScreen";
import { ApiError } from "@/shared/api/client";
import { useAppActive } from "@/shared/hooks/useAppActive";
import { goBackOrReplaceFallback } from "@/shared/navigation/backNavigation";
import { Avatar, CounterpartProfileModal, getCounterpart } from "./CounterpartProfileModal";

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
  const isAppActive = useAppActive();
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const [pollingFailureCount, setPollingFailureCount] = useState(0);
  const shouldPollMessages = isScreenFocused && isAppActive && Boolean(accessToken && roomId);
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
    data: messages = [],
    dataUpdatedAt: messagesDataUpdatedAt,
    errorUpdatedAt: messagesErrorUpdatedAt,
    isError: isMessagesError,
    isLoading: isMessagesLoading,
  } = useChatMessages(roomId, accessToken, {
    pollingEnabled: shouldPollMessages,
    pollingIntervalMs: resolveChatPollingInterval(pollingFailureCount),
  });
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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isApplicationReviewOpen, setIsApplicationReviewOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const latestReadSubmittedMessageIdRef = useRef<string | null>(null);
  const lastMessagesDataUpdatedAtRef = useRef(0);
  const lastMessagesErrorUpdatedAtRef = useRef(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const isNearBottomRef = useRef(true);
  const hasMeasuredScrollRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      return () => {
        setIsScreenFocused(false);
      };
    }, []),
  );

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
    setPollingFailureCount(0);
  }, [roomId]);

  useEffect(() => {
    if (messagesDataUpdatedAt && messagesDataUpdatedAt !== lastMessagesDataUpdatedAtRef.current) {
      lastMessagesDataUpdatedAtRef.current = messagesDataUpdatedAt;
      setPollingFailureCount(0);
    }
  }, [messagesDataUpdatedAt]);

  useEffect(() => {
    if (messagesErrorUpdatedAt && messagesErrorUpdatedAt !== lastMessagesErrorUpdatedAtRef.current) {
      lastMessagesErrorUpdatedAtRef.current = messagesErrorUpdatedAt;
      setPollingFailureCount((count) => count + 1);
    }
  }, [messagesErrorUpdatedAt]);

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
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (!messages.length) return;

    const latestMessage = messages[messages.length - 1];
    const isLatestMine = Boolean(latestMessage.sender_id && latestMessage.sender_id === appUser?.id);
    const shouldAutoScroll = !hasMeasuredScrollRef.current || isNearBottomRef.current || isLatestMine;

    if (!shouldAutoScroll) return;

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollToEnd({ animated: hasMeasuredScrollRef.current });
      isNearBottomRef.current = true;

      if (latestCounterpartMessage) {
        submitReadForMessage(latestCounterpartMessage.id);
      }
    });
  }, [appUser?.id, latestCounterpartMessage, messages, submitReadForMessage]);

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

  const submit = () => {
    const nextBody = body.trim();
    if (!nextBody || !roomId || composerState.disabled) return;
    setBody("");
    sendMessage.mutate(
      { body: nextBody, client_message_id: createClientMessageId() },
      {
        onError: (error) => {
          setBody(nextBody);
          if (error instanceof ApiError && error.status === 403) {
            Alert.alert("메시지를 보낼 수 없어요", "차단된 상대와는 더 이상 대화할 수 없어요.");
            return;
          }
          if (error instanceof ApiError && error.status === 409) {
            void refetchRoom();
            Alert.alert("메시지를 보낼 수 없어요", "종료된 인터뷰라 새 메시지를 보낼 수 없어요.");
            return;
          }
          Alert.alert("메시지를 보내지 못했어요", "잠시 후 다시 시도해 주세요.");
        },
      },
    );
  };

  if (!accessToken) {
    return (
      <View className="flex-1 bg-hypo-bg px-4" style={{ paddingTop: insets.top + 12 }}>
        <Header title="대화" onBack={handleBack} />
        <StateMessage title="로그인이 필요해요." description="인터뷰 대화는 로그인 후 확인할 수 있어요." />
      </View>
    );
  }

  const hasLoadedMessagesOnce = messagesDataUpdatedAt > 0;
  const isLoading = isRoomLoading || isMessagesLoading;
  const isError = isRoomError || (isMessagesError && !hasLoadedMessagesOnce);

  return (
    <View className="flex-1 bg-hypo-bg">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-1 px-4" style={{ paddingTop: insets.top + 12 }}>
          <Header
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

          <View className="mt-3 min-h-0 flex-1 bg-hypo-bg">
            {isLoading ? <StateMessage title="대화를 불러오는 중입니다." loading /> : null}
            {isError ? (
              <StateMessage title="대화를 불러오지 못했습니다." description="API 연결 상태를 확인한 뒤 다시 시도하세요." />
            ) : null}
            {!isLoading && !isError ? (
              <ScrollView
                ref={scrollViewRef}
                contentContainerClassName="gap-2.5 px-3 py-4"
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                onContentSizeChange={handleContentSizeChange}
                onScroll={updateNearBottom}
              >
                {messages.length ? (
                  messages.map((message, index) => {
                    const previousMessage = index > 0 ? messages[index - 1] : null;
                    const shouldShowDate =
                      !previousMessage ||
                      getMessageDateKey(previousMessage.created_at) !== getMessageDateKey(message.created_at);

                    return (
                      <View key={message.id}>
                        {shouldShowDate ? <MessageDateSeparator value={message.created_at} /> : null}
                        <MessageBubble
                          currentUserId={appUser?.id}
                          message={message}
                        />
                      </View>
                    );
                  })
                ) : (
                  <StateMessage title="아직 메시지가 없어요." description="일정이나 장소를 먼저 제안해보세요." />
                )}
              </ScrollView>
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
          respondentName={counterpart?.name}
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
          isCanceling={updateApplicationStatus.isPending}
          isOpen={isMenuOpen}
          room={room ?? null}
          onCancelInterview={() => {
            if (!room) return;
            Alert.alert("인터뷰를 취소할까요?", "취소하면 상대방에게도 상태가 안내돼요.", [
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
          className="border-t border-hypo-border bg-hypo-bg px-4 pt-2"
          style={{ paddingBottom: Math.max(insets.bottom + 8, 12) }}
        >
          {canReviewApplication ? (
            <FounderApplicationActionStrip
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
              workflow={workflow}
              onAction={runWorkflowAction}
            />
          ) : null}
          <View className="flex-row items-end gap-2 rounded-[18px] border border-hypo-border bg-hypo-surface px-3 py-2">
            <TextInput
              multiline
              editable={!composerState.disabled}
              placeholder={composerState.placeholder}
              placeholderTextColor="#98A196"
              scrollEnabled={false}
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
              className="h-9 w-9 items-center justify-center"
              onPress={submit}
            >
              <Feather color={composerState.disabled || !body.trim() || sendMessage.isPending ? "#A3ABA0" : "#176B5D"} name="send" size={20} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Header({
  counterpart,
  isMuted,
  isMuting,
  onBack,
  onMenu,
  onMuteToggle,
  onProfile,
  subtitle,
  title,
}: {
  counterpart?: ReturnType<typeof getCounterpart> | null;
  isMuted?: boolean;
  isMuting?: boolean;
  onBack: () => void;
  onMenu?: () => void;
  onMuteToggle?: () => void;
  onProfile?: () => void;
  subtitle?: string;
  title: string;
}) {
  return (
    <View className="min-h-11 flex-row items-center gap-2">
      <Pressable
        accessibilityLabel="뒤로 가기"
        accessibilityRole="button"
        hitSlop={12}
        className="h-10 w-9 items-center justify-center"
        onPress={onBack}
      >
        <ChevronIcon direction="left" tone="text" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        className="min-w-0 flex-1 flex-row items-center gap-2"
        disabled={!onProfile}
        onPress={onProfile}
      >
        <Avatar sizeClassName="h-9 w-9" textClassName="text-[13px]" user={counterpart} />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[18px] leading-[24px] text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>
            {title}
          </Text>
          {subtitle ? (
            <Text
              numberOfLines={1}
              className="text-[11px] leading-[15px] text-hypo-muted"
              style={{ fontFamily: "HypofitSansMedium" }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {onMuteToggle ? (
        <Pressable
          accessibilityLabel={isMuted ? "채팅 알림 켜기" : "채팅 알림 끄기"}
          accessibilityRole="button"
          disabled={isMuting}
          hitSlop={12}
          className="h-10 w-8 items-center justify-center"
          onPress={onMuteToggle}
        >
          <Feather color={isMuted ? "#8A9387" : "#176B5D"} name={isMuted ? "bell-off" : "bell"} size={18} />
        </Pressable>
      ) : null}
      {onMenu ? (
        <Pressable
          accessibilityLabel="채팅 설정"
          accessibilityRole="button"
          hitSlop={12}
          className="h-10 w-8 items-center justify-center"
          onPress={onMenu}
        >
          <MoreIcon />
        </Pressable>
      ) : (
        <View className="w-10" />
      )}
    </View>
  );
}

function ChatThreadMenu({
  anchorTop,
  isCanceling,
  isOpen,
  onCancelInterview,
  onClose,
  onDetail,
  onReport,
  room,
}: {
  anchorTop: number;
  isCanceling?: boolean;
  isOpen: boolean;
  onCancelInterview: () => void;
  onClose: () => void;
  onDetail: () => void;
  onReport: () => void;
  room: ChatRoom | null;
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
            <ThreadMenuButton label="인터뷰 상세정보" onPress={onDetail} />
            <ThreadMenuButton
              disabled={!canCancelInterview || isCanceling}
              helper={canCancelInterview ? undefined : "이미 종료된 인터뷰는 취소할 수 없어요."}
              label="인터뷰 취소"
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
      {helper ? <Text className="mt-0.5 text-[10px] font-bold leading-4 text-hypo-muted">{helper}</Text> : null}
    </Pressable>
  );
}

function FounderApplicationActionStrip({
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
      <FounderActionButton label="답변 보기" onPress={onOpenAnswers} />
      <FounderActionButton disabled={disabled} label="선정" tone="primary" onPress={onSelect} />
      <FounderActionButton disabled={disabled} label="반려" tone="danger" onPress={onReject} />
    </View>
  );
}

function ChatWorkflowActionStrip({
  disabled,
  onAction,
  workflow,
}: {
  disabled?: boolean;
  onAction: (action: ChatWorkflowAction) => void;
  workflow: ChatWorkflow;
}) {
  const actions = [workflow.primary_action, workflow.secondary_action, workflow.danger_action].filter(Boolean);
  const shouldRender = actions.length > 0 || workflow.description;
  if (!shouldRender) return null;

  return (
    <View className="mb-2 rounded-[14px] border border-hypo-border bg-hypo-surface px-3 py-2.5">
      <Text className="text-[13px] leading-5 text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>
        {workflow.title}
      </Text>
      {workflow.description ? (
        <Text className="mt-0.5 text-[11px] leading-4 text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>
          {workflow.description}
        </Text>
      ) : null}
      {actions.length ? (
        <View className="mt-2 flex-row items-center gap-2">
          {actions.map((item) =>
            item ? (
              <WorkflowActionButton
                key={item.action}
                disabled={disabled}
                label={item.label}
                tone={item.tone}
                onPress={() => onAction(item.action)}
              />
            ) : null,
          )}
        </View>
      ) : null}
    </View>
  );
}

function WorkflowActionButton({
  disabled,
  label,
  onPress,
  tone,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  tone: "default" | "primary" | "danger";
}) {
  const className =
    tone === "primary"
      ? "border-hypo-brand bg-hypo-brand"
      : tone === "danger"
        ? "border-[#F2C4C4] bg-hypo-dangerSoft"
        : "border-hypo-border bg-hypo-bg";
  const textClassName =
    tone === "primary" ? "text-white" : tone === "danger" ? "text-hypo-danger" : "text-hypo-text";

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`min-h-9 flex-1 items-center justify-center rounded-[11px] border px-3 ${className}`}
      style={{ opacity: disabled ? 0.45 : 1 }}
      onPress={onPress}
    >
      <Text className={`text-[12px] leading-4 ${textClassName}`} style={{ fontFamily: "HypofitSansBold" }}>
        {label}
      </Text>
    </Pressable>
  );
}

function FounderActionButton({
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
      className={`min-h-9 flex-1 items-center justify-center rounded-[12px] border px-3 ${className}`}
      style={{ opacity: disabled ? 0.45 : 1 }}
      onPress={onPress}
    >
      <Text className={`text-[12px] font-black leading-4 ${textClassName}`}>{label}</Text>
    </Pressable>
  );
}

function ReviewModal({
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (input: { comment?: string | null; rating: number; tags: string[] }) => void;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setRating(5);
      setComment("");
    }
  }, [isOpen]);

  return (
    <Modal animationType="fade" transparent visible={isOpen} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-4">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="rounded-[18px] bg-hypo-surface p-5">
          <Text className="text-[19px] text-hypo-text" style={{ fontFamily: "HypofitSansBold" }}>
            후기를 남겨주세요
          </Text>
          <Text className="mt-2 text-[13px] leading-5 text-hypo-muted" style={{ fontFamily: "HypofitSansMedium" }}>
            비방이나 욕설이 담긴 후기는 제한될 수 있고, 별점은 모집자 평판에 반영될 수 있어요.
          </Text>

          <StarRating rating={rating} onChange={setRating} />

          <TextInput
            multiline
            maxLength={500}
            placeholder="남기고 싶은 내용을 적어주세요"
            placeholderTextColor="#98A196"
            className="mt-4 min-h-[96px] rounded-xl border border-hypo-border bg-hypo-bg px-3 py-3 text-[14px] leading-5 text-hypo-text"
            style={{ fontFamily: "HypofitSansMedium" }}
            textAlignVertical="top"
            value={comment}
            onChangeText={setComment}
          />

          <View className="mt-4 flex-row justify-end gap-2">
            <Pressable accessibilityRole="button" className="min-h-[42px] justify-center rounded-[11px] bg-hypo-bg px-4" onPress={onClose}>
              <Text className="text-sm text-hypo-muted" style={{ fontFamily: "HypofitSansBold" }}>취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              className="min-h-[42px] justify-center rounded-[11px] bg-hypo-brand px-4"
              style={{ opacity: isSubmitting ? 0.45 : 1 }}
              onPress={() => onSubmit({ comment: comment.trim() || null, rating, tags: [] })}
            >
              <Text className="text-sm text-white" style={{ fontFamily: "HypofitSansBold" }}>후기 남기기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StarRating({
  onChange,
  rating,
}: {
  onChange: (rating: number) => void;
  rating: number;
}) {
  return (
    <View className="mt-4">
      <View className="flex-row items-center justify-between rounded-[14px] border border-hypo-border bg-hypo-bg px-3 py-2.5">
        {[1, 2, 3, 4, 5].map((value) => {
          const isSelected = value <= rating;
          return (
            <Pressable
              key={value}
              accessibilityLabel={`별점 ${value}점`}
              accessibilityRole="button"
              accessibilityState={{ selected: rating === value }}
              hitSlop={8}
              className="h-10 flex-1 items-center justify-center"
              onPress={() => onChange(value)}
            >
              <Text
                className={`text-[28px] leading-9 ${isSelected ? "text-hypo-brand" : "text-[#D2D8D0]"}`}
                style={{ fontFamily: "HypofitSansBold" }}
              >
                {isSelected ? "★" : "☆"}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ApplicationReviewModal({
  application,
  isOpen,
  onClose,
  respondentName,
}: {
  application: ChatRoom["application"];
  isOpen: boolean;
  onClose: () => void;
  respondentName?: string;
}) {
  if (!application) return null;

  const answers = Object.entries(application.answers);
  const availableTimes = application.available_times;

  return (
    <Modal animationType="fade" transparent visible={isOpen} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-4">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="max-h-[78%] rounded-[18px] bg-hypo-surface p-5">
          <Text className="text-[19px] font-black text-hypo-text">신청자 답변</Text>
          <Text className="mt-1.5 text-[13px] font-bold leading-5 text-hypo-muted">
            {respondentName ?? "신청자"}님이 남긴 경험과 가능한 시간이에요.
          </Text>
          <ScrollView className="mt-4" showsVerticalScrollIndicator={false}>
            {answers.length ? (
              <View className="gap-2.5">
                {answers.map(([key, value]) => (
                  <View key={key} className="rounded-[12px] bg-hypo-bg p-3">
                    <Text className="text-xs font-black text-hypo-text">{formatAnswerLabel(key)}</Text>
                    <Text className="mt-1.5 text-[13px] font-bold leading-5 text-hypo-muted">{value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="rounded-[12px] bg-hypo-bg p-3 text-[13px] font-bold leading-5 text-hypo-muted">
                아직 작성된 답변이 없어요.
              </Text>
            )}

            <View className="mt-4 rounded-[12px] bg-hypo-bg p-3">
              <Text className="text-xs font-black text-hypo-text">가능 시간</Text>
              {availableTimes.length ? (
                <View className="mt-2 gap-1.5">
                  {availableTimes.map((time) => (
                    <Text key={time} className="text-[13px] font-bold leading-5 text-hypo-muted">
                      {time}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text className="mt-1.5 text-[13px] font-bold leading-5 text-hypo-muted">가능 시간이 아직 없어요.</Text>
              )}
            </View>
          </ScrollView>
          <Pressable accessibilityRole="button" className="mt-4 min-h-[42px] items-center justify-center rounded-[12px] bg-hypo-brand" onPress={onClose}>
            <Text className="text-sm font-black text-white">확인</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function RejectApplicationModal({
  applicationId,
  isOpen,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  applicationId?: string;
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (rejectionReason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const normalizedReason = reason.trim();
  const canSubmit = Boolean(applicationId && normalizedReason.length >= 2 && !isSubmitting);

  useEffect(() => {
    if (!isOpen) {
      setReason("");
    }
  }, [isOpen]);

  return (
    <Modal animationType="fade" transparent visible={isOpen} onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-black/35 px-4">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="rounded-[18px] bg-hypo-surface p-5">
          <Text className="text-[19px] font-black text-hypo-text">반려 사유를 입력해주세요</Text>
          <Text className="mt-2 text-[13px] font-bold leading-5 text-hypo-muted">
            입력한 사유는 신청자에게 안내되고 채팅 기록에도 남아요.
          </Text>
          <TextInput
            multiline
            maxLength={500}
            placeholder="예: 이번 모집 조건과 경험이 조금 달라서 아쉽지만 다음 모집에서 다시 신청해주세요."
            placeholderTextColor="#98A196"
            className="mt-3 min-h-[120px] rounded-xl border border-hypo-border bg-hypo-bg px-3 py-2.5 text-sm font-bold leading-5 text-hypo-text"
            textAlignVertical="top"
            value={reason}
            onChangeText={setReason}
          />
          <Text className="mt-1.5 self-end text-[11px] font-bold text-hypo-muted">{normalizedReason.length}/500</Text>
          <View className="mt-3 flex-row justify-end gap-2">
            <Pressable
              accessibilityRole="button"
              className="min-h-[42px] justify-center rounded-[11px] bg-hypo-bg px-4"
              onPress={() => {
                setReason("");
                onClose();
              }}
            >
              <Text className="text-sm font-black text-hypo-muted">취소</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              className="min-h-[42px] justify-center rounded-[11px] bg-hypo-brand px-4"
              style={{ opacity: canSubmit ? 1 : 0.45 }}
              onPress={() => {
                if (!canSubmit) return;
                onSubmit(normalizedReason);
              }}
            >
              <Text className="text-sm font-black text-white">반려하기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function MessageBubble({ currentUserId, message }: { currentUserId?: string; message: ChatMessage }) {
  const isMine = Boolean(message.sender_id && message.sender_id === currentUserId);
  const isSystem = message.message_type !== "user" || !message.sender_id;

  if (isSystem) {
    return (
      <View className="items-center py-1">
        <Text
          className="rounded-full bg-hypo-surfaceMuted px-3 py-1.5 text-center text-[11px] leading-4 text-hypo-muted"
          style={{ fontFamily: "HypofitSansMedium" }}
        >
          {message.body}
        </Text>
      </View>
    );
  }

  return (
    <View className={`max-w-[80%] ${isMine ? "self-end" : "self-start"}`}>
      <Text
        className={`rounded-[18px] px-3 py-[9px] text-[15px] leading-[21px] ${isMine ? "bg-hypo-brand text-white" : "bg-hypo-surface text-hypo-text"}`}
        style={{ fontFamily: "HypofitSansMedium" }}
      >
        {message.body}
      </Text>
      <Text
        className={`mt-1 text-[10px] leading-[14px] text-hypo-muted ${isMine ? "text-right" : "text-left"}`}
        style={{ fontFamily: "HypofitSansMedium" }}
      >
        {formatMessageTime(message.created_at)}
      </Text>
    </View>
  );
}

function MessageDateSeparator({ value }: { value: string }) {
  const label = formatMessageDate(value);
  if (!label) return null;

  return (
    <View className="flex-row items-center gap-2 pb-3 pt-1">
      <View className="h-px flex-1 bg-hypo-border/70" />
      <Text
        className="text-[10px] leading-4 text-hypo-muted"
        style={{ fontFamily: "HypofitSansMedium" }}
      >
        {label}
      </Text>
      <View className="h-px flex-1 bg-hypo-border/70" />
    </View>
  );
}

function MoreIcon() {
  return (
    <View className="flex-row items-center gap-0.5">
      <View className="h-1 w-1 rounded-full bg-hypo-muted" />
      <View className="h-1 w-1 rounded-full bg-hypo-muted" />
      <View className="h-1 w-1 rounded-full bg-hypo-muted" />
    </View>
  );
}

function ChevronIcon({ direction, tone = "muted" }: { direction: "left" | "right" | "up" | "down"; tone?: "muted" | "text" }) {
  const rotation =
    direction === "left"
      ? "rotate-[225deg]"
      : direction === "right"
        ? "rotate-[45deg]"
        : direction === "up"
          ? "rotate-[-45deg]"
          : "rotate-[135deg]";
  const borderColor = tone === "text" ? "border-hypo-text" : "border-hypo-muted";

  return <View className={`h-2.5 w-2.5 border-r-2 border-t-2 ${borderColor} ${rotation}`} />;
}

function formatMessageTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function getMessageDateKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatMessageDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / 86_400_000);

  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "어제";

  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === now.getFullYear()
      ? { month: "long", day: "numeric", weekday: "long" }
      : { year: "numeric", month: "long", day: "numeric", weekday: "long" };

  return new Intl.DateTimeFormat("ko-KR", options).format(date);
}

function getComposerState(room: ChatRoom | null): { disabled: boolean; placeholder: string } {
  if (!room) return { disabled: true, placeholder: "대화를 불러오는 중입니다" };
  if (room.status === "blocked") return { disabled: true, placeholder: "차단된 상대와는 대화할 수 없어요" };
  if (room.status === "closed") return { disabled: true, placeholder: "종료된 인터뷰예요" };

  const applicationStatus = room.application?.status;
  if (applicationStatus === "rejected" || applicationStatus === "canceled") {
    return { disabled: true, placeholder: "종료된 인터뷰예요" };
  }
  if (applicationStatus === "no_show") {
    return { disabled: true, placeholder: "종료된 인터뷰예요" };
  }

  return { disabled: false, placeholder: "메시지를 입력하세요" };
}

function resolveChatPollingInterval(failureCount: number) {
  if (failureCount >= 3) return 30_000;
  if (failureCount >= 1) return 10_000;
  return 3_000;
}
