package com.contentruck.hypofit.interview.domain;

import java.time.OffsetDateTime;

public record FounderReviewSummary(
        Double averageRating,
        int reviewCount,
        OffsetDateTime latestReviewedAt
) {
}
