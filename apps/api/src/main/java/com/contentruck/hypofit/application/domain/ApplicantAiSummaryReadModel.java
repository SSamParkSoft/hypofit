package com.contentruck.hypofit.application.domain;

import java.time.OffsetDateTime;

public record ApplicantAiSummaryReadModel(
        String status,
        ApplicantSummaryContentModel content,
        OffsetDateTime updatedAt
) {
}
