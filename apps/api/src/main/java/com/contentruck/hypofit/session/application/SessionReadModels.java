package com.contentruck.hypofit.session.application;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class SessionReadModels {

    private SessionReadModels() {
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

    public record ConfirmAttendanceReadModel(
            InterviewSessionReadModel session,
            AttendanceRecordReadModel attendance
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
