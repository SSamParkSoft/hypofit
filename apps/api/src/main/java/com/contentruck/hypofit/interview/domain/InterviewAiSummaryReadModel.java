package com.contentruck.hypofit.interview.domain;

import java.time.OffsetDateTime;

public record InterviewAiSummaryReadModel(
        String status,
        InterviewSummaryContentModel content,
        OffsetDateTime updatedAt
) {
}
