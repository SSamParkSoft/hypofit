package com.contentruck.hypofit.chat.domain;

import java.time.OffsetDateTime;

public record ChatFounderReviewSummary(
        Double averageRating,
        int reviewCount,
        OffsetDateTime latestReviewedAt
) {
}
