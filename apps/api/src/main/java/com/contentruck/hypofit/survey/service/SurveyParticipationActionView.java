package com.contentruck.hypofit.survey.service;

public record SurveyParticipationActionView(
        SurveyParticipationReadModel participation,
        SurveyParticipantSummary participant,
        String externalUrl
) {
}
