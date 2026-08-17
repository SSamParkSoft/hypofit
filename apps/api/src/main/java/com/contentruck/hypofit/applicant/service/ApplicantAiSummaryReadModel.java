package com.contentruck.hypofit.applicant.service;

import java.time.OffsetDateTime;

public record ApplicantAiSummaryReadModel(
        String status,
        ApplicantSummaryContentModel content,
        OffsetDateTime updatedAt
) {
}
