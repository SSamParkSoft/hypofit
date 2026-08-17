package com.contentruck.hypofit.chat.service;

import java.time.OffsetDateTime;

public record ChatFounderReviewSummary(
        Double averageRating,
        int reviewCount,
        OffsetDateTime latestReviewedAt
) {
}
