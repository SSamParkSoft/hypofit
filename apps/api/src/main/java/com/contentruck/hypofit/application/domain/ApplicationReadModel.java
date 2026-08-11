package com.contentruck.hypofit.application.domain;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ApplicationReadModel(
        UUID id,
        UUID interviewPostId,
        Map<String, String> answers,
        List<String> availableTimes,
        UUID respondentId,
        String status,
        String rejectionReason,
        ApplicationRespondentSummary respondent,
        ApplicantAiSummaryReadModel aiSummary
) {
    public ApplicationReadModel(
            UUID id,
            UUID interviewPostId,
            Map<String, String> answers,
            List<String> availableTimes,
            UUID respondentId,
            String status,
            String rejectionReason,
            ApplicationRespondentSummary respondent
    ) {
        this(
                id,
                interviewPostId,
                answers,
                availableTimes,
                respondentId,
                status,
                rejectionReason,
                respondent,
                null
        );
    }
}
