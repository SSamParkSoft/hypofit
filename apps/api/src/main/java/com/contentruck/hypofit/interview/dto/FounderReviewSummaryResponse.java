package com.contentruck.hypofit.interview.dto;

import com.contentruck.hypofit.interview.service.FounderReviewSummary;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

public record FounderReviewSummaryResponse(
        @JsonProperty("average_rating")
        Double averageRating,
        @JsonProperty("review_count")
        @Schema(defaultValue = "0")
        int reviewCount,
        @JsonProperty("latest_reviewed_at")
        OffsetDateTime latestReviewedAt
) {

    public static FounderReviewSummaryResponse from(FounderReviewSummary summary) {
        if (summary == null) {
            return null;
        }
        return new FounderReviewSummaryResponse(
                summary.averageRating(),
                summary.reviewCount(),
                summary.latestReviewedAt()
        );
    }
}
