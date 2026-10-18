package com.contentruck.hypofit.applicant.dto;

import com.contentruck.hypofit.applicant.service.ApplicationReadModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.OffsetDateTime;

@Schema(name = "ApplicationResponse")
public record ApplicationResponse(
        UUID id,
        @JsonProperty("interview_post_id")
        UUID interviewPostId,
        Map<String, String> answers,
        @JsonProperty("available_times")
        List<String> availableTimes,
        @JsonProperty("respondent_id")
        UUID respondentId,
        String status,
        @JsonProperty("rejection_reason")
        String rejectionReason,
        ApplicationRespondentResponse respondent,
        @JsonProperty("ai_summary")
        ApplicantAiSummaryResponse aiSummary,
        @JsonProperty("sharing_withdrawn_at")
        OffsetDateTime sharingWithdrawnAt
) {

    public static ApplicationResponse from(ApplicationReadModel model) {
        return new ApplicationResponse(
                model.id(),
                model.interviewPostId(),
                model.answers(),
                model.availableTimes(),
                model.respondentId(),
                model.status(),
                model.rejectionReason(),
                ApplicationRespondentResponse.from(model.respondent()),
                ApplicantAiSummaryResponse.from(model.aiSummary()),
                model.sharingWithdrawnAt()
        );
    }
}
