package com.contentruck.hypofit.applicant.dto;

import com.contentruck.hypofit.applicant.service.ApplicationRespondentSummary;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record ApplicationRespondentResponse(
        UUID id,
        String name,
        String bio,
        String role,
        @JsonProperty("profile_image_url")
        String profileImageUrl
) {

    public static ApplicationRespondentResponse from(ApplicationRespondentSummary summary) {
        if (summary == null) {
            return null;
        }
        return new ApplicationRespondentResponse(
                summary.id(),
                summary.name(),
                summary.bio(),
                summary.role(),
                summary.profileImageUrl()
        );
    }
}
