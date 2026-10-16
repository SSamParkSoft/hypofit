package com.contentruck.hypofit.chat.service;

import com.contentruck.hypofit.interview.service.PostingCompensation;
import com.contentruck.hypofit.interview.service.PostingCompensations;
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
            ChatWorkflowModels.InterviewSessionReadModel latestSession,
            String recruitmentType,
            List<PostingCompensation> compensations
    ) {
        public ChatRoomWorkflowContextRecord(UUID interviewPostId, ChatWorkflowModels.ApplicationReadModel application,
                ChatWorkflowModels.InterviewSessionReadModel latestSession, String recruitmentType) {
            this(interviewPostId, application, latestSession, recruitmentType, PostingCompensations.legacy(0));
        }

        public ChatRoomWorkflowContextRecord(UUID interviewPostId, ChatWorkflowModels.ApplicationReadModel application,
                ChatWorkflowModels.InterviewSessionReadModel latestSession) {
            this(interviewPostId, application, latestSession, "interview");
        }

        public boolean hasReward() {
            return compensations.stream().anyMatch(compensation -> !"none".equals(compensation.type()));
        }
    }

    record ApplicationMessageabilityRecord(UUID id, String status, String recruitmentType) {
    }
}
