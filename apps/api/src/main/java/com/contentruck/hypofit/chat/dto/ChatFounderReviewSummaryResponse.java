package com.contentruck.hypofit.chat.dto;

import com.contentruck.hypofit.chat.service.ChatFounderReviewSummary;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

public record ChatFounderReviewSummaryResponse(
        @JsonProperty("average_rating")
        Double averageRating,
        @JsonProperty("review_count")
        @Schema(defaultValue = "0")
        int reviewCount,
        @JsonProperty("latest_reviewed_at")
        OffsetDateTime latestReviewedAt
) {
    public static ChatFounderReviewSummaryResponse from(ChatFounderReviewSummary summary) {
        if (summary == null) {
            return null;
        }
        return new ChatFounderReviewSummaryResponse(
                summary.averageRating(),
                summary.reviewCount(),
                summary.latestReviewedAt()
        );
    }
}
