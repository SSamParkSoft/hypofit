package com.contentruck.hypofit.session.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public final class SessionContexts {

    private SessionContexts() {
    }

    public record ActiveUser(
            UUID id,
            String role
    ) {
    }

    public record StoredUser(
            UUID id,
            String name,
            String bio,
            String role,
            String profileImageUrl,
            OffsetDateTime deletedAt,
            OffsetDateTime deactivatedAt
    ) {
    }

    public record ApplicationRecord(
            UUID id,
            UUID interviewPostId,
            UUID respondentId,
            Map<String, String> answers,
            List<String> availableTimes,
            String status,
            String moderationStatus,
            String rejectionReason
    ) {
    }

    public record InterviewPostRecord(
            UUID id,
            UUID founderId,
            String title,
            int rewardAmount,
            String recruitmentType
    ) {
    }

    public record InterviewSessionRecord(
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

    public record AttendanceRecord(
            UUID id,
            UUID sessionId,
            boolean founderConfirmed,
            boolean respondentConfirmed,
            OffsetDateTime founderConfirmedAt,
            OffsetDateTime respondentConfirmedAt,
            UUID completedBy,
            String completionSource,
            String noShowParty,
            OffsetDateTime completedAt
    ) {
    }

    public record RewardConfirmationRecord(
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

    public record InterviewReviewRecord(
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

    public record ApplicationContext(
            ApplicationRecord application,
            InterviewPostRecord post
    ) {
    }

    public record SessionContext(
            InterviewSessionRecord session,
            ApplicationRecord application,
            InterviewPostRecord post
    ) {
    }
}
