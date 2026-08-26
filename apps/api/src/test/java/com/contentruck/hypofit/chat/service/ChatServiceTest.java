package com.contentruck.hypofit.chat.service;


import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.contentruck.hypofit.notification.service.NotificationWriteService;
import com.contentruck.hypofit.chat.entity.ChatMessageEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomParticipantSettingEntity;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatRepository chatRepository;

    @Mock
    private ChatMessageRepository chatMessageRepository;

    @Mock
    private ChatWorkflowQueryRepository workflowQueryRepository;

    @Mock
    private NotificationWriteService notificationWriteService;

    private ChatService chatService;

    @BeforeEach
    void setUp() {
        chatService = new ChatService(
                chatRepository,
                chatMessageRepository,
                workflowQueryRepository,
                notificationWriteService
        );
    }

    @Test
    void listRoomsSortsUnreadFirstAndMasksHiddenLastMessage() {
        UUID userId = UUID.randomUUID();
        OffsetDateTime older = OffsetDateTime.of(2026, 7, 1, 10, 0, 0, 0, ZoneOffset.UTC);
        OffsetDateTime newer = OffsetDateTime.of(2026, 7, 1, 12, 0, 0, 0, ZoneOffset.UTC);
        ChatRoomReadModel readRoom = room(UUID.randomUUID(), userId, 0, newer, null);
        ChatRoomReadModel unreadRoom = room(
                UUID.randomUUID(),
                userId,
                2,
                older,
                new ChatMessageReadModel(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        null,
                        "system",
                        "숨겨진 원문",
                        null,
                        Map.of(),
                        newer,
                        "reported",
                        newer
                )
        );

        when(chatRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(user(userId, "founder")));
        when(chatRepository.findRoomsForUser(userId)).thenReturn(List.of(readRoom, unreadRoom));

        List<ChatRoomReadModel> rooms = chatService.listRooms(userId);

        assertThat(rooms).extracting(ChatRoomReadModel::id).containsExactly(unreadRoom.id(), readRoom.id());
        assertThat(rooms.getFirst().lastMessage().body()).isEqualTo("관리자에 의해 숨김 처리된 메시지예요.");
    }

    @Test
    void sendMessageSkipsNotificationWhenRecipientMuted() {
        UUID userId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        ChatRoomEntity room = roomEntity(roomId, userId, UUID.randomUUID(), "open");
        ChatMessageEntity created = messageEntity(roomId, userId, "내일 가능하세요?");
        ChatRoomReadModel senderView = room(roomId, userId, 0, created.getCreatedAt(), null);
        ChatRoomReadModel recipientView = room(roomId, room.getRespondentId(), 0, created.getCreatedAt(), null, true);

        when(chatRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(user(userId, "founder")));
        when(chatRepository.findRoomEntity(roomId)).thenReturn(Optional.of(room));
        when(chatRepository.hasActiveBlockBetween(userId, room.getRespondentId())).thenReturn(false);
        when(workflowQueryRepository.findApplicationMessageability(room.getApplicationId()))
                .thenReturn(Optional.of(new ChatWorkflowQueryRepository.ApplicationMessageabilityRecord(room.getApplicationId(), "applied")));
        when(workflowQueryRepository.findLatestVisibleSessionStatus(room.getApplicationId())).thenReturn(Optional.empty());
        when(chatMessageRepository.createUserMessage(room, userId, "내일 가능하세요?", null))
                .thenReturn(new ChatMessageRepository.CreateUserMessageResult(created, true));
        when(chatRepository.findRoom(roomId, userId)).thenReturn(Optional.of(senderView));
        when(chatRepository.findRoom(roomId, room.getRespondentId())).thenReturn(Optional.of(recipientView));

        ChatMessageReadModel response = chatService.sendMessage(userId, roomId, "  내일 가능하세요?  ", null);

        assertThat(response.body()).isEqualTo("내일 가능하세요?");
        verify(notificationWriteService, never()).createNotification(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void sendMessageCreatesNotificationWhenRecipientIsNotMuted() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        ChatRoomEntity room = roomEntity(roomId, founderId, respondentId, "open");
        ChatMessageEntity created = messageEntity(roomId, founderId, "일정 조율 가능해요");
        ChatRoomReadModel senderView = room(roomId, founderId, 0, created.getCreatedAt(), null);
        ChatRoomReadModel recipientView = room(roomId, respondentId, 1, created.getCreatedAt(), null, false);

        when(chatRepository.findCurrentUserAccount(founderId)).thenReturn(Optional.of(user(founderId, "founder")));
        when(chatRepository.findRoomEntity(roomId)).thenReturn(Optional.of(room));
        when(chatRepository.hasActiveBlockBetween(founderId, respondentId)).thenReturn(false);
        when(workflowQueryRepository.findApplicationMessageability(room.getApplicationId()))
                .thenReturn(Optional.of(new ChatWorkflowQueryRepository.ApplicationMessageabilityRecord(room.getApplicationId(), "selected")));
        when(workflowQueryRepository.findLatestVisibleSessionStatus(room.getApplicationId())).thenReturn(Optional.empty());
        when(chatMessageRepository.createUserMessage(room, founderId, "일정 조율 가능해요", null))
                .thenReturn(new ChatMessageRepository.CreateUserMessageResult(created, true));
        when(chatRepository.findRoom(roomId, founderId)).thenReturn(Optional.of(senderView));
        when(chatRepository.findRoom(roomId, respondentId)).thenReturn(Optional.of(recipientView));

        chatService.sendMessage(founderId, roomId, "일정 조율 가능해요", null);

        verify(notificationWriteService).createNotification(
                eq(respondentId),
                eq("chat_message"),
                eq("새 메시지가 도착했어요"),
                eq("일정 조율 가능해요"),
                eq("chat_room"),
                eq(roomId),
                any()
        );
    }

    @Test
    void sendMessageRejectsClosedApplicationState() {
        UUID userId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        ChatRoomEntity room = roomEntity(roomId, userId, UUID.randomUUID(), "open");

        when(chatRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(user(userId, "founder")));
        when(chatRepository.findRoomEntity(roomId)).thenReturn(Optional.of(room));
        when(chatRepository.hasActiveBlockBetween(userId, room.getRespondentId())).thenReturn(false);
        when(workflowQueryRepository.findApplicationMessageability(room.getApplicationId()))
                .thenReturn(Optional.of(new ChatWorkflowQueryRepository.ApplicationMessageabilityRecord(room.getApplicationId(), "rejected")));

        assertThatThrownBy(() -> chatService.sendMessage(userId, roomId, "확인했습니다.", null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(error -> assertThat(((ResponseStatusException) error).getStatusCode().value()).isEqualTo(409));
    }

    @Test
    void sendMessageReturnsExistingMessageForSameClientMessageId() {
        UUID userId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        ChatRoomEntity room = roomEntity(roomId, userId, UUID.randomUUID(), "open");
        ChatMessageEntity existing = messageEntity(roomId, userId, "이미 보낸 메시지");

        when(chatRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(user(userId, "founder")));
        when(chatRepository.findRoomEntity(roomId)).thenReturn(Optional.of(room));
        when(chatRepository.hasActiveBlockBetween(userId, room.getRespondentId())).thenReturn(false);
        when(workflowQueryRepository.findApplicationMessageability(room.getApplicationId()))
                .thenReturn(Optional.of(new ChatWorkflowQueryRepository.ApplicationMessageabilityRecord(room.getApplicationId(), "applied")));
        when(workflowQueryRepository.findLatestVisibleSessionStatus(room.getApplicationId())).thenReturn(Optional.empty());
        when(chatMessageRepository.findMessageByClientMessageId(roomId, userId, "client-1")).thenReturn(Optional.of(existing));

        ChatMessageReadModel response = chatService.sendMessage(userId, roomId, "이미 보낸 메시지", "client-1");

        assertThat(response.id()).isEqualTo(existing.getId());
        verify(chatMessageRepository, never()).createUserMessage(any(), any(), any(), any());
    }

    @Test
    void sendMessageSkipsDuplicateNotificationWhenAtomicInsertReusesMessage() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        ChatRoomEntity room = roomEntity(roomId, founderId, respondentId, "open");
        ChatMessageEntity existing = messageEntity(roomId, founderId, "이미 보낸 메시지");

        when(chatRepository.findCurrentUserAccount(founderId)).thenReturn(Optional.of(user(founderId, "founder")));
        when(chatRepository.findRoomEntity(roomId)).thenReturn(Optional.of(room));
        when(chatRepository.hasActiveBlockBetween(founderId, respondentId)).thenReturn(false);
        when(workflowQueryRepository.findApplicationMessageability(room.getApplicationId()))
                .thenReturn(Optional.of(new ChatWorkflowQueryRepository.ApplicationMessageabilityRecord(
                        room.getApplicationId(),
                        "applied"
                )));
        when(workflowQueryRepository.findLatestVisibleSessionStatus(room.getApplicationId())).thenReturn(Optional.empty());
        when(chatMessageRepository.findMessageByClientMessageId(roomId, founderId, "client-race"))
                .thenReturn(Optional.empty());
        when(chatMessageRepository.createUserMessage(room, founderId, "이미 보낸 메시지", "client-race"))
                .thenReturn(new ChatMessageRepository.CreateUserMessageResult(existing, false));

        ChatMessageReadModel response = chatService.sendMessage(
                founderId,
                roomId,
                "이미 보낸 메시지",
                "client-race"
        );

        assertThat(response.id()).isEqualTo(existing.getId());
        verify(notificationWriteService, never()).createNotification(any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void listMessagesFiltersAudienceForCurrentUser() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        ChatRoomEntity room = roomEntity(roomId, founderId, respondentId, "open");
        ChatMessageReadModel founderOnly = new ChatMessageReadModel(
                UUID.randomUUID(),
                roomId,
                null,
                "application_created",
                "창업자용 안내",
                null,
                Map.of("audience", "founder"),
                null,
                null,
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        ChatMessageReadModel respondentOnly = new ChatMessageReadModel(
                UUID.randomUUID(),
                roomId,
                null,
                "application_created",
                "참여자용 안내",
                null,
                Map.of("audience", "respondent"),
                null,
                null,
                OffsetDateTime.now(ZoneOffset.UTC)
        );

        when(chatRepository.findCurrentUserAccount(founderId)).thenReturn(Optional.of(user(founderId, "founder")));
        when(chatRepository.findRoomEntity(roomId)).thenReturn(Optional.of(room));
        when(chatMessageRepository.findMessages(roomId, 50, null, null)).thenReturn(List.of(founderOnly, respondentOnly));

        List<ChatMessageReadModel> messages = chatService.listMessages(founderId, roomId, 50, null, null);

        assertThat(messages).extracting(ChatMessageReadModel::body).containsExactly("창업자용 안내");
    }

    @Test
    void markRoomReadUsesVisibleMessageCreatedAt() {
        UUID userId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        ChatRoomEntity room = roomEntity(roomId, userId, UUID.randomUUID(), "open");
        ChatMessageEntity message = messageEntity(roomId, room.getRespondentId(), "확인 부탁드려요");
        setId(message, messageId);
        ChatRoomParticipantSettingEntity setting = setting(roomId, userId, message.getCreatedAt());

        when(chatRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(user(userId, "founder")));
        when(chatRepository.findRoomEntity(roomId)).thenReturn(Optional.of(room));
        when(chatMessageRepository.findMessage(roomId, messageId)).thenReturn(Optional.of(message));
        when(chatMessageRepository.markRoomRead(roomId, userId, message.getCreatedAt())).thenReturn(setting);

        var response = chatService.markRoomRead(userId, roomId, messageId);

        assertThat(response.lastReadAt()).isEqualTo(message.getCreatedAt());
    }

    @Test
    void listRoomsRejectsDeletedAccount() {
        UUID userId = UUID.randomUUID();
        ChatRepository.CurrentUserAccountRecord deletedUser = deletedUser(
                userId,
                "founder",
                OffsetDateTime.now(ZoneOffset.UTC)
        );
        when(chatRepository.findCurrentUserAccount(userId)).thenReturn(Optional.of(deletedUser));

        assertThatThrownBy(() -> chatService.listRooms(userId))
                .isInstanceOf(ChatAccountDeletedException.class);
    }

    @Test
    void getRoomWorkflowReturnsApplicationReviewForFounderOnAppliedState() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        ChatRoomEntity room = roomEntity(roomId, founderId, respondentId, "open");
        ChatWorkflowModels.ApplicationReadModel application = application(room.getInterviewPostId(), respondentId, "applied");

        when(chatRepository.findCurrentUserAccount(founderId)).thenReturn(Optional.of(user(founderId, "founder")));
        when(chatRepository.findRoomEntity(roomId)).thenReturn(Optional.of(room));
        when(workflowQueryRepository.findRoomWorkflowContext(roomId)).thenReturn(Optional.of(
                new ChatWorkflowQueryRepository.ChatRoomWorkflowContextRecord(room.getInterviewPostId(), application, null)
        ));

        ChatWorkflowReadModel workflow = chatService.getRoomWorkflow(founderId, roomId);

        assertThat(workflow.step()).isEqualTo("application_review");
        assertThat(workflow.primaryAction().action()).isEqualTo("open_application_answers");
        assertThat(workflow.secondaryAction().action()).isEqualTo("select_application");
        assertThat(workflow.dangerAction().action()).isEqualTo("reject_application");
    }

    @Test
    void getRoomWorkflowReturnsAttendanceCounterpartPendingWhenOnlyCurrentUserConfirmed() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        ChatRoomEntity room = roomEntity(roomId, founderId, respondentId, "open");
        ChatWorkflowModels.ApplicationReadModel application = application(room.getInterviewPostId(), respondentId, "selected");
        ChatWorkflowModels.InterviewSessionReadModel session = session(application, "scheduled");
        ChatWorkflowModels.AttendanceRecordReadModel attendance = new ChatWorkflowModels.AttendanceRecordReadModel(
                session.id(),
                true,
                false,
                OffsetDateTime.now(ZoneOffset.UTC),
                null,
                null,
                null
        );

        when(chatRepository.findCurrentUserAccount(founderId)).thenReturn(Optional.of(user(founderId, "founder")));
        when(chatRepository.findRoomEntity(roomId)).thenReturn(Optional.of(room));
        when(workflowQueryRepository.findRoomWorkflowContext(roomId)).thenReturn(Optional.of(
                new ChatWorkflowQueryRepository.ChatRoomWorkflowContextRecord(room.getInterviewPostId(), application, session)
        ));
        when(workflowQueryRepository.findAttendanceRecord(session.id())).thenReturn(Optional.of(attendance));
        when(workflowQueryRepository.findRewardConfirmation(session.id())).thenReturn(Optional.empty());
        when(workflowQueryRepository.findReviews(session.id())).thenReturn(List.of());

        ChatWorkflowReadModel workflow = chatService.getRoomWorkflow(founderId, roomId);

        assertThat(workflow.step()).isEqualTo("attendance_counterpart_pending");
        assertThat(workflow.dangerAction().action()).isEqualTo("open_support_report");
        assertThat(workflow.attendance()).isEqualTo(attendance);
    }

    @Test
    void getRoomWorkflowReturnsRewardConfirmationNeededForRespondent() {
        UUID founderId = UUID.randomUUID();
        UUID respondentId = UUID.randomUUID();
        UUID roomId = UUID.randomUUID();
        ChatRoomEntity room = roomEntity(roomId, founderId, respondentId, "open");
        ChatWorkflowModels.ApplicationReadModel application = application(room.getInterviewPostId(), respondentId, "selected");
        ChatWorkflowModels.InterviewSessionReadModel session = session(application, "completed");
        ChatWorkflowModels.AttendanceRecordReadModel attendance = new ChatWorkflowModels.AttendanceRecordReadModel(
                session.id(),
                true,
                true,
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(1),
                OffsetDateTime.now(ZoneOffset.UTC),
                OffsetDateTime.now(ZoneOffset.UTC),
                null
        );
        ChatWorkflowModels.RewardConfirmationReadModel reward = new ChatWorkflowModels.RewardConfirmationReadModel(
                UUID.randomUUID(),
                session.id(),
                application.id(),
                founderId,
                respondentId,
                15000,
                "founder_marked_paid",
                OffsetDateTime.now(ZoneOffset.UTC),
                null,
                null,
                null,
                OffsetDateTime.now(ZoneOffset.UTC),
                OffsetDateTime.now(ZoneOffset.UTC)
        );

        when(chatRepository.findCurrentUserAccount(respondentId)).thenReturn(Optional.of(user(respondentId, "respondent")));
        when(chatRepository.findRoomEntity(roomId)).thenReturn(Optional.of(room));
        when(workflowQueryRepository.findRoomWorkflowContext(roomId)).thenReturn(Optional.of(
                new ChatWorkflowQueryRepository.ChatRoomWorkflowContextRecord(room.getInterviewPostId(), application, session)
        ));
        when(workflowQueryRepository.findAttendanceRecord(session.id())).thenReturn(Optional.of(attendance));
        when(workflowQueryRepository.findRewardConfirmation(session.id())).thenReturn(Optional.of(reward));
        when(workflowQueryRepository.findReviews(session.id())).thenReturn(List.of());

        ChatWorkflowReadModel workflow = chatService.getRoomWorkflow(respondentId, roomId);

        assertThat(workflow.step()).isEqualTo("reward_confirmation_needed");
        assertThat(workflow.primaryAction().action()).isEqualTo("confirm_reward_received");
        assertThat(workflow.dangerAction().action()).isEqualTo("dispute_reward");
        assertThat(workflow.reward()).isEqualTo(reward);
    }

    private static ChatRoomReadModel room(
            UUID roomId,
            UUID currentUserId,
            int unreadCount,
            OffsetDateTime activityAt,
            ChatMessageReadModel lastMessage
    ) {
        return room(roomId, currentUserId, unreadCount, activityAt, lastMessage, false);
    }

    private static ChatRoomReadModel room(
            UUID roomId,
            UUID currentUserId,
            int unreadCount,
            OffsetDateTime activityAt,
            ChatMessageReadModel lastMessage,
            boolean muted
    ) {
        UUID respondentId = UUID.randomUUID();
        return new ChatRoomReadModel(
                roomId,
                UUID.randomUUID(),
                UUID.randomUUID(),
                currentUserId,
                respondentId,
                "open",
                activityAt,
                activityAt,
                activityAt,
                new ChatApplicationSummary(
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        Map.of(),
                        List.of(),
                        respondentId,
                        "applied",
                        null,
                        new ChatUserSummary(respondentId, "참여자", null, "respondent", null)
                ),
                new ChatInterviewPostSummary(
                        UUID.randomUUID(),
                        currentUserId,
                        "인터뷰 모집",
                        "서비스 설명",
                        "대상 설명",
                        15000,
                        30,
                        0,
                        "online",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of(),
                        "open",
                        null,
                        null,
                        null
                ),
                new ChatUserSummary(currentUserId, "창업자", null, "founder", null),
                new ChatUserSummary(respondentId, "참여자", null, "respondent", null),
                lastMessage,
                unreadCount,
                muted,
                false,
                null
        );
    }

    private static ChatRoomEntity roomEntity(UUID roomId, UUID founderId, UUID respondentId, String status) {
        ChatRoomEntity entity = new ChatRoomEntity();
        setField(entity, "id", roomId);
        setField(entity, "interviewPostId", UUID.randomUUID());
        UUID applicationId = UUID.randomUUID();
        setField(entity, "applicationId", applicationId);
        setField(entity, "founderId", founderId);
        setField(entity, "respondentId", respondentId);
        setField(entity, "status", status);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        setField(entity, "createdAt", now);
        setField(entity, "updatedAt", now);
        return entity;
    }

    private static ChatMessageEntity messageEntity(UUID roomId, UUID senderId, String body) {
        ChatMessageEntity entity = new ChatMessageEntity();
        entity.setId(UUID.randomUUID());
        entity.setRoomId(roomId);
        entity.setSenderId(senderId);
        entity.setMessageType("user");
        entity.setBody(body);
        entity.setMetadata(Map.of());
        entity.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return entity;
    }

    private static ChatRoomParticipantSettingEntity setting(UUID roomId, UUID userId, OffsetDateTime lastReadAt) {
        ChatRoomParticipantSettingEntity entity = new ChatRoomParticipantSettingEntity();
        entity.setId(UUID.randomUUID());
        entity.setRoomId(roomId);
        entity.setUserId(userId);
        entity.setMuted(false);
        entity.setHidden(false);
        entity.setLastReadAt(lastReadAt);
        entity.setCreatedAt(lastReadAt);
        entity.setUpdatedAt(lastReadAt);
        return entity;
    }

    private static ChatRepository.CurrentUserAccountRecord user(UUID userId, String role) {
        return new ChatRepository.CurrentUserAccountRecord(userId, role, null, null);
    }

    private static ChatRepository.CurrentUserAccountRecord deletedUser(
            UUID userId,
            String role,
            OffsetDateTime deletedAt
    ) {
        return new ChatRepository.CurrentUserAccountRecord(
                userId,
                role,
                null,
                deletedAt
        );
    }

    private static void setId(ChatMessageEntity entity, UUID id) {
        entity.setId(id);
    }

    private static void setField(Object target, String fieldName, Object value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static ChatWorkflowModels.ApplicationReadModel application(
            UUID interviewPostId,
            UUID respondentId,
            String status
    ) {
        return new ChatWorkflowModels.ApplicationReadModel(
                UUID.randomUUID(),
                interviewPostId,
                Map.of("experience", "관련 경험이 있어요"),
                List.of("평일 저녁"),
                respondentId,
                status,
                null,
                new ChatWorkflowModels.UserSummary(
                        respondentId,
                        "참여자",
                        null,
                        "respondent",
                        null
                )
        );
    }

    private static ChatWorkflowModels.InterviewSessionReadModel session(
            ChatWorkflowModels.ApplicationReadModel application,
            String status
    ) {
        return new ChatWorkflowModels.InterviewSessionReadModel(
                UUID.randomUUID(),
                application.id(),
                OffsetDateTime.now(ZoneOffset.UTC).plusDays(1),
                "online",
                "https://meet.example.com/room",
                null,
                status,
                application
        );
    }
}
