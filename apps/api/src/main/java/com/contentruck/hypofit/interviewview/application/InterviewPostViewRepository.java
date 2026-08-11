package com.contentruck.hypofit.interviewview.application;

import com.contentruck.hypofit.interviewview.domain.InterviewPostViewReadModel;
import com.contentruck.hypofit.interviewview.domain.InterviewPostViewSource;
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
