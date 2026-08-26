package com.contentruck.hypofit.chat.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Read-only data required to render the chat workflow state. */
public interface ChatWorkflowQueryRepository {

    Optional<ApplicationMessageabilityRecord> findApplicationMessageability(UUID applicationId);

    Optional<String> findLatestVisibleSessionStatus(UUID applicationId);

    Optional<ChatRoomWorkflowContextRecord> findRoomWorkflowContext(UUID roomId);

    Optional<ChatWorkflowModels.AttendanceRecordReadModel> findAttendanceRecord(UUID sessionId);

    Optional<ChatWorkflowModels.RewardConfirmationReadModel> findRewardConfirmation(UUID sessionId);

    List<ChatWorkflowModels.InterviewReviewReadModel> findReviews(UUID sessionId);

    record ChatRoomWorkflowContextRecord(
            UUID interviewPostId,
            ChatWorkflowModels.ApplicationReadModel application,
            ChatWorkflowModels.InterviewSessionReadModel latestSession
    ) {
    }

    record ApplicationMessageabilityRecord(UUID id, String status) {
    }
}
