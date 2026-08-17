package com.contentruck.hypofit.interview.service;

import java.time.OffsetDateTime;

public record InterviewAiSummaryReadModel(
        String status,
        InterviewSummaryContentModel content,
        OffsetDateTime updatedAt
) {
}
