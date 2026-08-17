package com.contentruck.hypofit.interview.service;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

public interface InterviewPostWriteRepository {

    Optional<InterviewPostActorAccount> findUserAccount(UUID userId);

    Optional<InterviewPostWriteModel> findPost(UUID postId);

    InterviewPostWriteModel createPost(UUID founderId, InterviewPostCreateCommand command);

    InterviewPostWriteModel updatePost(UUID postId, Map<String, Object> changes);

    InterviewPostWriteModel updateStatus(UUID postId, String status);
}
