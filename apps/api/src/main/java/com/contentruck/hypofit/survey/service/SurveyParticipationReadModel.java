package com.contentruck.hypofit.survey.service;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SurveyParticipationReadModel(
        UUID id,
        UUID postId,
        UUID participantId,
        String status,
        OffsetDateTime openedAt,
        OffsetDateTime submittedAt,
        OffsetDateTime confirmedAt,
        OffsetDateTime withdrawnAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
