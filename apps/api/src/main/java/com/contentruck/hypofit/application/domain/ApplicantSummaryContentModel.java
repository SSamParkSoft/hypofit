package com.contentruck.hypofit.application.domain;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;

public record ApplicantSummaryContentModel(
        String overview,
        @JsonAlias("relevant_experience")
        List<String> relevantExperience,
        String availability,
        @JsonAlias("questions_to_confirm")
        List<String> questionsToConfirm
) {
}
