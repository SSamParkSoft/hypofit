package com.contentruck.hypofit.survey.service;

import java.util.UUID;

public record SurveyParticipantSummary(
        UUID id,
        String name,
        String profileImageUrl,
        String organizationName
) {
}
