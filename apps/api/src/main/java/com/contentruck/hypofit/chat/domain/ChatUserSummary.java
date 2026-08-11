package com.contentruck.hypofit.chat.domain;

import java.util.UUID;

public record ChatUserSummary(
        UUID id,
        String name,
        String bio,
        String role,
        String profileImageUrl
) {
}
