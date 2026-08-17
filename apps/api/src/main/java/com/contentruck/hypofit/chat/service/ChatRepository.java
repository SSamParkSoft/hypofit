package com.contentruck.hypofit.chat.service;

import com.contentruck.hypofit.chat.entity.ChatMessageEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomEntity;
import com.contentruck.hypofit.chat.entity.ChatRoomParticipantSettingEntity;
import com.contentruck.hypofit.session.service.SessionReadModels;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatRepository {

    List<ChatRoomReadModel> findRoomsForUser(UUID userId, String role);

    Optional<CurrentUserAccountRecord> findCurrentUserAccount(UUID userId);

    Optional<ChatRoomReadModel> findRoom(UUID roomId, UUID userId);

    Optional<ChatRoomEntity> findRoomEntity(UUID roomId);

    void ensureRoomForApplication(UUID applicationId, UUID interviewPostId, UUID founderId, UUID respondentId);

    void markSelectedForApplication(UUID applicationId, UUID interviewPostId, UUID founderId, UUID respondentId);

    void markRejectedForApplication(
            UUID applicationId,
            UUID interviewPostId,
            UUID founderId,
            UUID respondentId,
            String rejectionReason
    );

    void markCanceledForApplication(UUID applicationId, UUID interviewPostId, UUID founderId, UUID respondentId);

    List<ChatMessageReadModel> findMessages(
            UUID roomId,
            int limit,
            OffsetDateTime before,
            UUID beforeId
    );

    Optional<ChatMessageEntity> findMessage(UUID roomId, UUID messageId);

    Optional<ChatMessageEntity> findMessageByClientMessageId(
            UUID roomId,
            UUID senderId,
            String clientMessageId
    );

    CreateUserMessageResult createUserMessage(
            ChatRoomEntity room,
            UUID senderId,
            String body,
            String clientMessageId
    );

    ChatRoomParticipantSettingEntity updateRoomSettings(
            UUID roomId,
            UUID userId,
            Boolean isMuted,
            Boolean isHidden
    );

    ChatRoomParticipantSettingEntity markRoomRead(
            UUID roomId,
            UUID userId,
            OffsetDateTime readAt
    );

    boolean hasActiveBlockBetween(UUID userAId, UUID userBId);

    Optional<ApplicationMessageabilityRecord> findApplicationMessageability(UUID applicationId);

    Optional<String> findLatestVisibleSessionStatus(UUID applicationId);

    Optional<ChatRoomWorkflowContextRecord> findRoomWorkflowContext(UUID roomId);

    Optional<SessionReadModels.AttendanceRecordReadModel> findAttendanceRecord(UUID sessionId);

    Optional<SessionReadModels.RewardConfirmationReadModel> findRewardConfirmation(UUID sessionId);

    List<SessionReadModels.InterviewReviewReadModel> findReviews(UUID sessionId);

    record ApplicationMessageabilityRecord(
            UUID id,
            String status
    ) {
    }

    record CurrentUserAccountRecord(
            UUID id,
            String role,
            OffsetDateTime deactivatedAt,
            OffsetDateTime deletedAt
    ) {
    }

    record CreateUserMessageResult(ChatMessageEntity message, boolean created) {
    }

    record ChatRoomWorkflowContextRecord(
            UUID interviewPostId,
            SessionReadModels.ApplicationReadModel application,
            SessionReadModels.InterviewSessionReadModel latestSession
    ) {
    }
}
