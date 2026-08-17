package com.contentruck.hypofit.interview.service;

import java.time.OffsetDateTime;

public record FounderReviewSummary(
        Double averageRating,
        int reviewCount,
        OffsetDateTime latestReviewedAt
) {
}
