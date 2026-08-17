package com.contentruck.hypofit.chat.dto;

import com.contentruck.hypofit.chat.service.ChatUserSummary;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record ChatUserSummaryResponse(
        UUID id,
        String name,
        String bio,
        String role,
        @JsonProperty("profile_image_url")
        String profileImageUrl
) {
    public static ChatUserSummaryResponse from(ChatUserSummary summary) {
        if (summary == null) {
            return null;
        }
        return new ChatUserSummaryResponse(
                summary.id(),
                summary.name(),
                summary.bio(),
                summary.role(),
                summary.profileImageUrl()
        );
    }
}
