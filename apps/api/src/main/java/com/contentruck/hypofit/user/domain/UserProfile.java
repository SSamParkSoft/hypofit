package com.contentruck.hypofit.user.domain;

import java.util.UUID;

public record UserProfile(
        UUID id,
        String email,
        String name,
        String bio,
        String phone,
        String role,
        String profileImagePath,
        String profileImageUrl
) {
}
