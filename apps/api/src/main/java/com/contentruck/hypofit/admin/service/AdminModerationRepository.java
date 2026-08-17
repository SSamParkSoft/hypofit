package com.contentruck.hypofit.admin.service;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface AdminModerationRepository {

    ModerationActionRecord createModerationAction(
            UUID actorUserId,
            String targetType,
            UUID targetId,
            String action,
            String reason,
            UUID sourceTicketId,
            Map<String, Object> metadata
    );

    Optional<UserTargetRecord> findUser(UUID userId);

    void updateUserDeactivated(UUID userId, OffsetDateTime deactivatedAt);

    Optional<ChatMessageTargetRecord> findChatMessage(UUID messageId);

    void updateChatMessageHidden(UUID messageId, OffsetDateTime hiddenAt, String hiddenReason);

    Optional<InterviewPostTargetRecord> findInterviewPost(UUID postId);

    void updateInterviewPostStatus(UUID postId, String status);

    Optional<ApplicationTargetRecord> findApplication(UUID applicationId);

    void updateApplicationModerationStatus(UUID applicationId, String moderationStatus);

    Optional<InterviewSessionTargetRecord> findInterviewSession(UUID sessionId);

    void updateInterviewSessionModerationStatus(UUID sessionId, String moderationStatus);

    void recordAuditEvent(
            UUID actorUserId,
            String actorType,
            String eventType,
            String targetType,
            UUID targetId,
            Map<String, Object> before,
            Map<String, Object> after,
            String reason,
            Map<String, Object> metadata
    );

    record ModerationActionRecord(
            UUID id,
            UUID actorUserId,
            String targetType,
            UUID targetId,
            String action,
            String reason,
            UUID sourceTicketId,
            Map<String, Object> metadata,
            OffsetDateTime createdAt
    ) {
    }

    record UserTargetRecord(
            UUID id,
            OffsetDateTime deactivatedAt,
            OffsetDateTime deletedAt
    ) {
    }

    record ChatMessageTargetRecord(
            UUID id,
            OffsetDateTime hiddenAt,
            String hiddenReason
    ) {
    }

    record InterviewPostTargetRecord(
            UUID id,
            String status
    ) {
    }

    record ApplicationTargetRecord(
            UUID id,
            String status,
            String moderationStatus
    ) {
    }

    record InterviewSessionTargetRecord(
            UUID id,
            String status,
            String moderationStatus
    ) {
    }
}
