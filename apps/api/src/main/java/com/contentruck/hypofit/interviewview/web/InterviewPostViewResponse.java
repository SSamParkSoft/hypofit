package com.contentruck.hypofit.interviewview.web;

import com.contentruck.hypofit.interviewview.domain.InterviewPostViewReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;
import java.util.UUID;

public record InterviewPostViewResponse(
        @JsonProperty("id")
        UUID id,
        @JsonProperty("user_id")
        UUID userId,
        @JsonProperty("interview_post_id")
        UUID interviewPostId,
        @JsonProperty("first_viewed_at")
        OffsetDateTime firstViewedAt,
        @JsonProperty("last_viewed_at")
        OffsetDateTime lastViewedAt,
        @JsonProperty("view_count")
        int viewCount,
        @JsonProperty("source")
        @Schema(allowableValues = {"home", "interviews", "map", "detail", "chat"})
        String source
) {
    public static InterviewPostViewResponse from(InterviewPostViewReadModel model) {
        return new InterviewPostViewResponse(
                model.id(),
                model.userId(),
                model.interviewPostId(),
                model.firstViewedAt(),
                model.lastViewedAt(),
                model.viewCount(),
                model.source().value()
        );
    }
}
