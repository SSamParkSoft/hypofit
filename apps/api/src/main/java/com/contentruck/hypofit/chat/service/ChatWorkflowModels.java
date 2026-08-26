package com.contentruck.hypofit.chat.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Read models owned by the chat workflow projection.
 *
 * <p>These mirror only the session data that chat renders so chat does not
 * depend on session's internal service models.</p>
 */
public final class ChatWorkflowModels {

    private ChatWorkflowModels() {
    }

    public record UserSummary(
            UUID id,
            String name,
            String bio,
            String role,
            String profileImageUrl
    ) {
    }

    public record ApplicationReadModel(
            UUID id,
            UUID interviewPostId,
            Map<String, String> answers,
            List<String> availableTimes,
            UUID respondentId,
            String status,
            String rejectionReason,
            UserSummary respondent
    ) {
    }

    public record InterviewSessionReadModel(
            UUID id,
            UUID applicationId,
            OffsetDateTime scheduledAt,
            String meetingType,
            String meetingUrl,
            String place,
            String status,
            ApplicationReadModel application
    ) {
    }

    public record AttendanceRecordReadModel(
            UUID sessionId,
            boolean founderConfirmed,
            boolean respondentConfirmed,
            OffsetDateTime founderConfirmedAt,
            OffsetDateTime respondentConfirmedAt,
            OffsetDateTime completedAt,
            String noShowParty
    ) {
    }

    public record RewardConfirmationReadModel(
            UUID id,
            UUID sessionId,
            UUID applicationId,
            UUID founderId,
            UUID respondentId,
            int amount,
            String status,
            OffsetDateTime founderMarkedPaidAt,
            OffsetDateTime respondentConfirmedAt,
            OffsetDateTime disputedAt,
            String disputeReason,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }

    public record InterviewReviewReadModel(
            UUID id,
            UUID sessionId,
            UUID reviewerId,
            UUID revieweeId,
            String reviewerRole,
            int rating,
            List<String> tags,
            String comment,
            String visibility,
            OffsetDateTime createdAt,
            OffsetDateTime updatedAt
    ) {
    }
}
