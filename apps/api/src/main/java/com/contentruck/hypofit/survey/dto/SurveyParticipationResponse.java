package com.contentruck.hypofit.survey.dto;

import com.contentruck.hypofit.survey.service.SurveyParticipationView;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.UUID;

public record SurveyParticipationResponse(
        UUID id,
        @JsonProperty("post_id")
        UUID postId,
        SurveyParticipantResponse participant,
        String status,
        @JsonProperty("opened_at")
        OffsetDateTime openedAt,
        @JsonProperty("submitted_at")
        OffsetDateTime submittedAt,
        @JsonProperty("confirmed_at")
        OffsetDateTime confirmedAt,
        @JsonProperty("withdrawn_at")
        OffsetDateTime withdrawnAt,
        @JsonProperty("created_at")
        OffsetDateTime createdAt,
        @JsonProperty("updated_at")
        OffsetDateTime updatedAt
) {

    public static SurveyParticipationResponse from(SurveyParticipationView view) {
        return new SurveyParticipationResponse(
                view.participation().id(),
                view.participation().postId(),
                SurveyParticipantResponse.from(view.participant()),
                view.participation().status(),
                view.participation().openedAt(),
                view.participation().submittedAt(),
                view.participation().confirmedAt(),
                view.participation().withdrawnAt(),
                view.participation().createdAt(),
                view.participation().updatedAt()
        );
    }
}
