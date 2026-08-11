package com.contentruck.hypofit.interview.web;

import com.contentruck.hypofit.interview.domain.FounderSummary;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record FounderSummaryResponse(
        UUID id,
        String name,
        String bio,
        String role,
        @JsonProperty("profile_image_url") String profileImageUrl
) {

    public static FounderSummaryResponse from(FounderSummary founderSummary) {
        if (founderSummary == null) {
            return null;
        }
        return new FounderSummaryResponse(
                founderSummary.id(),
                founderSummary.name(),
                founderSummary.bio(),
                founderSummary.role(),
                founderSummary.profileImageUrl()
        );
    }
}
