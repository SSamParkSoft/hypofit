package com.contentruck.hypofit.user.web;

import com.contentruck.hypofit.user.domain.UserProfile;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record UserMeResponse(
        UUID id,
        String email,
        String name,
        String bio,
        String phone,
        String role,
        @JsonProperty("profile_image_path") String profileImagePath,
        @JsonProperty("profile_image_url") String profileImageUrl
) {

    public static UserMeResponse from(UserProfile profile) {
        return new UserMeResponse(
                profile.id(),
                profile.email(),
                profile.name(),
                profile.bio(),
                profile.phone(),
                profile.role(),
                profile.profileImagePath(),
                profile.profileImageUrl()
        );
    }
}
