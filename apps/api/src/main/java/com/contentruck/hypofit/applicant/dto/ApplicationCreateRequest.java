package com.contentruck.hypofit.applicant.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ApplicationCreateRequest(
        @NotNull
        @JsonProperty("interview_post_id")
        UUID interviewPostId,
        Map<String, String> answers,
        @JsonProperty("available_times")
        List<String> availableTimes
) {

    public ApplicationCreateRequest {
        answers = answers == null ? Map.of() : Map.copyOf(new LinkedHashMap<>(answers));
        availableTimes = availableTimes == null ? List.of() : List.copyOf(availableTimes);
    }
}
