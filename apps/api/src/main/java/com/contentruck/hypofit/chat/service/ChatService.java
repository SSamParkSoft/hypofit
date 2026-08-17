package com.contentruck.hypofit.chat.service;


import com.contentruck.hypofit.chat.entity.ChatMessageEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomParticipantSettingEntity;
import com.contentruck.hypofit.notification.service.NotificationWriteService;
import com.contentruck.hypofit.session.service.SessionReadModels;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ChatService {

    private static final String HIDDEN_MESSAGE_BODY = "관리자에 의해 숨김 처리된 메시지예요.";
    private static final String NOT_FOUND_DETAIL = "Chat room not found";
    private static final String FORBIDDEN_DETAIL = "Forbidden";
    private static final String BLOCKED_DETAIL = "Blocked users cannot interact";
    private static final String READ_MARKER_NOT_FOUND_DETAIL = "Read marker message not found";
    private static final String ROOM_CLOSED_DETAIL = "Chat room is closed";
    private static final String APPLICATION_NOT_MESSAGEABLE_DETAIL = "Application is not messageable";
    private static final String SESSION_FINALIZED_DETAIL = "Interview session is finalized";

    private final ChatRepository chatRepository;
    private final NotificationWriteService notificationWriteService;

    public ChatService(
            ChatRepository chatRepository,
            NotificationWriteService notificationWriteService
    ) {
        this.chatRepository = chatRepository;
        this.notificationWriteService = notificationWriteService;
    }

    @Transactional(readOnly = true)
    public List<ChatRoomReadModel> listRooms(UUID currentUserId) {
        ChatRepository.CurrentUserAccountRecord currentUser = requireCurrentUser(currentUserId);
        return chatRepository.findRoomsForUser(currentUserId, currentUser.role())
                .stream()
                .map(this::maskHiddenLastMessage)
                .sorted(Comparator
                        .comparingInt((ChatRoomReadModel room) -> room.unreadCount() > 0 ? 0 : 1)
                        .thenComparing(ChatService::activityAt, Comparator.reverseOrder())
                        .thenComparing(ChatRoomReadModel::createdAt, Comparator.reverseOrder()))
                .toList();
    }

    @Transactional(readOnly = true)
    public ChatRoomReadModel getRoom(UUID currentUserId, UUID roomId) {
        requireCurrentUser(currentUserId);
        ChatRoomReadModel room = chatRepository.findRoom(roomId, currentUserId)
                .orElseThrow(() -> notFound(NOT_FOUND_DETAIL));
        ensureRoomAccess(room.founderId(), room.respondentId(), currentUserId);
        return maskHiddenLastMessage(room);
    }

    @Transactional(readOnly = true)
    public ChatWorkflowReadModel getRoomWorkflow(UUID currentUserId, UUID roomId) {
        requireCurrentUser(currentUserId);
        ChatRoomEntity room = chatRepository.findRoomEntity(roomId)
                .orElseThrow(() -> notFound(NOT_FOUND_DETAIL));
        ensureRoomAccess(room.getFounderId(), room.getRespondentId(), currentUserId);

        ChatRepository.ChatRoomWorkflowContextRecord context = chatRepository.findRoomWorkflowContext(roomId)
                .orElseThrow(() -> notFound(NOT_FOUND_DETAIL));
        if (context.application() == null || context.interviewPostId() == null) {
            return closedWorkflow("진행 상태를 확인할 수 없어요");
        }

        String actorRole = Objects.equals(room.getFounderId(), currentUserId) ? "founder" : "respondent";
        String applicationStatus = context.application().status();
        SessionReadModels.InterviewSessionReadModel latestSession = context.latestSession();

        if ("applied".equals(applicationStatus) && "founder".equals(actorRole)) {
            return new ChatWorkflowReadModel(
                    "application_review",
                    "신청자 답변을 확인해 주세요",
                    null,
                    action("open_application_answers", "답변 보기"),
                    action("select_application", "선정", "primary"),
                    action("reject_application", "반려", "danger"),
                    null,
                    null,
                    null,
                    null,
                    false
            );
        }
        if (Set.of("rejected", "canceled").contains(applicationStatus)) {
            return closedWorkflow("종료된 인터뷰예요");
        }
        if ("no_show".equals(applicationStatus)) {
            return problemWorkflow(
                    "노쇼 상태가 기록됐어요",
                    null,
                    null,
                    null,
                    null,
                    null,
                    false
            );
        }

        if (latestSession == null) {
            if ("selected".equals(applicationStatus) && "founder".equals(actorRole)) {
                return new ChatWorkflowReadModel(
                        "schedule_needed",
                        "인터뷰 일정을 확정해 주세요",
                        null,
                        action("create_schedule", "일정 확정", "primary"),
                        null,
                        action("open_support_report", "문제 신고", "danger"),
                        null,
                        null,
                        null,
                        null,
                        false
                );
            }
            if ("selected".equals(applicationStatus)) {
                return new ChatWorkflowReadModel(
                        "selected",
                        "선정됐어요",
                        "채팅에서 일정과 진행 방식을 조율해 주세요.",
                        null,
                        null,
                        action("open_support_report", "문제 신고", "danger"),
                        null,
                        null,
                        null,
                        null,
                        false
                );
            }
            return closedWorkflow("진행 중인 인터뷰가 없어요");
        }

        SessionReadModels.AttendanceRecordReadModel attendance = chatRepository.findAttendanceRecord(latestSession.id())
                .orElse(null);
        SessionReadModels.RewardConfirmationReadModel reward = chatRepository.findRewardConfirmation(latestSession.id())
                .orElse(null);
        List<SessionReadModels.InterviewReviewReadModel> reviews = chatRepository.findReviews(latestSession.id());
        SessionReadModels.InterviewReviewReadModel myReview = reviews.stream()
                .filter(review -> Objects.equals(review.reviewerId(), currentUserId))
                .findFirst()
                .orElse(null);
        boolean counterpartReviewSubmitted = reviews.stream()
                .anyMatch(review -> !Objects.equals(review.reviewerId(), currentUserId));

        if ("no_show".equals(latestSession.status())) {
            return problemWorkflow(
                    "노쇼 상태가 기록됐어요",
                    null,
                    latestSession,
                    attendance,
                    null,
                    null,
                    false
            );
        }
        if ("canceled".equals(latestSession.status())) {
            return new ChatWorkflowReadModel(
                    "closed",
                    "취소된 인터뷰예요",
                    null,
                    null,
                    null,
                    null,
                    latestSession,
                    null,
                    null,
                    null,
                    false
            );
        }

        if ("scheduled".equals(latestSession.status())) {
            boolean myConfirmed = "founder".equals(actorRole)
                    ? attendance != null && attendance.founderConfirmed()
                    : attendance != null && attendance.respondentConfirmed();
            boolean counterpartConfirmed = "founder".equals(actorRole)
                    ? attendance != null && attendance.respondentConfirmed()
                    : attendance != null && attendance.founderConfirmed();

            if (myConfirmed && !counterpartConfirmed) {
                return new ChatWorkflowReadModel(
                        "attendance_counterpart_pending",
                        "상대 확인을 기다리고 있어요",
                        "상대가 만남을 확인하면 인터뷰가 완료돼요.",
                        null,
                        null,
                        action("open_support_report", "문제 신고", "danger"),
                        latestSession,
                        attendance,
                        null,
                        null,
                        false
                );
            }
            return new ChatWorkflowReadModel(
                    "attendance_confirmation_needed",
                    "인터뷰가 끝났나요?",
                    "만남을 확인하면 상대에게도 확인 요청이 보내져요.",
                    action("confirm_attendance", "만남 확인", "primary"),
                    null,
                    action("mark_no_show", "문제 신고", "danger"),
                    latestSession,
                    attendance,
                    null,
                    null,
                    false
            );
        }

        if ("completed".equals(latestSession.status())) {
            if (reward == null || "pending".equals(reward.status())) {
                if ("founder".equals(actorRole)) {
                    return new ChatWorkflowReadModel(
                            "reward_payment_needed",
                            "사례비를 지급했나요?",
                            "지급 완료로 표시하면 상대에게 확인 요청이 가요.",
                            action("mark_reward_paid", "지급 완료로 표시", "primary"),
                            null,
                            null,
                            latestSession,
                            attendance,
                            reward,
                            null,
                            false
                    );
                }
                return new ChatWorkflowReadModel(
                        "completed",
                        "인터뷰가 완료됐어요",
                        "창업자의 사례비 지급 확인을 기다리고 있어요.",
                        null,
                        null,
                        null,
                        latestSession,
                        attendance,
                        reward,
                        null,
                        false
                );
            }
            if ("founder_marked_paid".equals(reward.status())) {
                if ("respondent".equals(actorRole)) {
                    return new ChatWorkflowReadModel(
                            "reward_confirmation_needed",
                            "사례비를 받았나요?",
                            "수령 여부를 확인해 주세요.",
                            action("confirm_reward_received", "받았어요", "primary"),
                            null,
                            action("dispute_reward", "문제 신고", "danger"),
                            latestSession,
                            attendance,
                            reward,
                            null,
                            false
                    );
                }
                return new ChatWorkflowReadModel(
                        "completed",
                        "상대 확인을 기다리고 있어요",
                        "응답자가 사례비 수령을 확인하면 후기를 남길 수 있어요.",
                        null,
                        null,
                        null,
                        latestSession,
                        attendance,
                        reward,
                        null,
                        false
                );
            }
            if ("disputed".equals(reward.status())) {
                return problemWorkflowWithDangerAction(
                        "사례비 확인 문제가 접수됐어요",
                        "채팅에서 상황을 확인하고 필요하면 신고를 이어가 주세요.",
                        latestSession,
                        attendance,
                        reward,
                        action("open_support_report", "신고하기", "danger"),
                        false
                );
            }
            if (myReview == null) {
                return new ChatWorkflowReadModel(
                        "review_needed",
                        "후기를 남겨주세요",
                        "후기는 당분간 내부 신뢰 기록으로만 사용돼요.",
                        action("write_review", "후기 작성", "primary"),
                        null,
                        null,
                        latestSession,
                        attendance,
                        reward,
                        null,
                        counterpartReviewSubmitted
                );
            }
            return new ChatWorkflowReadModel(
                    "reward_confirmed",
                    "인터뷰가 마무리됐어요",
                    null,
                    null,
                    null,
                    null,
                    latestSession,
                    attendance,
                    reward,
                    myReview,
                    counterpartReviewSubmitted
            );
        }

        return closedWorkflow("진행 상태를 확인할 수 없어요");
    }

    @Transactional(readOnly = true)
    public List<ChatMessageReadModel> listMessages(
            UUID currentUserId,
            UUID roomId,
            int limit,
            OffsetDateTime before,
            UUID beforeId
    ) {
        requireCurrentUser(currentUserId);
        ChatRoomEntity room = chatRepository.findRoomEntity(roomId)
                .orElseThrow(() -> notFound(NOT_FOUND_DETAIL));
        ensureRoomAccess(room.getFounderId(), room.getRespondentId(), currentUserId);
        return chatRepository.findMessages(roomId, limit, before, beforeId)
                .stream()
                .filter(message -> isVisibleToUser(message, room, currentUserId))
                .map(this::maskHiddenMessage)
                .toList();
    }

    @Transactional
    public ChatMessageReadModel sendMessage(
            UUID currentUserId,
            UUID roomId,
            String body,
            String clientMessageId
    ) {
        requireCurrentUser(currentUserId);
        ChatRoomEntity room = chatRepository.findRoomEntity(roomId)
                .orElseThrow(() -> notFound(NOT_FOUND_DETAIL));
        ensureRoomAccess(room.getFounderId(), room.getRespondentId(), currentUserId);

        UUID recipientId = Objects.equals(currentUserId, room.getFounderId())
                ? room.getRespondentId()
                : room.getFounderId();

        if (chatRepository.hasActiveBlockBetween(currentUserId, recipientId)) {
            throw forbidden(BLOCKED_DETAIL);
        }

        ensureRoomMessageable(room);

        String normalizedBody = body == null ? null : body.trim();
        if (clientMessageId != null && !clientMessageId.isBlank()) {
            Optional<ChatMessageEntity> existing = chatRepository.findMessageByClientMessageId(
                    roomId,
                    currentUserId,
                    clientMessageId
            );
            if (existing.isPresent()) {
                return toReadModel(existing.get());
            }
        }

        ChatRepository.CreateUserMessageResult creation = chatRepository.createUserMessage(
                room,
                currentUserId,
                normalizedBody,
                clientMessageId
        );
        ChatMessageEntity message = creation.message();
        if (!creation.created()) {
            return toReadModel(message);
        }

        ChatRoomReadModel senderView = chatRepository.findRoom(roomId, currentUserId)
                .orElseThrow(() -> notFound(NOT_FOUND_DETAIL));
        ChatRoomReadModel recipientView = chatRepository.findRoom(roomId, recipientId).orElse(null);
        if (recipientView == null || !recipientView.isMuted()) {
            Map<String, Object> metadata = new java.util.LinkedHashMap<>();
            metadata.put("chat_room_id", room.getId().toString());
            if (room.getInterviewPostId() != null) {
                metadata.put("interview_post_id", room.getInterviewPostId().toString());
            }
            if (senderView.interviewPost() != null && senderView.interviewPost().title() != null) {
                metadata.put("interview_title", senderView.interviewPost().title());
            }
            String senderName = senderName(senderView, currentUserId);
            if (senderName != null) {
                metadata.put("sender_name", senderName);
            }
            notificationWriteService.createNotification(
                    recipientId,
                    "chat_message",
                    "새 메시지가 도착했어요",
                    normalizedBody == null ? null : normalizedBody.substring(0, Math.min(normalizedBody.length(), 120)),
                    "chat_room",
                    room.getId(),
                    metadata
            );
        }

        return toReadModel(message);
    }

    @Transactional
    public ChatRoomSettingsModel updateRoomSettings(
            UUID currentUserId,
            UUID roomId,
            Boolean isMuted,
            Boolean isHidden
    ) {
        requireCurrentUser(currentUserId);
        ChatRoomEntity room = chatRepository.findRoomEntity(roomId)
                .orElseThrow(() -> notFound(NOT_FOUND_DETAIL));
        ensureRoomAccess(room.getFounderId(), room.getRespondentId(), currentUserId);
        ChatRoomParticipantSettingEntity setting = chatRepository.updateRoomSettings(roomId, currentUserId, isMuted, isHidden);
        return toSettingsModel(setting);
    }

    @Transactional
    public ChatRoomSettingsModel markRoomRead(
            UUID currentUserId,
            UUID roomId,
            UUID lastReadMessageId
    ) {
        requireCurrentUser(currentUserId);
        ChatRoomEntity room = chatRepository.findRoomEntity(roomId)
                .orElseThrow(() -> notFound(NOT_FOUND_DETAIL));
        ensureRoomAccess(room.getFounderId(), room.getRespondentId(), currentUserId);

        OffsetDateTime readAt = OffsetDateTime.now(ZoneOffset.UTC);
        if (lastReadMessageId != null) {
            ChatMessageEntity message = chatRepository.findMessage(roomId, lastReadMessageId)
                    .orElseThrow(() -> notFound(READ_MARKER_NOT_FOUND_DETAIL));
            if (!isVisibleToUser(toReadModel(message), room, currentUserId)) {
                throw notFound(READ_MARKER_NOT_FOUND_DETAIL);
            }
            readAt = message.getCreatedAt();
        }

        ChatRoomParticipantSettingEntity setting = chatRepository.markRoomRead(roomId, currentUserId, readAt);
        return toSettingsModel(setting);
    }

    private ChatRepository.CurrentUserAccountRecord requireCurrentUser(UUID currentUserId) {
        ChatRepository.CurrentUserAccountRecord user = chatRepository.findCurrentUserAccount(currentUserId)
                .orElseThrow(ChatProfileMissingException::new);
        if (user.deletedAt() != null) {
            throw new ChatAccountDeletedException();
        }
        if (user.deactivatedAt() != null) {
            throw new ChatAccountDeactivatedException();
        }
        return user;
    }

    private void ensureRoomAccess(UUID founderId, UUID respondentId, UUID currentUserId) {
        if (!Objects.equals(founderId, currentUserId) && !Objects.equals(respondentId, currentUserId)) {
            throw forbidden(FORBIDDEN_DETAIL);
        }
    }

    private void ensureRoomMessageable(ChatRoomEntity room) {
        if (!List.of("open", "selected").contains(room.getStatus())) {
            throw conflict(ROOM_CLOSED_DETAIL);
        }

        ChatRepository.ApplicationMessageabilityRecord application = chatRepository.findApplicationMessageability(room.getApplicationId())
                .orElseThrow(() -> conflict(APPLICATION_NOT_MESSAGEABLE_DETAIL));
        if (!List.of("applied", "selected", "completed").contains(application.status())) {
            throw conflict(APPLICATION_NOT_MESSAGEABLE_DETAIL);
        }

        String latestVisibleSessionStatus = chatRepository.findLatestVisibleSessionStatus(room.getApplicationId()).orElse(null);
        if ("no_show".equals(latestVisibleSessionStatus)) {
            throw conflict(SESSION_FINALIZED_DETAIL);
        }
    }

    private ChatMessageReadModel maskHiddenMessage(ChatMessageReadModel message) {
        if (message.hiddenAt() == null) {
            return message;
        }
        return new ChatMessageReadModel(
                message.id(),
                message.roomId(),
                message.senderId(),
                message.messageType(),
                HIDDEN_MESSAGE_BODY,
                message.clientMessageId(),
                message.metadata(),
                message.hiddenAt(),
                message.hiddenReason(),
                message.createdAt()
        );
    }

    private boolean isVisibleToUser(ChatMessageReadModel message, ChatRoomEntity room, UUID currentUserId) {
        Object audience = message.metadata() == null ? null : message.metadata().get("audience");
        if ("founder".equals(audience)) {
            return Objects.equals(room.getFounderId(), currentUserId);
        }
        if ("respondent".equals(audience)) {
            return Objects.equals(room.getRespondentId(), currentUserId);
        }
        return true;
    }

    private ChatMessageReadModel toReadModel(ChatMessageEntity message) {
        return new ChatMessageReadModel(
                message.getId(),
                message.getRoomId(),
                message.getSenderId(),
                message.getMessageType(),
                message.getBody(),
                message.getClientMessageId(),
                message.getMetadata(),
                message.getHiddenAt(),
                message.getHiddenReason(),
                message.getCreatedAt()
        );
    }

    private ChatRoomSettingsModel toSettingsModel(ChatRoomParticipantSettingEntity setting) {
        return new ChatRoomSettingsModel(
                setting.getRoomId(),
                setting.getUserId(),
                setting.isMuted(),
                setting.isHidden(),
                setting.getLastReadAt()
        );
    }

    private String senderName(ChatRoomReadModel room, UUID senderId) {
        if (room.founder() != null && Objects.equals(room.founder().id(), senderId)) {
            return room.founder().name();
        }
        if (room.respondent() != null && Objects.equals(room.respondent().id(), senderId)) {
            return room.respondent().name();
        }
        return null;
    }

    private static OffsetDateTime activityAt(ChatRoomReadModel room) {
        if (room.lastMessageAt() != null) {
            return room.lastMessageAt();
        }
        if (room.updatedAt() != null) {
            return room.updatedAt();
        }
        return room.createdAt();
    }

    private ChatWorkflowReadModel closedWorkflow(String title) {
        return new ChatWorkflowReadModel(
                "closed",
                title,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                false
        );
    }

    private ChatWorkflowReadModel problemWorkflow(
            String title,
            String description,
            SessionReadModels.InterviewSessionReadModel session,
            SessionReadModels.AttendanceRecordReadModel attendance,
            SessionReadModels.RewardConfirmationReadModel reward,
            SessionReadModels.InterviewReviewReadModel myReview,
            boolean counterpartReviewSubmitted
    ) {
        return new ChatWorkflowReadModel(
                "problem_reported",
                title,
                description,
                null,
                null,
                null,
                session,
                attendance,
                reward,
                myReview,
                counterpartReviewSubmitted
        );
    }

    private ChatWorkflowReadModel problemWorkflowWithDangerAction(
            String title,
            String description,
            SessionReadModels.InterviewSessionReadModel session,
            SessionReadModels.AttendanceRecordReadModel attendance,
            SessionReadModels.RewardConfirmationReadModel reward,
            ChatWorkflowActionReadModel dangerAction,
            boolean counterpartReviewSubmitted
    ) {
        return new ChatWorkflowReadModel(
                "problem_reported",
                title,
                description,
                null,
                null,
                dangerAction,
                session,
                attendance,
                reward,
                null,
                counterpartReviewSubmitted
        );
    }

    private ChatWorkflowActionReadModel action(String action, String label) {
        return action(action, label, "default");
    }

    private ChatWorkflowActionReadModel action(String action, String label, String tone) {
        return new ChatWorkflowActionReadModel(action, label, tone);
    }

    private ResponseStatusException notFound(String detail) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, detail);
    }

    private ResponseStatusException forbidden(String detail) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, detail);
    }

    private ResponseStatusException conflict(String detail) {
        return new ResponseStatusException(HttpStatus.CONFLICT, detail);
    }

    private ChatRoomReadModel maskHiddenLastMessage(ChatRoomReadModel room) {
        if (room.lastMessage() == null || room.lastMessage().hiddenAt() == null) {
            return room;
        }
        return new ChatRoomReadModel(
                room.id(),
                room.interviewPostId(),
                room.applicationId(),
                room.founderId(),
                room.respondentId(),
                room.status(),
                room.lastMessageAt(),
                room.createdAt(),
                room.updatedAt(),
                room.application(),
                room.interviewPost(),
                room.founder(),
                room.respondent(),
                maskHiddenMessage(room.lastMessage()),
                room.unreadCount(),
                room.isMuted(),
                room.isHidden(),
                room.lastReadAt()
        );
    }
}
