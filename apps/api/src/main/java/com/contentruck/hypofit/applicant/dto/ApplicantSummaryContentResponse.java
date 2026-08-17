package com.contentruck.hypofit.applicant.dto;

import com.contentruck.hypofit.applicant.service.ApplicantSummaryContentModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(name = "ApplicantSummaryContent")
public record ApplicantSummaryContentResponse(
        String overview,
        @JsonProperty("relevant_experience")
        List<String> relevantExperience,
        String availability,
        @JsonProperty("questions_to_confirm")
        List<String> questionsToConfirm
) {

    static ApplicantSummaryContentResponse from(ApplicantSummaryContentModel model) {
        if (model == null) {
            return null;
        }
        return new ApplicantSummaryContentResponse(
                model.overview(),
                model.relevantExperience(),
                model.availability(),
                model.questionsToConfirm()
        );
    }
}
