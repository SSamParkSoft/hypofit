package com.contentruck.hypofit.block.web;

import com.contentruck.hypofit.block.domain.BlockedUserSummary;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record BlockedUserSummaryResponse(
        UUID id,
        String name,
        String bio,
        String role,
        @JsonProperty("profile_image_url") String profileImageUrl
) {

    static BlockedUserSummaryResponse from(BlockedUserSummary summary) {
        if (summary == null) {
            return null;
        }
        return new BlockedUserSummaryResponse(
                summary.id(),
                summary.name(),
                summary.bio(),
                summary.role(),
                summary.profileImageUrl()
        );
    }
}
