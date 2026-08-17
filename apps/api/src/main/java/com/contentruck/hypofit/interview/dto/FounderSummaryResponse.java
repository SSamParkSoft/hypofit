package com.contentruck.hypofit.interview.dto;

import com.contentruck.hypofit.interview.service.FounderSummary;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record FounderSummaryResponse(
        UUID id,
        String name,
        String bio,
        String role,
        @JsonProperty("profile_image_url") String profileImageUrl,
        @JsonProperty("organization_type") String organizationType,
        @JsonProperty("organization_name") String organizationName
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
                founderSummary.profileImageUrl(),
                founderSummary.organizationType(),
                founderSummary.organizationName()
        );
    }
}
