package com.contentruck.hypofit.interview.service;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.List;

public record InterviewSummaryContentModel(
        String overview,
        @JsonAlias("target_fit")
        String targetFit,
        @JsonAlias("key_points")
        List<String> keyPoints
) {
}
