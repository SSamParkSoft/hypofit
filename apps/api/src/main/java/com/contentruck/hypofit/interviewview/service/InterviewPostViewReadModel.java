package com.contentruck.hypofit.interviewview.service;

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
