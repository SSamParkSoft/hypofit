package com.contentruck.hypofit.survey.service;

public record SurveyParticipationView(
        SurveyParticipationReadModel participation,
        SurveyParticipantSummary participant
) {
}
