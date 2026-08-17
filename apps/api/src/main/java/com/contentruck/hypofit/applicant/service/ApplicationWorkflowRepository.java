package com.contentruck.hypofit.applicant.service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public interface ApplicationWorkflowRepository {

    Optional<ApplicationUserAccount> findUserAccount(UUID userId);

    List<ApplicationReadModel> listVisibleApplicationsForUser(UUID userId);

    Optional<ApplicationReadModel> findVisibleApplicationDetail(UUID applicationId, UUID viewerId);

    Optional<InterviewPostOwnership> findInterviewPost(UUID interviewPostId);

    boolean hasActiveBlockBetween(UUID userAId, UUID userBId);

    boolean existsApplicationForPostAndRespondent(UUID interviewPostId, UUID respondentId);

    ApplicationReadModel createApplication(
            UUID interviewPostId,
            UUID respondentId,
            Map<String, String> answers,
            List<String> availableTimes
    );

    Optional<ApplicationWorkflowContext> findVisibleApplicationContext(UUID applicationId);

    Optional<ApplicationWorkflowContext> lockVisibleApplicationContext(UUID applicationId);

    boolean hasScheduledVisibleSession(UUID applicationId);

    Optional<ApplicationReadModel> updateStatusIfCurrent(
            UUID applicationId,
            String nextStatus,
            Set<String> allowedStatuses,
            String rejectionReason
    );

}
