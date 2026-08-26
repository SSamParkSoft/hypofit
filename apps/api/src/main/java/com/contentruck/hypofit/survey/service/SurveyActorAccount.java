package com.contentruck.hypofit.survey.service;

import java.util.UUID;

public record SurveyActorAccount(
        UUID id,
        boolean deleted,
        boolean deactivated
) {
}
