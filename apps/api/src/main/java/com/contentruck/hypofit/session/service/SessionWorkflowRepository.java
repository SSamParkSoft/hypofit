package com.contentruck.hypofit.session.service;

import com.contentruck.hypofit.session.service.SessionContexts.ApplicationContext;
import com.contentruck.hypofit.session.service.SessionContexts.ApplicationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.AttendanceRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewReviewRecord;
import com.contentruck.hypofit.session.service.SessionContexts.InterviewSessionRecord;
import com.contentruck.hypofit.session.service.SessionContexts.RewardConfirmationRecord;
import com.contentruck.hypofit.session.service.SessionContexts.SessionContext;
import com.contentruck.hypofit.session.service.SessionContexts.StoredUser;
import com.contentruck.hypofit.session.service.SessionReadModels.UserSummary;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface SessionWorkflowRepository {

    record SessionListRow(
            InterviewSessionRecord session,
            ApplicationRecord application,
            UserSummary respondent
    ) {
    }

    Optional<StoredUser> findUserById(UUID userId);

    List<SessionListRow> listSessionRows(UUID userId);

    Optional<ApplicationContext> findApplicationContext(UUID applicationId);

    Optional<ApplicationContext> lockApplicationContext(UUID applicationId);

    boolean hasScheduledVisibleSessionForApplication(UUID applicationId);

    Optional<SessionContext> findSessionContext(UUID sessionId);

    Optional<SessionContext> lockSessionContext(UUID sessionId);

    Optional<UUID> findChatRoomIdByApplicationId(UUID applicationId);

    Optional<AttendanceRecord> findAttendanceRecord(UUID sessionId);

    Optional<RewardConfirmationRecord> findRewardConfirmation(UUID sessionId);

    Optional<InterviewReviewRecord> findReview(UUID sessionId, UUID reviewerId);

    List<InterviewReviewRecord> listReviews(UUID sessionId);

    InterviewSessionRecord saveSession(InterviewSessionRecord session);

    AttendanceRecord saveAttendanceRecord(AttendanceRecord attendance);

    RewardConfirmationRecord saveRewardConfirmation(RewardConfirmationRecord rewardConfirmation);

    InterviewReviewRecord saveReview(InterviewReviewRecord review);

    boolean updateScheduledSessionStatus(UUID sessionId, String nextStatus);

    boolean updateApplicationStatusIfCurrent(UUID applicationId, String nextStatus, Set<String> allowedStatuses);
}
