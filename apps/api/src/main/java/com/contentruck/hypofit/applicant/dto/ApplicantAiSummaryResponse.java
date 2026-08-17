package com.contentruck.hypofit.applicant.dto;

import com.contentruck.hypofit.applicant.service.ApplicantAiSummaryReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.OffsetDateTime;

@Schema(name = "ApplicantAiSummaryRead")
public record ApplicantAiSummaryResponse(
        @Schema(allowableValues = {"pending", "processing", "ready", "failed"})
        String status,
        @Schema(nullable = true)
        ApplicantSummaryContentResponse content,
        @JsonProperty("updated_at")
        OffsetDateTime updatedAt
) {

    static ApplicantAiSummaryResponse from(ApplicantAiSummaryReadModel model) {
        if (model == null) {
            return null;
        }
        return new ApplicantAiSummaryResponse(
                model.status(),
                ApplicantSummaryContentResponse.from(model.content()),
                model.updatedAt()
        );
    }
}
