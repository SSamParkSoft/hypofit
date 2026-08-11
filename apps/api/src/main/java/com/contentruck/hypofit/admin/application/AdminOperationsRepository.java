package com.contentruck.hypofit.admin.application;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface AdminOperationsRepository {

    List<SupportStatusCount> summarizeSupportStatuses();

    long countOpenAccountDeletionRequests();

    boolean isDatabaseAvailable();

    Optional<UserPreviewRecord> findUserPreview(UUID userId);

    Optional<InterviewPostPreviewRecord> findInterviewPostPreview(UUID postId);

    Optional<ApplicationPreviewRecord> findApplicationPreview(UUID applicationId);

    Optional<ChatRoomPreviewRecord> findChatRoomPreview(UUID roomId);

    Optional<ChatMessagePreviewRecord> findChatMessagePreview(UUID messageId);

    Optional<SessionPreviewRecord> findSessionPreview(UUID sessionId);

    Optional<UserPreviewRecord> findUserByEmail(String normalizedEmail);

    record SupportStatusCount(
            String kind,
            String status,
            long count
    ) {
    }

    record UserPreviewRecord(
            UUID id,
            String email,
            String name,
            String role,
            String phone,
            OffsetDateTime deletedAt,
            OffsetDateTime deactivatedAt
    ) {
    }

    record InterviewPostPreviewRecord(
            UUID id,
            UUID founderId,
            String title,
            String serviceSummary,
            String status,
            String interviewMode,
            int rewardAmount,
            String locationPlaceName,
            String locationAddress,
            String locationText
    ) {
    }

    record ApplicationPreviewRecord(
            UUID id,
            UUID interviewPostId,
            UUID respondentId,
            List<String> availableTimes,
            String status,
            String moderationStatus,
            Map<String, String> answers
    ) {
    }

    record ChatRoomPreviewRecord(
            UUID id,
            UUID interviewPostId,
            UUID applicationId,
            UUID founderId,
            UUID respondentId,
            String status
    ) {
    }

    record ChatMessagePreviewRecord(
            UUID id,
            UUID roomId,
            UUID senderId,
            String messageType,
            String body,
            OffsetDateTime hiddenAt,
            String hiddenReason
    ) {
    }

    record SessionPreviewRecord(
            UUID id,
            UUID applicationId,
            OffsetDateTime scheduledAt,
            String meetingType,
            String meetingUrl,
            String place,
            String status,
            String moderationStatus
    ) {
    }
}
