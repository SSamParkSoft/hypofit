package com.contentruck.hypofit.interviewview.service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface InterviewPostViewRepository {

    Optional<ViewerAccountRecord> findViewerAccount(UUID userId);

    List<InterviewPostViewReadModel> listViewsForUser(UUID userId);

    Optional<InterviewPostViewReadModel> upsertView(
            UUID userId,
            UUID postId,
            InterviewPostViewSource source,
            OffsetDateTime viewedAt
    );

    record ViewerAccountRecord(
            UUID id,
            OffsetDateTime deactivatedAt,
            OffsetDateTime deletedAt
    ) {
    }
}
