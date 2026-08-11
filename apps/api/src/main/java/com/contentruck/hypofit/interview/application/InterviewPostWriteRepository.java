package com.contentruck.hypofit.interview.application;

import com.contentruck.hypofit.interview.domain.InterviewPostActorAccount;
import com.contentruck.hypofit.interview.domain.InterviewPostWriteModel;
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
