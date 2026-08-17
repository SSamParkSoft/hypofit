package com.contentruck.hypofit.interview.dto;

import com.contentruck.hypofit.interview.service.InterviewSummaryContentModel;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(name = "InterviewSummaryContent")
public record InterviewSummaryContentResponse(
        String overview,
        @JsonProperty("target_fit")
        String targetFit,
        @JsonProperty("key_points")
        List<String> keyPoints
) {

    static InterviewSummaryContentResponse from(InterviewSummaryContentModel model) {
        if (model == null) {
            return null;
        }
        return new InterviewSummaryContentResponse(
                model.overview(),
                model.targetFit(),
                model.keyPoints()
        );
    }
}
