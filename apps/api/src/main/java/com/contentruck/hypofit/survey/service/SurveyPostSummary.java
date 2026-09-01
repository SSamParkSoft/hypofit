package com.contentruck.hypofit.survey.service;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SurveyPostSummary(
        UUID id,
        UUID founderId,
        String recruitmentType,
        String entryMode,
        String status,
        OffsetDateTime participationDeadlineAt,
        String externalUrl
) {
    public SurveyPostSummary(
            UUID id,
            UUID founderId,
            String recruitmentType,
            String status,
            OffsetDateTime participationDeadlineAt,
            String externalUrl
    ) {
        this(id, founderId, recruitmentType, "direct", status, participationDeadlineAt, externalUrl);
    }
}
