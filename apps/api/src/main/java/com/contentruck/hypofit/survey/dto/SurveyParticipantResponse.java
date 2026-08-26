package com.contentruck.hypofit.survey.dto;

import com.contentruck.hypofit.survey.service.SurveyParticipantSummary;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record SurveyParticipantResponse(
        UUID id,
        String name,
        @JsonProperty("profile_image_url")
        String profileImageUrl,
        @JsonProperty("organization_name")
        String organizationName
) {

    public static SurveyParticipantResponse from(SurveyParticipantSummary participant) {
        return new SurveyParticipantResponse(
                participant.id(),
                participant.name(),
                participant.profileImageUrl(),
                participant.organizationName()
        );
    }
}
