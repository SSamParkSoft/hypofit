package com.contentruck.hypofit.interview.service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface InterviewPostWriteRepository {

    Optional<InterviewPostActorAccount> findUserAccount(UUID userId);

    Optional<InterviewPostWriteModel> findPost(UUID postId);

    default Optional<InterviewPostWriteModel> findPostByClientSubmissionId(UUID founderId, UUID clientSubmissionId) {
        return Optional.empty();
    }

    default void lockClientSubmission(UUID founderId, UUID clientSubmissionId) {
    }

    InterviewPostWriteModel createPost(UUID founderId, InterviewPostCreateCommand command);

    default InterviewPostWriteModel createPost(
            UUID founderId,
            InterviewPostCreateCommand command,
            UUID clientSubmissionId
    ) {
        return createPost(founderId, command);
    }

    InterviewPostWriteModel updatePost(UUID postId, Map<String, Object> changes);

    InterviewPostWriteModel updateStatus(UUID postId, String status);
}
