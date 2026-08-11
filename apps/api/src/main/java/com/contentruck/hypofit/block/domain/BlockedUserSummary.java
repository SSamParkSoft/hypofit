package com.contentruck.hypofit.block.domain;

import java.util.UUID;

public record BlockedUserSummary(
        UUID id,
        String name,
        String bio,
        String role,
        String profileImageUrl
) {
}
