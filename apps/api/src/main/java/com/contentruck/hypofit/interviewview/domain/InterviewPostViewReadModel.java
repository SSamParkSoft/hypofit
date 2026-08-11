package com.contentruck.hypofit.interviewview.domain;

import java.time.OffsetDateTime;
import java.util.UUID;

public record InterviewPostViewReadModel(
        UUID id,
        UUID userId,
        UUID interviewPostId,
        OffsetDateTime firstViewedAt,
        OffsetDateTime lastViewedAt,
        int viewCount,
        InterviewPostViewSource source
) {
}
