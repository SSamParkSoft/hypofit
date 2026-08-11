package com.contentruck.hypofit.interview.application;

import com.contentruck.hypofit.interview.domain.InterviewPostReadModel;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InterviewPostReadRepository {
    List<InterviewPostReadModel> findPosts(InterviewPostListCriteria criteria);

    Optional<InterviewPostReadModel> findVisiblePost(
            UUID postId,
            UUID viewerId,
            boolean isAdmin
    );
}
