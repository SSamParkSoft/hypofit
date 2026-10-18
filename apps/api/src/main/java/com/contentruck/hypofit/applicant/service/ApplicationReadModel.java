package com.contentruck.hypofit.applicant.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.time.OffsetDateTime;

public record ApplicationReadModel(
        UUID id,
        UUID interviewPostId,
        Map<String, String> answers,
        List<String> availableTimes,
        UUID respondentId,
        String status,
        String rejectionReason,
        ApplicationRespondentSummary respondent,
        ApplicantAiSummaryReadModel aiSummary,
        OffsetDateTime sharingWithdrawnAt
) {
    public ApplicationReadModel(UUID id, UUID interviewPostId, Map<String, String> answers,
                                List<String> availableTimes, UUID respondentId, String status,
                                String rejectionReason, ApplicationRespondentSummary respondent,
                                ApplicantAiSummaryReadModel aiSummary) {
        this(id, interviewPostId, answers, availableTimes, respondentId, status, rejectionReason,
                respondent, aiSummary, null);
    }

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
