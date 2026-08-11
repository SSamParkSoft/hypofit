package com.contentruck.hypofit.interview.web;

import com.contentruck.hypofit.interview.domain.InterviewAiSummaryReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(name = "InterviewAiSummaryRead")
public record InterviewAiSummaryResponse(
        @Schema(allowableValues = {"pending", "processing", "ready", "failed"})
        String status,
        @Schema(nullable = true)
        InterviewSummaryContentResponse content,
        @JsonProperty("updated_at")
        OffsetDateTime updatedAt
) {

    static InterviewAiSummaryResponse from(InterviewAiSummaryReadModel model) {
        if (model == null) {
            return null;
        }
        return new InterviewAiSummaryResponse(
                model.status(),
                InterviewSummaryContentResponse.from(model.content()),
                model.updatedAt()
        );
    }
}
