package com.contentruck.hypofit.survey.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SurveyParticipationConfirmRequest(
        @JsonProperty("participant_id")
        @NotNull
        UUID participantId
) {
}
